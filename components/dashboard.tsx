"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { describeHumidity, toFahrenheit, weatherMood, type Mood } from "@/lib/weather";
import PixelDisplay from "@/components/pixel-display";
import TemperatureChart from "@/components/temperature-chart";

type Reading = { timestamp: string; temperature: number; humidity: number | null };
type History = { readings: Reading[]; threshold_c: number };
type ForecastDay = { date: string; max: number; min: number };

const POLL_MS = 5000;
const FORECAST_MS = 30 * 60 * 1000;
const TZ = "America/New_York";
const STATION = "medford-01";

const CARD =
  "relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl";
const BIG = "tabular mt-5 flex items-start gap-1 text-6xl font-semibold leading-none tracking-tight";

/** Full-page lighting, one layer per mood, crossfaded by opacity. */
const MOOD_BACKGROUND: Record<Mood, string> = {
  hot: [
    "radial-gradient(ellipse 80% 60% at 15% 0%, rgba(239, 68, 68, 0.26), transparent 60%)",
    "radial-gradient(ellipse 70% 50% at 85% 8%, rgba(249, 115, 22, 0.18), transparent 60%)",
    "radial-gradient(ellipse 90% 60% at 50% 110%, rgba(190, 18, 60, 0.20), transparent 60%)",
  ].join(", "),
  cold: [
    "radial-gradient(ellipse 80% 60% at 15% 0%, rgba(56, 189, 248, 0.24), transparent 60%)",
    "radial-gradient(ellipse 70% 50% at 85% 8%, rgba(14, 165, 233, 0.18), transparent 60%)",
    "radial-gradient(ellipse 90% 60% at 50% 110%, rgba(8, 145, 178, 0.20), transparent 60%)",
  ].join(", "),
  mild: [
    "radial-gradient(ellipse 70% 45% at 50% -10%, rgba(255, 255, 255, 0.16), transparent 65%)",
    "radial-gradient(ellipse 90% 50% at 50% 115%, rgba(255, 255, 255, 0.05), transparent 60%)",
  ].join(", "),
};

const MOOD_ACCENT: Record<Mood, { eyebrow: string; button: string }> = {
  hot: { eyebrow: "text-red-300/80", button: "bg-red-500 text-white hover:bg-red-400" },
  cold: { eyebrow: "text-sky-300/80", button: "bg-sky-500 text-white hover:bg-sky-400" },
  mild: { eyebrow: "text-white/70", button: "bg-white text-slate-900 hover:bg-slate-200" },
};

function formatClock(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      timeZone: TZ,
    }).format(new Date(iso));
  } catch {
    return "—";
  }
}

function formatDay(date: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: TZ }).format(
      new Date(`${date}T12:00:00Z`),
    );
  } catch {
    return date;
  }
}

