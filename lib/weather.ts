const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

/** Coordinates returned by the geocoding API or read from the URL. */
export type Coordinates = {
  latitude: number;
  longitude: number;
};

/**
 * Where the app points when no location is in the URL.
 * Medford, MA — home of Tufts and the Nolop makerspace.
 */
export const DEFAULT_LOCATION: Coordinates & { name: string } = {
  name: "Medford, MA",
  latitude: 42.4072,
  longitude: -71.3824,
};

export type CurrentWeather = {
  temperatureC: number;
  humidity: number;
  feelsLikeC: number;
  windKph: number;
  weatherCode: number;
  /** ISO-ish local time at the location, e.g. "2026-11-12T15:00". */
  observedAt: string;
};

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    relative_humidity_2m?: number;
    apparent_temperature?: number;
    wind_speed_10m?: number;
    weather_code?: number;
    time?: string;
  };
};

/**
 * Reads `?lat=` and `?lon=` from the URL, rejecting anything out of range.
 * Returns null when the pair is missing or invalid so callers can fall back.
 */
export function parseCoordinates(lat?: string, lon?: string): Coordinates | null {
  if (lat === undefined || lon === undefined) return null;

  const latitude = Number(lat);
  const longitude = Number(lon);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;

  return { latitude, longitude };
}

/** Fetches current conditions. Cached for a minute so refreshes stay cheap. */
export async function getCurrentWeather({
  latitude,
  longitude,
}: Coordinates): Promise<CurrentWeather> {
  const params = new URLSearchParams({
    latitude: latitude.toFixed(4),
    longitude: longitude.toFixed(4),
    current:
      "temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code",
    timezone: "auto",
  });

  const response = await fetch(`${FORECAST_URL}?${params}`, {
    next: { revalidate: 60 },
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo responded with ${response.status}`);
  }

  const data = (await response.json()) as OpenMeteoResponse;
  const current = data.current;

  if (!current || typeof current.temperature_2m !== "number") {
    throw new Error("Open-Meteo returned an unexpected payload");
  }

  return {
    temperatureC: current.temperature_2m,
    humidity: current.relative_humidity_2m ?? 0,
    feelsLikeC: current.apparent_temperature ?? current.temperature_2m,
    windKph: current.wind_speed_10m ?? 0,
    weatherCode: current.weather_code ?? 0,
    observedAt: current.time ?? "",
  };
}

/** WMO weather interpretation codes, as used by Open-Meteo. */
export function describeWeatherCode(code: number): { label: string; icon: string } {
  const table: Record<number, { label: string; icon: string }> = {
    0: { label: "Clear sky", icon: "☀️" },
    1: { label: "Mainly clear", icon: "🌤️" },
    2: { label: "Partly cloudy", icon: "⛅" },
    3: { label: "Overcast", icon: "☁️" },
    45: { label: "Fog", icon: "🌫️" },
    48: { label: "Freezing fog", icon: "🌫️" },
    51: { label: "Light drizzle", icon: "🌦️" },
    53: { label: "Drizzle", icon: "🌦️" },
    55: { label: "Heavy drizzle", icon: "🌦️" },
    56: { label: "Freezing drizzle", icon: "🌧️" },
    57: { label: "Freezing drizzle", icon: "🌧️" },
    61: { label: "Light rain", icon: "🌧️" },
    63: { label: "Rain", icon: "🌧️" },
    65: { label: "Heavy rain", icon: "🌧️" },
    66: { label: "Freezing rain", icon: "🌧️" },
    67: { label: "Freezing rain", icon: "🌧️" },
    71: { label: "Light snow", icon: "🌨️" },
    73: { label: "Snow", icon: "❄️" },
    75: { label: "Heavy snow", icon: "❄️" },
    77: { label: "Snow grains", icon: "🌨️" },
    80: { label: "Light showers", icon: "🌦️" },
    81: { label: "Showers", icon: "🌦️" },
    82: { label: "Violent showers", icon: "⛈️" },
    85: { label: "Snow showers", icon: "🌨️" },
    86: { label: "Heavy snow showers", icon: "🌨️" },
    95: { label: "Thunderstorm", icon: "⛈️" },
    96: { label: "Thunderstorm with hail", icon: "⛈️" },
    99: { label: "Thunderstorm with hail", icon: "⛈️" },
  };

  return table[code] ?? { label: "Unknown conditions", icon: "🌡️" };
}

/** Short, plain-language read on how humid it feels. */
export function describeHumidity(humidity: number): string {
  if (humidity < 30) return "Dry";
  if (humidity < 60) return "Comfortable";
  if (humidity < 70) return "Noticeably humid";
  if (humidity < 85) return "Humid";
  return "Very humid";
}

export const toFahrenheit = (celsius: number): number => celsius * 1.8 + 32;

/** Turns "2026-11-12T15:00" into "3:00 PM". */
export function formatObservedTime(observedAt: string): string {
  const match = /T(\d{2}):(\d{2})/.exec(observedAt);
  if (!match) return "just now";

  const hour = Number(match[1]);
  const minute = match[2];
  const suffix = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;

  return `${hour12}:${minute} ${suffix}`;
}
