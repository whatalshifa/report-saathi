import type { Flag } from "@/lib/api";

const STYLES: Record<Flag, { label: string; className: string }> = {
  high: { label: "High", className: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200" },
  low: { label: "Low", className: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200" },
  abnormal: { label: "Abnormal", className: "bg-rose-100 text-rose-800 dark:bg-rose-950 dark:text-rose-200" },
  normal: {
    label: "Normal",
    className: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
  },
  unknown: { label: "No range", className: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" },
};

export function FlagBadge({ flag }: { flag: Flag }) {
  const { label, className } = STYLES[flag];
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>{label}</span>
  );
}
