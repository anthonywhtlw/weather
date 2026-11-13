"use client";

const WIDTH = 16;

type Art = {
  rows: string[];
  colors: Record<string, string>;
  glow: string;
  label: string;
  note: string;
};

const FIRE: Art = {
  rows: [
    "................",
    "................",
    ".......w........",
    "......yy........",
    ".....yyy........",
    "....yyy.........",
    "...yyy....y.....",
    "...yyy...yy.....",
    "..oyyy..yyy.....",
    "..oyyyy.yyy.....",
    "..ooyyyyyyoo....",
    ".rooooyyyoooor..",
    ".rroooooooorrr..",
    "..rroooooorrr...",
    "...rrrrrrrrr....",
    "................",
  ],
  colors: { r: "#7f1d1d", o: "#dc2626", y: "#f97316", w: "#fdba74" },
  glow: "rgba(249, 115, 22, 0.35)",
  label: "Hot",
  note: "Get the fan out.",
};

const ICE: Art = {
  rows: [
    "................",
    ".......c........",
    "..c....c....c...",
    "...c...c...c....",
    "....c..c..c.....",
    ".....c.c.c......",
    "......ccc.......",
    "..cccccccccccc..",
    "......ccc.......",
    ".....c.c.c......",
    "....c..c..c.....",
    "...c...c...c....",
    "..c....c....c...",
    ".......c........",
    "................",
    "................",
  ],
  colors: { c: "#a5f3fc", b: "#22d3ee", d: "#0891b2" },
  glow: "rgba(34, 211, 238, 0.30)",
  label: "Cold",
  note: "Sleeves on.",
};

const MILD: Art = {
  rows: [
    "................",
    "................",
    "................",
    ".......mm.......",
    ".......mm.......",
    ".......mm.......",
    ".......mm.......",
    ".......mm.......",
    ".......mm.......",
    "......mmmm......",
    ".....mmmmmm.....",
    ".....mmmmmm.....",
    "......mmmm......",
    "................",
    "................",
    "................",
  ],
  colors: { m: "#fb923c" },
  glow: "rgba(251, 146, 60, 0.28)",
  label: "Mild",
  note: "Room is comfortable.",
};

/** Hot above 25 °C, cold below 18 °C, mild in between. */
function artFor(celsius: number): Art {
  if (celsius >= 25) return FIRE;
  if (celsius <= 18) return ICE;
  return MILD;
}

export default function PixelDisplay({ temperatureC }: { temperatureC: number }) {
  const art = artFor(temperatureC);
  const cells = art.rows.slice(0, 16).map((row) => row.padEnd(WIDTH, ".").slice(0, WIDTH));

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3">
      <div
        className="rounded-xl bg-black/55 p-2.5 ring-1 ring-white/10"
        style={{ boxShadow: `0 0 48px ${art.glow}, inset 0 0 22px rgba(0,0,0,0.65)` }}
        role="img"
        aria-label={`${art.label}: ${temperatureC.toFixed(1)} degrees Celsius`}
      >
        <div
          className="grid gap-[2px]"
          style={{ gridTemplateColumns: `repeat(${WIDTH}, minmax(0, 1fr))` }}
        >
          {cells.flatMap((row, y) =>
            row.split("").map((char, x) => {
              const color = art.colors[char];
              return (
                <span
                  key={`${x}-${y}`}
                  className={`aspect-square rounded-[1px] ${color ? "pixel-on" : ""}`}
                  style={{
                    background: color ?? "transparent",
                    animationDelay: `${(((x * 3 + y * 5) % 9) * 0.11).toFixed(2)}s`,
                  }}
                />
              );
            }),
          )}
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold tracking-tight text-white">{art.label}</p>
        <p className="tabular text-xs text-slate-400">
          {temperatureC.toFixed(1)} °C · {art.note}
        </p>
      </div>
    </div>
  );
}
