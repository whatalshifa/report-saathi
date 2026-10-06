"use client";

import { useEffect, useRef, useState } from "react";

import { FlagBadge } from "@/components/FlagBadge";
import type { Flag, TrendSeries } from "@/lib/api";
import { formatDate, formatNumber, formatShortDate } from "@/lib/format";

// Status colours are reserved for low/high/normal and always come with a text label.
const DOT: Record<Flag, string> = {
  normal: "#0ca30c",
  low: "#fab219",
  high: "#d03b3b",
  abnormal: "#d03b3b",
  unknown: "#94a3b8",
};

const HEIGHT = 200;
const PAD = { top: 12, right: 16, bottom: 28, left: 52 };

function niceTicks(min: number, max: number, count = 5): number[] {
  const raw = (max - min) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= raw) ?? raw;
  const ticks = [];
  for (let t = Math.ceil(min / step) * step; t <= max + step / 1e6; t += step) ticks.push(Number(t.toFixed(10)));
  return ticks;
}

function compact(value: number): string {
  if (Math.abs(value) >= 100000) return `${formatNumber(value / 100000)}L`;
  if (Math.abs(value) >= 1000) return `${formatNumber(value / 1000)}k`;
  return formatNumber(value);
}

export function TrendChart({ series }: { series: TrendSeries }) {
  const box = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);

  // Draw at the real pixel width so text stays the same size on phones and laptops.
  useEffect(() => {
    if (!box.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(box.current);
    return () => observer.disconnect();
  }, []);

  const { points, ref_low: low, ref_high: high } = series;
  const values = points.map((p) => p.value);
  // Both ends of the normal range stay in view, so the band shows even when every reading is outside it.
  const limits = [low, high].filter((v): v is number => v !== null);
  const lowest = Math.min(...values, ...limits);
  const highest = Math.max(...values, ...limits);
  const spread = highest - lowest || Math.abs(highest) || 1;
  const yMin = Math.max(0, lowest - spread * 0.25);
  const yMax = highest + spread * 0.25;

  const times = points.map((p) => new Date(p.date).getTime());
  const tMin = Math.min(...times);
  const tMax = Math.max(...times);
  const plotW = Math.max(width - PAD.left - PAD.right, 10);
  const plotH = HEIGHT - PAD.top - PAD.bottom;
  const x = (t: number) => PAD.left + (tMax === tMin ? plotW / 2 : ((t - tMin) / (tMax - tMin)) * plotW);
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * plotH;

  const bandTop = y(Math.min(high ?? yMax, yMax));
  const bandBottom = y(Math.max(low ?? yMin, yMin));
  const ticks = niceTicks(yMin, yMax);
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(times[i])},${y(p.value)}`).join("");

  // Each point owns the strip of chart nearest to it, so the pointer only has to be close.
  const edges = times.map((t, i) => {
    const left = i === 0 ? PAD.left : (x(times[i - 1]) + x(t)) / 2;
    const right = i === times.length - 1 ? PAD.left + plotW : (x(t) + x(times[i + 1])) / 2;
    return [left, right];
  });

  // Date labels need room (the first one sticks out to the right); drop any that would overlap.
  const LABEL_GAP = 90;
  const labelled = new Set<number>([points.length - 1]);
  let lastX = x(times[points.length - 1]);
  for (let i = points.length - 2; i >= 0; i--) {
    if (lastX - x(times[i]) >= LABEL_GAP) {
      labelled.add(i);
      lastX = x(times[i]);
    }
  }

  // A mouse shows a reading on hover; on a phone a tap shows it until the next tap.
  const shown = active === null ? null : points[active];

  return (
    <div ref={box} className="relative">
      {width > 0 && (
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`${series.name} over time: ${points
            .map((p) => `${formatDate(p.date)} ${formatNumber(p.value)} ${series.unit} (${p.flag})`)
            .join("; ")}`}
          onPointerLeave={(e) => e.pointerType === "mouse" && setActive(null)}
          className="overflow-visible"
        >
          {/* Normal range band */}
          {(low !== null || high !== null) && (
            <rect
              x={PAD.left}
              y={bandTop}
              width={plotW}
              height={Math.max(bandBottom - bandTop, 0)}
              className="fill-emerald-50 dark:fill-emerald-950/60"
            />
          )}
          {/* Edges of the normal range */}
          {limits.map((limit) => (
            <line
              key={limit}
              x1={PAD.left}
              x2={PAD.left + plotW}
              y1={y(limit)}
              y2={y(limit)}
              strokeDasharray="4 4"
              strokeWidth={1}
              className="stroke-emerald-500/70 dark:stroke-emerald-600/70"
            />
          ))}
          {/* Recessive grid and y-axis labels */}
          {ticks.map((t) => (
            <g key={t}>
              <line
                x1={PAD.left}
                x2={PAD.left + plotW}
                y1={y(t)}
                y2={y(t)}
                className="stroke-slate-200/80 dark:stroke-slate-800"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={y(t)}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-slate-500 text-[11px] tabular-nums"
              >
                {compact(t)}
              </text>
            </g>
          ))}
          {/* Date labels under each reading */}
          {points.map((p, i) => (
            labelled.has(i) && <text
              key={p.report_id}
              x={x(times[i])}
              y={HEIGHT - 8}
              textAnchor={points.length > 1 && i === 0 ? "start" : i === points.length - 1 && i > 0 ? "end" : "middle"}
              className="fill-slate-500 text-[11px]"
            >
              {formatShortDate(p.date)}
            </text>
          ))}
          {active !== null && (
            <line
              x1={x(times[active])}
              x2={x(times[active])}
              y1={PAD.top}
              y2={PAD.top + plotH}
              className="stroke-slate-400"
              strokeWidth={1}
            />
          )}
          <path d={path} fill="none" strokeWidth={2} strokeLinejoin="round" className="stroke-slate-500" />
          {points.map((p, i) => (
            <circle
              key={p.report_id}
              cx={x(times[i])}
              cy={y(p.value)}
              r={active === i ? 6.5 : 5}
              fill={DOT[p.flag]}
              strokeWidth={2}
              className="stroke-white dark:stroke-slate-900"
            />
          ))}
          {/* Invisible hover and keyboard targets */}
          {points.map((p, i) => (
            <rect
              key={p.report_id}
              x={edges[i][0]}
              y={0}
              width={edges[i][1] - edges[i][0]}
              height={HEIGHT}
              fill="transparent"
              tabIndex={0}
              aria-label={`${formatDate(p.date)}: ${p.printed}, ${p.flag}`}
              onPointerEnter={(e) => e.pointerType === "mouse" && setActive(i)}
              onClick={() => setActive(active === i ? null : i)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              className="outline-none"
            />
          ))}
        </svg>
      )}
      {shown && active !== null && (
        <div
          className="pointer-events-none absolute top-0 z-10 w-48 rounded-lg border border-line bg-surface p-3 text-sm shadow-lg"
          style={{ left: Math.min(Math.max(x(times[active]) - 96, 0), Math.max(width - 192, 0)) }}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium">{formatDate(shown.date)}</span>
            <FlagBadge flag={shown.flag} />
          </div>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {formatNumber(shown.value)} <span className="text-sm font-normal text-muted">{series.unit}</span>
          </p>
          <p className="text-muted">
            {shown.lab_name ?? "Unknown lab"} printed {shown.printed}
          </p>
        </div>
      )}
    </div>
  );
}
