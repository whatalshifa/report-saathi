import { isOutOfRange, type TrendSeries } from "@/lib/api";

/**
 * A small trend line for a dashboard tile: readings spaced by date, with the normal range as a band
 * behind them. Decorative: the tile around it says the numbers in words.
 */
export function Sparkline({ series, className = "h-10" }: { series: TrendSeries; className?: string }) {
  const points = series.points;
  const values = points.map((p) => p.value);
  const bounds = [series.ref_low, series.ref_high].filter((v): v is number => v !== null);
  let lo = Math.min(...values, ...bounds);
  let hi = Math.max(...values, ...bounds);
  if (hi === lo) {
    hi += 1;
    lo -= 1;
  }
  const pad = (hi - lo) * 0.18;
  lo -= pad;
  hi += pad;

  const times = points.map((p) => Date.parse(p.date));
  const t0 = times[0];
  const span = times[times.length - 1] - t0 || 1;
  const x = (i: number) => (points.length === 1 ? 50 : ((times[i] - t0) / span) * 100);
  const y = (v: number) => ((hi - v) / (hi - lo)) * 100;

  const bandTop = series.ref_high !== null ? y(series.ref_high) : 0;
  const bandBottom = series.ref_low !== null ? y(series.ref_low) : 100;
  const hasBand = bounds.length > 0;
  const line = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(2)},${y(p.value).toFixed(2)}`).join(" ");

  return (
    <div aria-hidden className={`relative ${className}`}>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full overflow-visible">
        {hasBand && (
          <rect
            x="0"
            width="100"
            y={bandTop}
            height={Math.max(0, bandBottom - bandTop)}
            className="fill-emerald-500/10 dark:fill-emerald-400/10"
          />
        )}
        {series.ref_high !== null && (
          <line x1="0" x2="100" y1={bandTop} y2={bandTop} vectorEffect="non-scaling-stroke" strokeDasharray="2 3" className="stroke-emerald-600/40 dark:stroke-emerald-400/35" />
        )}
        {series.ref_low !== null && (
          <line x1="0" x2="100" y1={bandBottom} y2={bandBottom} vectorEffect="non-scaling-stroke" strokeDasharray="2 3" className="stroke-emerald-600/40 dark:stroke-emerald-400/35" />
        )}
        <path
          d={line}
          fill="none"
          vectorEffect="non-scaling-stroke"
          strokeWidth="1.75"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="stroke-brand-600 dark:stroke-brand-300"
        />
      </svg>
      {points.map((p, i) => {
        const last = i === points.length - 1;
        const out = isOutOfRange(p.flag);
        return (
          <span
            key={p.report_id + i}
            className={`absolute -translate-x-1/2 -translate-y-1/2 rounded-full ${
              last
                ? `h-2 w-2 ring-2 ring-surface ${out ? "bg-coral-500" : "bg-brand-700 dark:bg-brand-200"}`
                : `h-1.5 w-1.5 ${out ? "bg-coral-400" : "bg-brand-400 dark:bg-brand-400"}`
            }`}
            style={{ left: `${x(i)}%`, top: `${y(p.value)}%` }}
          />
        );
      })}
    </div>
  );
}
