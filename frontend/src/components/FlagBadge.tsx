import type { Flag } from "@/lib/api";

const STYLES: Record<Flag, { label: string; className: string }> = {
  high: {
    label: "High",
    className: "bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-950/60 dark:text-rose-200 dark:ring-rose-400/25",
  },
  low: {
    label: "Low",
    className: "bg-amber-50 text-amber-900 ring-amber-600/25 dark:bg-amber-950/60 dark:text-amber-200 dark:ring-amber-400/25",
  },
  abnormal: {
    label: "Abnormal",
    className: "bg-rose-50 text-rose-800 ring-rose-600/20 dark:bg-rose-950/60 dark:text-rose-200 dark:ring-rose-400/25",
  },
  normal: {
    label: "Normal",
    className:
      "bg-emerald-50 text-emerald-800 ring-emerald-600/20 dark:bg-emerald-950/60 dark:text-emerald-200 dark:ring-emerald-400/25",
  },
  unknown: {
    label: "No range",
    className: "bg-slate-50 text-slate-600 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-400/20",
  },
};

export function FlagBadge({ flag }: { flag: Flag }) {
  const { label, className } = STYLES[flag];
  return <span className={`badge ring-1 ring-inset ${className}`}>{label}</span>;
}
