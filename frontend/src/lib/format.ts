export function formatDate(value: string | null): string {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatShortDate(value: string): string {
  return new Date(value).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export function formatRange(low: number | null, high: number | null, printed: string | null): string {
  // "12.0-15.5" and "12.0 - 15.5" as labs print them read as "12.0 – 15.5", like every other range here.
  if (printed) return printed.trim().replace(/^([\d.,]+)\s*-\s*([\d.,]+)$/, "$1 – $2");
  if (low !== null && high !== null) return `${formatNumber(low)} – ${formatNumber(high)}`;
  if (high !== null) return `up to ${formatNumber(high)}`;
  if (low !== null) return `above ${formatNumber(low)}`;
  return "—";
}

/** Indian digit grouping (2,50,000) and no more decimals than the value needs. */
export function formatNumber(value: number): string {
  return value.toLocaleString("en-IN", { maximumFractionDigits: Math.abs(value) < 10 ? 2 : 1 });
}

export const RELATION_LABEL: Record<string, string> = {
  self: "You",
  spouse: "Spouse",
  parent: "Parent",
  child: "Child",
  sibling: "Sibling",
  grandparent: "Grandparent",
  other: "Family",
};

/** "Papa's" / "Asha's" for headings. */
export const possessive = (name: string) => (name.endsWith("s") ? `${name}’` : `${name}’s`);

/** Labs print ages as "54 Years", "54 Y" or "54Yrs"; show them all as "54 years". */
export function formatAge(age: string | null): string {
  if (!age) return "";
  const match = age.trim().match(/^(\d{1,3})\s*(?:y|yr|yrs|year|years)\.?$/i);
  return match ? `${match[1]} years` : age.trim();
}

/** "Female" / "F" / "male" → "Female" / "Male"; anything else as printed. */
export function formatSex(sex: string | null): string {
  if (!sex) return "";
  const s = sex.trim().toLowerCase();
  if (s === "f" || s === "female") return "Female";
  if (s === "m" || s === "male") return "Male";
  return sex.trim();
}

/** Server times are UTC, but SQLite drops the zone; read a bare time as UTC, not local time. */
export function serverTime(value: string): number {
  return Date.parse(/(?:Z|[+-]\d\d:?\d\d)$/i.test(value) ? value : `${value}Z`);
}

/** "840 KB" or "2.4 MB", the way phones show file sizes. */
export function formatFileSize(bytes: number): string {
  if (bytes < 1_000_000) return `${Math.max(1, Math.round(bytes / 1000))} KB`;
  return `${(bytes / 1_000_000).toFixed(1)} MB`;
}
