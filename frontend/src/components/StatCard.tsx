/** One number with its label, used in the rows of figures at the top of the report and timeline pages. */
export function StatCard({ label, value, tone }: { label: string; value: number | string; tone?: "good" | "warn" }) {
  const color =
    tone === "good" ? "text-emerald-700 dark:text-emerald-300" : tone === "warn" ? "text-rose-700 dark:text-rose-300" : "";
  return (
    <div className="card flex flex-col justify-between px-3 py-3 sm:px-5 sm:py-4">
      <p className="text-xs leading-snug text-muted sm:text-sm">{label}</p>
      <p className={`mt-1 text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl ${color}`}>{value}</p>
    </div>
  );
}
