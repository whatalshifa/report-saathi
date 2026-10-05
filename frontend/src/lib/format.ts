export function formatDate(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatShortDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export function formatRange(low: number | null, high: number | null, printed: string | null): string {
  if (printed) return printed;
  if (low !== null && high !== null) return `${formatNumber(low)} – ${formatNumber(high)}`;
  if (high !== null) return `up to ${formatNumber(high)}`;
  if (low !== null) return `above ${formatNumber(low)}`;
  return "—";
}

/** Indian digit grouping (2,50,000) and no more decimals than the value needs. */
export function formatNumber(value: number): string {
  return value.toLocaleString("en-IN", { maximumFractionDigits: Math.abs(value) < 10 ? 2 : 1 });
}
