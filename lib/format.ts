export function formatDuration(totalSeconds: number | null): string {
  if (totalSeconds == null) return "–";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatDistance(meters: number | null): string {
  if (meters == null || meters === 0) return "–";
  return `${(meters / 1000).toFixed(2)} km`;
}

export function formatElevation(meters: number | null): string {
  if (meters == null) return "–";
  return `${Math.round(meters)} m`;
}

/** Pace as min/km for run-like activities, km/h for everything else with meaningful speed. */
export function formatPace(averageSpeedMps: number | null, type: string): string {
  if (averageSpeedMps == null || averageSpeedMps <= 0) return "–";
  if (type === "Run" || type === "Walk" || type === "Hike") {
    const secondsPerKm = 1000 / averageSpeedMps;
    const minutes = Math.floor(secondsPerKm / 60);
    const seconds = Math.round(secondsPerKm % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")} /km`;
  }
  return `${(averageSpeedMps * 3.6).toFixed(1)} km/h`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    dateStyle: "long",
    timeStyle: "short",
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB");
}

/** Signed formatter for values that can be negative (e.g. Body Battery delta). */
export function formatSigned(value: number | null, unit: string): string {
  if (value == null) return "–";
  const sign = value > 0 ? "+" : "";
  return `${sign}${Math.round(value)}${unit}`;
}

/** Garmin returns water loss in ml; display as liters. */
export function formatWaterLoss(ml: number | null): string {
  if (ml == null) return "–";
  return `${(ml / 1000).toFixed(1)} L`;
}

/** Garmin returns stride length in cm; Garmin's own UI shows it in meters. */
export function formatStrideLength(cm: number | null): string {
  if (cm == null) return "–";
  return `${(cm / 100).toFixed(2)} m`;
}

interface WeatherLike {
  temp_c: number | null;
  description: string | null;
}

export function formatWeather(weather: WeatherLike | null): string {
  if (!weather) return "–";
  const parts = [
    weather.temp_c != null ? `${Math.round(weather.temp_c)}°C` : null,
    weather.description ?? null,
  ].filter((part): part is string => Boolean(part));
  return parts.length ? parts.join(", ") : "–";
}
