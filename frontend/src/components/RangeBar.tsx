import type { TestResult } from "@/lib/api";

// A small bar showing where a value sits against its normal range.
// The shaded band is the normal range; the dot is the patient's value.
export function RangeBar({ result }: { result: TestResult }) {
  const { value, ref_low: low, ref_high: high, flag } = result;
  if (value === null || (low === null && high === null)) return null;

  const bottom = low ?? 0;
  const top = high ?? Math.max(bottom * 2, value * 1.2);
  const span = top - bottom || Math.abs(top) || 1;
  const min = Math.min(bottom - span * 0.5, value);
  const max = Math.max(top + span * 0.5, value);
  const position = (x: number) => ((x - min) / (max - min)) * 100;

  const bandStart = position(bottom);
  const bandEnd = position(top);
  const dotColor = flag === "normal" ? "bg-emerald-600" : flag === "low" ? "bg-amber-500" : "bg-rose-600";

  return (
    <div
      className="relative h-1.5 w-full min-w-24 rounded-full bg-stone-200/80 dark:bg-stone-700/80"
      role="img"
      aria-label={`${value} against ${result.range_source === "typical" ? "a typical" : "a normal"} range of ${
        result.reference_text ?? `${low ?? ""}–${high ?? ""}`
      }`}
    >
      <div
        className="absolute inset-y-0 rounded-full bg-emerald-200/80 dark:bg-emerald-800/70"
        style={{ left: `${bandStart}%`, width: `${bandEnd - bandStart}%` }}
      />
      <div
        className={`absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white dark:border-stone-900 ${dotColor}`}
        style={{ left: `${Math.min(Math.max(position(value), 2), 98)}%` }}
      />
    </div>
  );
}
