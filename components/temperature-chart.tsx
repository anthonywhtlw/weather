"use client";

import { weatherMood, type Mood } from "@/lib/weather";

type Reading = { timestamp: string; temperature: number };

type Theme = {
  line: string;
  lineEnd: string;
  glow: string;
  backdrop: string;
  label: string;
};

const THEMES: Record<Mood, Theme> = {
  hot: {
    line: "#fca5a5",
    lineEnd: "#ef4444",
    glow: "rgba(248, 113, 113, 0.85)",
    backdrop:
      "radial-gradient(ellipse 90% 80% at 50% 0%, rgba(220, 38, 38, 0.22), transparent 70%)",
    label: "running hot",
  },
  cold: {
    line: "#bae6fd",
    lineEnd: "#22d3ee",
    glow: "rgba(56, 189, 248, 0.85)",
    backdrop:
      "radial-gradient(ellipse 90% 80% at 50% 0%, rgba(8, 145, 178, 0.28), transparent 70%)",
    label: "running cold",
  },
  mild: {
    line: "#f8fafc",
    lineEnd: "#cbd5e1",
    glow: "rgba(255, 255, 255, 0.55)",
    backdrop: "radial-gradient(ellipse 90% 80% at 50% 0%, rgba(255, 255, 255, 0.06), transparent 70%)",
    label: "steady",
  },
};

const toF = (celsius: number): number => celsius * 1.8 + 32;
const toC = (fahrenheit: number): number => (fahrenheit - 32) / 1.8;

/** A tick spacing that lands on round Fahrenheit numbers: 1, 2, 5, 10, … */
function niceStep(span: number, targetTicks = 4): number {
  const rough = span / targetTicks;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const normalised = rough / magnitude;

  if (normalised <= 1) return magnitude;
  if (normalised <= 2) return 2 * magnitude;
  if (normalised <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

/**
 * Catmull-Rom through every point, emitted as cubic Béziers. Straight segments
 * between samples look like a spreadsheet; these read like a heartbeat.
 */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";

  let path = `M${points[0].x.toFixed(1)},${points[0].y.toFixed(1)}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }

  return path;
}

export default function TemperatureChart({ readings }: { readings: Reading[] }) {
  const points = [...readings].reverse();

  if (points.length < 2) {
    return (
      <p className="mt-6 text-sm text-slate-400">
        The chart draws itself once a couple of readings have arrived.
      </p>
    );
  }

  const mood = weatherMood(points[points.length - 1].temperature);
  const theme = THEMES[mood];

  const W = 640;
  const H = 190;
  const PAD_LEFT = 44;
  const PAD_RIGHT = 16;
  const PAD_Y = 18;

  const temps = points.map((point) => point.temperature);
  const rawMin = Math.min(...temps);
  const rawMax = Math.max(...temps);

  // A perfectly flat stretch would divide by zero; give it a degree to breathe.
  const flat = rawMax - rawMin < 1e-9;
  const minC = flat ? rawMin - 0.5 : rawMin;
  const maxC = flat ? rawMax + 0.5 : rawMax;
  const spanC = maxC - minC;

  const yFor = (celsius: number) =>
    PAD_Y + (1 - (celsius - minC) / spanC) * (H - PAD_Y * 2);

  // A three-sample average used only for drawing. The sensor reports 0.1 °C
  // steps, so the raw series is a staircase; the eye wants a line.
  const softened = points.map((_, index) => {
    const from = Math.max(0, index - 1);
    const to = Math.min(points.length, index + 2);

    let total = 0;
    for (let i = from; i < to; i += 1) total += points[i].temperature;

    return total / (to - from);
  });

  const plotted = softened.map((value, index) => ({
    x: PAD_LEFT + (index * (W - PAD_LEFT - PAD_RIGHT)) / (points.length - 1),
    y: yFor(value),
  }));

  const line = smoothPath(plotted);
  const area = `${line} L${plotted[plotted.length - 1].x.toFixed(1)},${H - PAD_Y} L${plotted[0].x.toFixed(1)},${H - PAD_Y} Z`;
  const head = plotted[plotted.length - 1];

  // Fahrenheit gridlines, positioned with the Celsius scale they sit on.
  const fMin = toF(minC);
  const fMax = toF(maxC);
  const step = niceStep(Math.max(fMax - fMin, 0.5));
  const decimals = step < 1 ? 1 : 0;

  const ticks: { y: number; label: string }[] = [];
  for (let f = Math.ceil(fMin / step) * step; f <= fMax + 1e-9; f += step) {
    ticks.push({ y: yFor(toC(f)), label: f.toFixed(decimals) });
  }

  const min = Math.min(...temps);
  const max = Math.max(...temps);

  return (
    <div
      className="mt-4 overflow-hidden rounded-2xl bg-black/60 p-1"
      style={{ backgroundImage: theme.backdrop }}
    >
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="h-48 w-full"
        role="img"
        aria-label={`Temperature history in Fahrenheit, ${theme.label}, ${toF(min).toFixed(1)} to ${toF(max).toFixed(1)} degrees`}
      >
        <defs>
          <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={theme.line} stopOpacity="0.45" />
            <stop offset="100%" stopColor={theme.line} stopOpacity="0" />
          </linearGradient>
          <linearGradient id="chartStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={theme.line} />
            <stop offset="100%" stopColor={theme.lineEnd} />
          </linearGradient>
          <filter id="chartGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor={theme.glow} floodOpacity="0.9" />
          </filter>
          <clipPath id="chartClip">
            <rect x="0" y="0" width={W} height={H} />
          </clipPath>
        </defs>

        {ticks.map((tick) => (
          <g key={tick.label}>
            <line
              x1={PAD_LEFT}
              x2={W - PAD_RIGHT}
              y1={tick.y}
              y2={tick.y}
              stroke="rgba(255,255,255,0.10)"
              strokeWidth="1"
              strokeDasharray="2 7"
            />
            <text
              x={PAD_LEFT - 10}
              y={tick.y + 3.5}
              textAnchor="end"
              fontSize="10.5"
              fill="rgba(255,255,255,0.48)"
            >
              {tick.label}
            </text>
          </g>
        ))}

        <text
          x={PAD_LEFT - 10}
          y={PAD_Y - 6}
          textAnchor="end"
          fontSize="9.5"
          fill="rgba(255,255,255,0.32)"
        >
          °F
        </text>

        <g clipPath="url(#chartClip)">
          <path d={area} fill="url(#chartFill)" opacity="0.55" />
          <path
            d={line}
            fill="none"
            stroke="url(#chartStroke)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#chartGlow)"
          />
        </g>

        <circle cx={head.x} cy={head.y} r="9" fill={theme.lineEnd} opacity="0.18" />
        <circle
          cx={head.x}
          cy={head.y}
          r="4"
          fill="#ffffff"
          stroke={theme.lineEnd}
          strokeWidth="2"
          filter="url(#chartGlow)"
        />
      </svg>
    </div>
  );
}
