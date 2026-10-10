"use client";

import { ArrowRight, CheckCircle2, TriangleAlert } from "lucide-react";
import { useState } from "react";

import { TrendChart } from "@/components/TrendChart";
import { isOutOfRange, type TrendSeries } from "@/lib/api";
import { formatDate, formatNumber, formatShortDate } from "@/lib/format";
import { direction } from "@/lib/trends";

import { GLANCES, REPORTS, TRENDS } from "./sample";

const KEYS = ["hba1c", "hemoglobin", "vitamin_d", "tsh", "ferritin", "ldl"];
const SERIES = KEYS.map((k) => TRENDS.series.find((s) => s.key === k)).filter((s): s is TrendSeries => !!s);
const REPORTS_OLDEST_FIRST = [...REPORTS].reverse();

function storyOf(s: TrendSeries): { text: string; good: boolean } {
  const first = s.points[0];
  const last = s.points[s.points.length - 1];
  const out = isOutOfRange(last.flag);
  const dir = direction(s);
  const was = isOutOfRange(first.flag) ? ` ${first.flag} in ${formatShortDate(first.date)},` : "";
  if (!out) return { text: `${was} in range by ${formatShortDate(last.date)}`.trim(), good: true };
  return {
    text: dir === "better" ? "falling, but still above the target" : `still ${last.flag}`,
    good: false,
  };
}

/** Three reports from two labs, lined up: how many values were out of range each time, and one test's line. */
export function TrendStory() {
  const [key, setKey] = useState(SERIES[0].key);
  const series = SERIES.find((s) => s.key === key)!;
  const first = series.points[0];
  const last = series.points[series.points.length - 1];

  return (
    <div className="overflow-hidden rounded-[22px] border border-line bg-surface shadow-[0_30px_60px_-40px_rgb(72_38_70/0.4)]">
      {/* The reports, oldest first */}
      <ol className="grid grid-cols-3 border-b border-line">
        {REPORTS_OLDEST_FIRST.map((r, i) => {
          const glance = GLANCES[r.id];
          return (
            <li key={r.id} className={`relative px-3 py-4 sm:px-6 sm:py-5 ${i > 0 ? "border-l border-line" : ""}`}>
              <p className="text-[13px] font-semibold tabular-nums sm:text-sm">{formatDate(r.report_date)}</p>
              <p className="mt-0.5 line-clamp-2 text-xs text-muted sm:text-[13px]">{r.lab_name}</p>
              <div aria-hidden className="mt-3 flex h-2 gap-px overflow-hidden rounded-full">
                {Array.from({ length: glance.total }, (_, j) => (
                  <span
                    key={j}
                    className={`flex-1 ${j < glance.out_of_range ? "bg-coral-500" : "bg-emerald-500/40 dark:bg-emerald-400/35"}`}
                  />
                ))}
              </div>
              <p className="mt-2 text-xs sm:text-[13px]">
                <span className="font-semibold tabular-nums">{glance.out_of_range}</span>
                <span className="text-muted"> of {glance.total} outside range</span>
              </p>
            </li>
          );
        })}
      </ol>

      <div className="grid grid-cols-[minmax(0,1fr)] lg:grid-cols-[18rem_minmax(0,1fr)]">
        <div className="min-w-0 border-b border-line lg:border-r lg:border-b-0">
          <p id="marker-picker" className="px-4 pt-4 text-[13px] font-medium text-muted sm:px-6">
            Pick a test
          </p>
          <ul
            aria-labelledby="marker-picker"
            className="flex gap-1.5 overflow-x-auto px-4 py-3 sm:px-6 lg:flex-col lg:gap-0.5 lg:px-3 lg:pb-4"
          >
            {SERIES.map((s) => {
              const active = s.key === key;
              const story = storyOf(s);
              return (
                <li key={s.key} className="shrink-0">
                  <button
                    type="button"
                    aria-pressed={active}
                    onClick={() => setKey(s.key)}
                    className={`flex w-full items-center gap-3 rounded-ctl px-3 py-2 text-left transition-colors max-lg:h-9 max-lg:rounded-full max-lg:border max-lg:py-0 ${
                      active
                        ? "bg-brand-50 ring-1 ring-brand-200 max-lg:border-brand-700 max-lg:bg-brand-700 max-lg:text-white max-lg:ring-0 dark:bg-brand-950/60 dark:ring-brand-800 max-lg:dark:border-brand-300 max-lg:dark:bg-brand-300 max-lg:dark:text-brand-950"
                        : "hover:bg-stone-50 max-lg:border-line dark:hover:bg-stone-800/50"
                    }`}
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium whitespace-nowrap">{s.name}</span>
                      <span className="hidden text-xs text-muted tabular-nums lg:block">
                        {formatNumber(s.points[0].value)} → {formatNumber(s.points[s.points.length - 1].value)} {s.unit}
                      </span>
                    </span>
                    <span className="hidden lg:block">
                      {story.good ? (
                        <CheckCircle2 aria-label="Back in range" className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <TriangleAlert aria-label="Still out of range" className="h-4 w-4 text-coral-500" />
                      )}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="min-w-0 px-4 py-5 sm:px-6 sm:py-6">
          <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
            <p className="text-lg font-semibold tracking-[-0.01em]">{series.name}</p>
            <p className="text-sm text-muted tabular-nums">
              {formatNumber(first.value)} in {formatShortDate(first.date)}
              <ArrowRight aria-hidden className="mx-1.5 inline h-3.5 w-3.5 align-[-2px]" />
              <span className="font-semibold text-foreground">
                {formatNumber(last.value)} {series.unit}
              </span>{" "}
              in {formatShortDate(last.date)}
            </p>
          </div>
          <p className={`mt-1 text-sm ${storyOf(series).good ? "text-emerald-700 dark:text-emerald-300" : "text-rose-700 dark:text-rose-300"}`}>
            {storyOf(series).text.replace(/^./, (c) => c.toUpperCase())}
          </p>
          <div className="mt-4">
            <TrendChart key={series.key} series={series} />
          </div>
          <p className="mt-3 text-[13px] text-muted">
            The shaded band is the normal range. Each dot is one report; hover or tap it to see what that lab printed.
          </p>
        </div>
      </div>
    </div>
  );
}
