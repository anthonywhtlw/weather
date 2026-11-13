export function toFahrenheit(celsius: number): number {
  return celsius * 1.8 + 32;
}

/** Short, plain-language read on how humid it feels. */
export function describeHumidity(humidity: number): string {
  if (humidity < 30) return "Dry";
  if (humidity < 60) return "Comfortable";
  if (humidity < 70) return "Noticeably humid";
  if (humidity < 85) return "Humid";
  return "Very humid";
}
