import LocationSearch from "@/components/location-search";
import {
  DEFAULT_LOCATION,
  describeHumidity,
  describeWeatherCode,
  formatObservedTime,
  getCurrentWeather,
  parseCoordinates,
  toFahrenheit,
  type CurrentWeather,
} from "@/lib/weather";

export const revalidate = 60;

type PageProps = {
  searchParams: Promise<{ lat?: string; lon?: string; name?: string }>;
};

const CARD =
  "relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.06] p-6 backdrop-blur-xl sm:p-8";
const BIG_NUMBER = "tabular mt-6 flex items-start gap-1 text-6xl font-semibold leading-none tracking-tight sm:text-7xl";

/** Place names come from the URL, so keep them short and free of control characters. */
function cleanPlaceName(name?: string): string | null {
  if (typeof name !== "string") return null;
  const cleaned = name
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, 80);
  return cleaned.length > 0 ? cleaned : null;
}

function WeatherCards({ weather }: { weather: CurrentWeather }) {
  const { icon, label } = describeWeatherCode(weather.weatherCode);
  const tempF = Math.round(toFahrenheit(weather.temperatureC));
  const tempC = Math.round(weather.temperatureC);
  const feelsF = Math.round(toFahrenheit(weather.feelsLikeC));
  const windMph = Math.round(weather.windKph * 0.621371);
  const humidity = Math.round(weather.humidity);
  const humidityWidth = Math.min(100, Math.max(0, humidity));

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2">
        <article className={CARD}>
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm font-medium text-slate-300">Temperature</p>
            <span aria-hidden className="text-3xl leading-none">
              {icon}
            </span>
          </div>
          <p className={BIG_NUMBER}>
            {tempF}
            <span className="mt-2 text-2xl font-normal text-slate-400">°F</span>
          </p>
          <p className="mt-3 text-sm text-slate-400">
            {tempC} °C · feels like {feelsF} °F
          </p>
        </article>

        <article className={CARD}>
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm font-medium text-slate-300">Humidity</p>
            <span aria-hidden className="text-3xl leading-none">
              💧
            </span>
          </div>
          <p className={BIG_NUMBER}>
            {humidity}
            <span className="mt-2 text-2xl font-normal text-slate-400">%</span>
          </p>
          <p className="mt-3 text-sm text-slate-400">{describeHumidity(humidity)}</p>
          <div
            className="mt-5 h-2 w-full overflow-hidden rounded-full bg-white/10"
            role="img"
            aria-label={`Relative humidity ${humidity} percent`}
          >
            <div
              className="h-full rounded-full bg-gradient-to-r from-sky-400 to-cyan-300"
              style={{ width: `${humidityWidth}%` }}
            />
          </div>
        </article>
      </section>

      <section className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-400">
        <span>
          {icon} {label}
        </span>
        <span>Wind {windMph} mph</span>
        <span>Observed {formatObservedTime(weather.observedAt)} local time</span>
      </section>
    </>
  );
}

function WeatherUnavailable() {
  return (
    <section className={`${CARD} flex flex-col gap-2`}>
      <p className="text-lg font-medium text-white">Weather data is unavailable</p>
      <p className="text-sm text-slate-400">
        We couldn&apos;t reach the weather service just now. This usually clears up on its own — try
        reloading in a moment.
      </p>
    </section>
  );
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const coordinates = parseCoordinates(params.lat, params.lon) ?? DEFAULT_LOCATION;
  const placeName = cleanPlaceName(params.name) ?? DEFAULT_LOCATION.name;

  let weather: CurrentWeather | null = null;

  try {
    weather = await getCurrentWeather(coordinates);
  } catch {
    weather = null;
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-4xl flex-col gap-10 px-5 py-8 sm:px-8 sm:py-12">
      <header className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-300/80">
            Current conditions
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight break-words sm:text-3xl">
            {placeName}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {coordinates.latitude.toFixed(3)}, {coordinates.longitude.toFixed(3)}
          </p>
        </div>
        <LocationSearch />
      </header>

      {weather ? <WeatherCards weather={weather} /> : <WeatherUnavailable />}

      <footer className="mt-auto border-t border-white/10 pt-5 text-xs text-slate-500">
        Data from{" "}
        <a
          href="https://open-meteo.com"
          className="text-slate-400 underline-offset-4 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Open-Meteo
        </a>
        , refreshed every minute. No API keys required.
      </footer>
    </main>
  );
}
