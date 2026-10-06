"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { FlagBadge } from "@/components/FlagBadge";
import { ErrorNote, SkeletonPage } from "@/components/Skeleton";
import { TrendChart } from "@/components/TrendChart";
import { TypicalRangeNote } from "@/components/TypicalRangeNote";
import {
  getTrends,
  isOutOfRange,
  requestBrief,
  type Flag,
  type RecheckDue,
  type TimelineSummary,
  type TrendSeries,
} from "@/lib/api";
import { formatAge, formatDate, formatNumber, formatRange, formatSex, possessive } from "@/lib/format";
import { usePoll } from "@/lib/usePoll";

export function TimelineView({ profileId }: { profileId: string }) {
  const router = useRouter();
  const load = useCallback(() => getTrends(profileId), [profileId]);
  const { data: trends, error } = usePoll(load, () => false);
  const [briefError, setBriefError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  async function startBrief() {
    setStarting(true);
    setBriefError(null);
    try {
      const brief = await requestBrief(profileId);
      router.push(`/briefs/${brief.id}`);
    } catch (err) {
      setBriefError(err instanceof Error ? err.message : "Could not start the brief");
      setStarting(false);
    }
  }

  if (error) return <ErrorNote message={error} />;
  if (!trends) return <SkeletonPage cards={4} />;

  const { profile: person, series } = trends;
  const charted = series.filter((s) => s.points.length > 1);
  const single = series.filter((s) => s.points.length === 1);
  const flagged = series.filter((s) => isOutOfRange(s.latest_flag)).length;
  const improving = charted.filter((s) => direction(s) === "better" || direction(s) === "back").length;

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/?profile=${profileId}`} className="back-link">
            ← {possessive(person.name)} reports
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{person.name}</h1>
          <p className="mt-1 text-muted">
            {[formatAge(person.age), formatSex(person.sex)].filter(Boolean).join(", ")}
            {person.age || person.sex ? " · " : ""}
            {person.report_count} report{person.report_count === 1 ? "" : "s"} from {person.labs.length || 1} lab
            {person.labs.length === 1 ? "" : "s"}, {formatDate(person.first_date)} to {formatDate(person.last_date)}
          </p>
        </div>
        <div className="text-right">
          <button
            onClick={startBrief}
            disabled={starting}
            className="btn btn-primary"
          >
            {starting ? "Starting…" : "Prepare doctor brief"}
          </button>
          {briefError && <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{briefError}</p>}
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Tests tracked" value={series.length} />
        <Stat label="Outside range now" value={flagged} tone={flagged > 0 ? "warn" : undefined} />
        <Stat label="Improving" value={improving} tone={improving > 0 ? "good" : undefined} />
        <Stat label="Reports" value={person.report_count} />
      </section>
      <p className="-mt-4 text-sm text-muted">
        &ldquo;Now&rdquo; means each test&apos;s latest reading. Values from different labs are converted to one unit
        so they can be compared.
      </p>

      {trends.rechecks && trends.rechecks.length > 0 && <RecheckCard person={person} due={trends.rechecks} />}

      {charted.length > 0 && (
        <section className="grid gap-4 md:grid-cols-2">
          {charted.map((s) => (
            <TrendCard key={s.key} series={s} />
          ))}
        </section>
      )}

      {single.length > 0 && (
        <section>
          <h2 className="mb-1 text-lg font-semibold">Measured once so far</h2>
          <p className="mb-3 text-sm text-muted">A trend appears once a test shows up in a second report.</p>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-muted dark:bg-slate-800/60">
                <tr>
                  <th className="px-4 py-2 font-medium">Test</th>
                  <th className="px-4 py-2 font-medium">Value</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {single.map((s) => (
                  <tr key={s.key}>
                    <td className="px-4 py-2.5">{s.name}</td>
                    <td className="px-4 py-2.5 tabular-nums">
                      {formatNumber(s.points[0].value)} <span className="text-muted">{s.unit}</span>
                    </td>
                    <td className="px-4 py-2.5 text-muted">{formatDate(s.points[0].date)}</td>
                    <td className="px-4 py-2.5">
                      <FlagBadge flag={s.latest_flag} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {series.length === 0 && (
        <p className="text-muted">None of the tests on these reports are ones we can track over time yet.</p>
      )}
    </div>
  );
}

function TrendCard({ series }: { series: TrendSeries }) {
  const latest = series.points[series.points.length - 1];
  const previous = series.points[series.points.length - 2];

  return (
    <article className="card p-5">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-semibold">{series.name}</h3>
        <FlagBadge flag={series.latest_flag} />
      </div>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <span className="text-2xl font-semibold tabular-nums">{formatNumber(latest.value)}</span>
        <span className="text-sm text-muted">{series.unit}</span>
        {series.change !== null && series.change_pct !== null && (
          <span className="text-sm text-muted">
            {series.change > 0 ? "▲" : series.change < 0 ? "▼" : "■"} {Math.abs(series.change_pct)}% since{" "}
            {formatDate(previous.date)}
          </span>
        )}
      </p>
      <DirectionNote series={series} />
      <p className="mb-3 text-sm text-muted">
        Normal: {formatRange(series.ref_low, series.ref_high, null)} {series.unit}
        <TypicalRangeNote rangeSource={series.range_source} />
      </p>
      <TrendChart series={series} />
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-muted hover:text-slate-700 dark:hover:text-slate-300">
          Show as table
        </summary>
        <table className="mt-2 w-full">
          <thead className="text-left text-muted">
            <tr>
              <th className="py-1 font-medium">Date</th>
              <th className="py-1 font-medium">Lab printed</th>
              <th className="py-1 font-medium">In {series.unit}</th>
              <th className="py-1 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {series.points.map((p) => (
              <tr key={p.report_id} className="border-t border-slate-100">
                <td className="py-1.5">
                  <Link href={`/reports/${p.report_id}`} className="text-teal-700 hover:underline dark:text-teal-400">
                    {formatDate(p.date)}
                  </Link>
                </td>
                <td className="py-1.5">{p.printed}</td>
                <td className="py-1.5 tabular-nums">{formatNumber(p.value)}</td>
                <td className="py-1.5">
                  <FlagBadge flag={p.flag} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </article>
  );
}

const FLAG_WORD: Partial<Record<Flag, string>> = { high: "high", low: "low" };

/** "about 3 months", "about a month", "about 6 weeks". */
function interval(months: number): string {
  if (!Number.isInteger(months)) return `about ${Math.round(months * 4)} weeks`;
  return months === 1 ? "about a month" : `about ${months} months`;
}

/**
 * Tests whose latest reading was out of range a while ago. Worded as a nudge to ask the doctor,
 * never as advice: the interval is what guidelines say doctors often do, and its source is shown.
 */
function RecheckCard({ person, due }: { person: TimelineSummary; due: RecheckDue[] }) {
  const whose = person.relation === "self" ? "Your" : possessive(person.name);
  return (
    <section
      aria-labelledby="recheck-heading"
      className="rounded-xl border border-amber-300 bg-amber-50 p-5 dark:border-amber-800 dark:bg-amber-950/40"
    >
      <h2 id="recheck-heading" className="text-lg font-semibold text-amber-950 dark:text-amber-100">
        Due for a recheck
      </h2>
      <ul className="mt-3 space-y-3">
        {due.map((d) => (
          <li key={d.key}>
            <p className="text-amber-950 dark:text-amber-100">
              {whose} {d.name} was {FLAG_WORD[d.flag] ?? "outside the normal range"} on {formatDate(d.last_date)}.
              Doctors often recheck it after {interval(d.months)}. Ask your doctor whether it&apos;s time.
            </p>
            <p className="mt-0.5 text-xs text-amber-900/75 dark:text-amber-200/70">Source: {d.source}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

type Direction = "better" | "back" | "worse" | "steady-in" | "steady-out";

/** How far a value sits outside its normal range (0 when inside it). */
function distanceOutside(value: number, low: number | null, high: number | null): number {
  if (low !== null && value < low) return low - value;
  if (high !== null && value > high) return value - high;
  return 0;
}

/** Whether the latest reading moved towards or away from the normal range. */
function direction(series: TrendSeries): Direction | null {
  const n = series.points.length;
  if (n < 2 || (series.ref_low === null && series.ref_high === null)) return null;
  const before = distanceOutside(series.points[n - 2].value, series.ref_low, series.ref_high);
  const now = distanceOutside(series.points[n - 1].value, series.ref_low, series.ref_high);
  if (now === 0) return before > 0 ? "back" : "steady-in";
  if (now < before) return "better";
  if (now > before) return "worse";
  return "steady-out";
}

const DIRECTION_TEXT: Record<Direction, { text: string; className: string }> = {
  back: { text: "Back in the normal range", className: "text-emerald-700 dark:text-emerald-300" },
  better: { text: "Moving towards the normal range", className: "text-emerald-700 dark:text-emerald-300" },
  worse: { text: "Moving further from the normal range", className: "text-amber-700 dark:text-amber-300" },
  "steady-in": { text: "Staying in the normal range", className: "text-muted" },
  "steady-out": { text: "No change, still outside the range", className: "text-muted" },
};

function DirectionNote({ series }: { series: TrendSeries }) {
  const d = direction(series);
  if (!d) return null;
  const { text, className } = DIRECTION_TEXT[d];
  return <p className={`mt-1 text-sm font-medium ${className}`}>{text}</p>;
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "good" | "warn" }) {
  const color =
    tone === "good" ? "text-emerald-700 dark:text-emerald-300" : tone === "warn" ? "text-rose-700 dark:text-rose-300" : "";
  return (
    <div className="card p-4">
      <p className={`text-2xl font-bold tabular-nums sm:text-3xl ${color}`}>{value}</p>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}
