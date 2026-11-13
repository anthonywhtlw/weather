export type ForecastDay = {
  date: string;
  max: number;
  min: number;
};

const FORECAST_URL = "https://api.open-meteo.com/v1/forecast";

type OpenMeteoDaily = {
  daily?: {
    time?: string[];
    temperature_2m_max?: number[];
    temperature_2m_min?: number[];
  };
};

/**
 * Five days of highs and lows for Medford, fetched server-side and cached for
 * half an hour. The browser never talks to Open-Meteo itself.
 */
export async function getForecast(): Promise<ForecastDay[]> {
  const params = new URLSearchParams({
    latitude: "42.4",
    longitude: "-71.1",
    daily: "temperature_2m_max,temperature_2m_min",
    timezone: "auto",
    forecast_days: "5",
  });

  const response = await fetch(`${FORECAST_URL}?${params}`, {
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    throw new Error(`Open-Meteo responded with ${response.status}`);
  }

  const data = (await response.json()) as OpenMeteoDaily;
  const daily = data.daily;

  if (!daily?.time?.length) {
    throw new Error("Open-Meteo returned no daily forecast");
  }

  return daily.time.map((date, index) => ({
    date,
    max: daily.temperature_2m_max?.[index] ?? 0,
    min: daily.temperature_2m_min?.[index] ?? 0,
  }));
}
