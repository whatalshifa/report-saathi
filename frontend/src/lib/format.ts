export function formatDate(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatRange(low: number | null, high: number | null, printed: string | null): string {
  if (printed) return printed;
  if (low !== null && high !== null) return `${low} – ${high}`;
  if (high !== null) return `up to ${high}`;
  if (low !== null) return `above ${low}`;
  return "—";
}
