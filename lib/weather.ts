/** Every station in the class is in Medford, so one timezone is enough. */
export const STATION_TIME_ZONE = "America/New_York";

export function toFahrenheit(celsius: number): number {
  return celsius * 1.8 + 32;
}

export type Mood = "hot" | "cold" | "mild";

/** One set of thresholds for the pixel panel and the chart, so they never disagree. */
export function weatherMood(celsius: number): Mood {
  if (celsius >= 25) return "hot";
  if (celsius <= 18) return "cold";
  return "mild";
}

/** Short, plain-language read on how humid it feels. */
export function describeHumidity(humidity: number): string {
  if (humidity < 30) return "Dry";
  if (humidity < 60) return "Comfortable";
  if (humidity < 70) return "Noticeably humid";
  if (humidity < 85) return "Humid";
  return "Very humid";
}
