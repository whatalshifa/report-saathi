import type { ReactNode } from "react";

/**
 * A row of figures at the top of the report and timeline pages: number then label, inline on wider screens and
 * stacked on phones, so labels never wrap. Wrap `StatCard`s in one `StatRow`.
 */
export function StatRow({ children }: { children: ReactNode }) {
  return (
    <dl className="flex flex-wrap justify-between gap-x-4 gap-y-3 border-y border-line py-4 sm:justify-start sm:gap-x-10">
      {children}
    </dl>
  );
}

export function StatCard({ label, value, tone }: { label: string; value: number | string; tone?: "good" | "warn" }) {
  const color =
    tone === "good" ? "text-emerald-700 dark:text-emerald-300" : tone === "warn" ? "text-rose-700 dark:text-rose-300" : "";
  return (
    <div className="flex flex-col whitespace-nowrap sm:flex-row sm:items-baseline sm:gap-2">
      <dt className="order-2 text-[13px] text-muted sm:text-sm">{label}</dt>
      <dd className={`order-1 text-xl font-semibold tracking-tight tabular-nums ${color}`}>{value}</dd>
    </div>
  );
}