export default function Dashboard() {
  const [history, setHistory] = useState<History | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[] | null>(null);
  const [status, setStatus] = useState<"starting" | "live" | "offline">("starting");
  const [thresholdDraft, setThresholdDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const thresholdDirty = useRef(false);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/cloud/history", { cache: "no-store" });
      if (!response.ok) throw new Error(`history responded ${response.status}`);

      const data = (await response.json()) as History;
      setHistory(data);
      setStatus("live");

      if (!thresholdDirty.current) {
        setThresholdDraft(String(Math.round(data.threshold_c * 10) / 10));
      }
    } catch {
      // Keep the last numbers on screen; just say so.
      setStatus("offline");
    }
  }, []);

  const loadForecast = useCallback(async () => {
    try {
      const response = await fetch("/cloud/forecast");
      if (!response.ok) throw new Error(`forecast responded ${response.status}`);
      const data = (await response.json()) as { daily: ForecastDay[] };
      setForecast(data.daily);
    } catch {
      setForecast(null); // the page still shows the room
    }
  }, []);

  useEffect(() => {
    load();
    loadForecast();

    const poll = setInterval(load, POLL_MS);
    const slow = setInterval(loadForecast, FORECAST_MS);

    return () => {
      clearInterval(poll);
      clearInterval(slow);
    };
  }, [load, loadForecast]);

  async function saveThreshold(event: React.FormEvent) {
    event.preventDefault();

    const value = Number(thresholdDraft);
    if (!Number.isFinite(value)) {
      setNotice("Enter a number.");
      return;
    }

    setSaving(true);
    setNotice(null);

    try {
      const response = await fetch("/cloud/threshold", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threshold_c: value }),
      });

      if (!response.ok) throw new Error(`threshold responded ${response.status}`);

      const data = (await response.json()) as { threshold_c: number };
      setHistory((current) => (current ? { ...current, threshold_c: data.threshold_c } : current));
      thresholdDirty.current = false;
      setNotice("Saved — the board picks it up on its next upload, within 5 seconds.");
    } catch {
      setNotice("Couldn't save the threshold. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const latest = history?.readings[0] ?? null;
  const threshold = history?.threshold_c ?? null;
  const ledOn = latest !== null && threshold !== null && latest.temperature > threshold;
  const mood: Mood = latest ? weatherMood(latest.temperature) : "mild";
  const accent = MOOD_ACCENT[mood];

  const statusLabel =
    status === "live" ? "Live" : status === "offline" ? "Offline" : "Connecting";
  const statusTone =
    status === "live"
      ? "bg-emerald-400/15 text-emerald-300 ring-emerald-400/30"
      : status === "offline"
        ? "bg-amber-400/15 text-amber-300 ring-amber-400/30"
        : "bg-white/10 text-slate-300 ring-white/20";

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col gap-8 px-5 py-8 sm:px-8 sm:py-12">
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
        {(Object.keys(MOOD_BACKGROUND) as Mood[]).map((key) => (
          <div
            key={key}
            className="absolute inset-0 transition-opacity duration-700 ease-out"
            style={{
              backgroundImage: MOOD_BACKGROUND[key],
              opacity: mood === key ? 1 : 0,
            }}
          />
        ))}
      </div>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${accent.eyebrow}`}>
            Device to cloud
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
            Medford room station
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {STATION} · DHT22 on GPIO 4 · posts every 5 seconds
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${statusTone}`}>
          {status === "live" && latest ? `● ${statusLabel} · ${formatClock(latest.timestamp)}` : statusLabel}
        </span>
      </header>

      {!latest ? (
        <section className={`${CARD} flex flex-col gap-3`}>
          <p className="text-lg font-medium">Waiting for the first upload</p>
          <p className="text-sm text-slate-400">
            The page is empty because no reading has arrived yet. When the board posts to{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-slate-200">/cloud/history</code>{" "}
            its numbers appear here within five seconds, and the chart fills in behind them.
          </p>
          <p className="text-sm text-slate-400">
            Testing without the board?{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-slate-200">
              curl -X POST …/cloud/history -d &apos;{`{"station":"medford-01","temperature":22.5,"humidity":40}`}&apos;
            </code>
          </p>
        </section>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <article className={CARD}>
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-medium text-slate-300">Temperature</p>
                <span aria-hidden className="text-2xl leading-none">
                  🌡️
                </span>
              </div>
              <p className={BIG}>
                {Math.round(toFahrenheit(latest.temperature))}
                <span className="mt-2 text-2xl font-normal text-slate-400">°F</span>
              </p>
              <p className="mt-3 text-sm text-slate-400">
                {latest.temperature.toFixed(1)} °C · measured {formatClock(latest.timestamp)}
              </p>
            </article>

            <article className={CARD}>
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-medium text-slate-300">Humidity</p>
                <span aria-hidden className="text-2xl leading-none">
                  💧
                </span>
              </div>
              <p className={BIG}>
                {latest.humidity === null ? "—" : Math.round(latest.humidity)}
                <span className="mt-2 text-2xl font-normal text-slate-400">%</span>
              </p>
              <p className="mt-3 text-sm text-slate-400">
                {latest.humidity === null ? "not reported" : describeHumidity(latest.humidity)}
              </p>
            </article>

            <article className={`${CARD} flex sm:col-span-2 lg:col-span-1`}>
              <PixelDisplay temperatureC={latest.temperature} />
            </article>
          </section>

          <section className={`${CARD} flex flex-col gap-4`}>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-300">Threshold</p>
                <p className="mt-1 text-xs text-slate-500">
                  The board compares every reading against this and switches GPIO 2.
                </p>
              </div>
              <span
                className={`rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                  ledOn
                    ? "bg-amber-400/15 text-amber-200 ring-amber-400/40"
                    : "bg-white/5 text-slate-400 ring-white/15"
                }`}
              >
                LED {ledOn ? "on" : "off"}
              </span>
            </div>

            <form onSubmit={saveThreshold} className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-2 text-sm">
                <input
                  type="number"
                  step="0.5"
                  value={thresholdDraft}
                  onChange={(event) => {
                    thresholdDirty.current = true;
                    setThresholdDraft(event.target.value);
                  }}
                  aria-label="Threshold in degrees Celsius"
                  className="w-20 bg-transparent text-right text-white focus:outline-none"
                />
                <span className="text-slate-400">°C</span>
              </label>
              <button
                type="submit"
                disabled={saving}
                className={`rounded-full px-4 py-2 text-sm font-medium transition disabled:opacity-60 ${accent.button}`}
              >
                {saving ? "Saving…" : "Save threshold"}
              </button>
              {notice && <p className="text-xs text-slate-400">{notice}</p>}
            </form>
          </section>

          <section className={CARD}>
            <div className="flex items-baseline justify-between gap-4">
              <p className="text-sm font-medium text-slate-300">Temperature history</p>
              <p className="text-xs text-slate-500">live from Postgres</p>
            </div>
            <TemperatureChart readings={history?.readings ?? []} />
          </section>

          <section>
            <p className="mb-3 text-sm font-medium text-slate-300">Next five days in Medford</p>
            {forecast && forecast.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {forecast.map((day) => (
                  <article key={day.date} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
                      {formatDay(day.date)}
                    </p>
                    <p className="mt-2 flex items-baseline gap-1 text-xl font-semibold">
                      {Math.round(toFahrenheit(day.max))}
                      <span className="text-xs font-normal text-slate-400">°F</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      low {Math.round(toFahrenheit(day.min))}°
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-400">
                Forecast unavailable right now — the room numbers above are unaffected.
              </p>
            )}
          </section>
        </>
      )}

      <footer className="mt-auto border-t border-white/10 pt-5 text-xs text-slate-500">
        Now: DHT22 → POST /cloud/history → Postgres → this page. Five days:{" "}
        <a
          href="https://open-meteo.com"
          target="_blank"
          rel="noreferrer"
          className="text-slate-400 underline-offset-4 hover:underline"
        >
          Open-Meteo
        </a>{" "}
        via GET /cloud/forecast, cached 30 minutes.
      </footer>
    </main>
  );
}
