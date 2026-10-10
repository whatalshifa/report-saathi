import type { TrendSeries } from "@/lib/api";

export type Direction = "better" | "back" | "worse" | "steady-in" | "steady-out";

/** How far a value sits outside its normal range (0 when inside it). */
export function distanceOutside(value: number, low: number | null, high: number | null): number {
  if (low !== null && value < low) return low - value;
  if (high !== null && value > high) return value - high;
  return 0;
}

/** Whether the latest reading moved towards or away from the normal range. */
export function direction(series: TrendSeries): Direction | null {
  const n = series.points.length;
  if (n < 2 || (series.ref_low === null && series.ref_high === null)) return null;
  const before = distanceOutside(series.points[n - 2].value, series.ref_low, series.ref_high);
  const now = distanceOutside(series.points[n - 1].value, series.ref_low, series.ref_high);
  if (now === 0) return before > 0 ? "back" : "steady-in";
  if (now < before) return "better";
  if (now > before) return "worse";
  return "steady-out";
}

// The markers most families and doctors watch, in the order a dashboard shows them.
const KEY_ORDER = [
  "hba1c",
  "ldl",
  "hemoglobin",
  "glucose_fasting",
  "cholesterol_total",
  "tsh",
  "vitamin_d",
  "ferritin",
  "creatinine",
  "triglycerides",
  "hdl",
  "vitamin_b12",
];

/** Tests with at least two readings, the well-known markers first, out-of-range ones ahead of the rest. */
export function keyMarkers(series: TrendSeries[], limit: number): TrendSeries[] {
  const rank = (s: TrendSeries) => {
    const i = KEY_ORDER.indexOf(s.key);
    return i === -1 ? KEY_ORDER.length : i;
  };
  return series
    .filter((s) => s.points.length > 1)
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, limit);
}
