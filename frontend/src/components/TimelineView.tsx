"use client";

import { ArrowDown, ArrowUp, CalendarClock, FileText, Minus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { FlagBadge } from "@/components/FlagBadge";
import { PageHeader } from "@/components/PageHeader";
import { useSelectPerson } from "@/components/shell/ShellContext";
import { ErrorNote, SkeletonPage } from "@/components/Skeleton";
import { StatCard, StatRow } from "@/components/StatCard";
import { LoadError } from "@/components/StatusPanel";
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
import { direction, type Direction } from "@/lib/trends";
import { usePoll } from "@/lib/usePoll";

export function TimelineView({ profileId }: { profileId: string }) {
  const router = useRouter();
  useSelectPerson(profileId);
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

  if (error) return <LoadError message={error} />;
  if (!trends) return <SkeletonPage cards={4} />;

  const { profile: person, series } = trends;
  const charted = series.filter((s) => s.points.length > 1);
  const single = series.filter((s) => s.points.length === 1);
  const flagged = series.filter((s) => isOutOfRange(s.latest_flag)).length;
  const improving = charted.filter((s) => direction(s) === "better" || direction(s) === "back").length;

  return (
    <div className="space-y-8">
      <PageHeader
        back={{ href: `/dashboard?profile=${profileId}`, label: `${possessive(person.name)} reports` }}
        eyebrow="Health timeline"
        title={person.name}
        description={
          <>
            {[formatAge(person.age), formatSex(person.sex)].filter(Boolean).join(", ")}
            {person.age || person.sex ? " · " : ""}
            {person.report_count} report{person.report_count === 1 ? "" : "s"} from {person.labs.length || 1} lab
            {person.labs.length === 1 ? "" : "s"}, {formatDate(person.first_date)} to {formatDate(person.last_date)}
          </>
        }
        actions={
          <button onClick={startBrief} disabled={starting} className="btn btn-primary">
            <FileText aria-hidden className="h-4 w-4" />
            {starting ? "Starting…" : "Prepare doctor brief"}
          </button>
        }
      />
      {briefError && <ErrorNote message={briefError} />}

      <div>
        <StatRow>
          <StatCard label="Tests tracked" value={series.length} />
          <StatCard label="Outside range now" value={flagged} tone={flagged > 0 ? "warn" : undefined} />
          <StatCard label="Improving" value={improving} tone={improving > 0 ? "good" : undefined} />
          <StatCard label="Reports" value={person.report_count} />
        </StatRow>
        <p className="mt-3 text-[13px] text-muted">
        &ldquo;Now&rdquo; means each test&apos;s latest reading. Values from different labs are converted to one unit
        so they can be compared.
        </p>
      </div>

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
          <h2 className="section-title mb-1">Measured once so far</h2>
          <p className="mb-3 text-sm text-muted">A trend appears once a test shows up in a second report.</p>
          <div className="card overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-line text-left text-xs text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Test</th>
                  <th className="px-4 py-2.5 font-medium">Value</th>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
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
        <h3 className="text-base">{series.name}</h3>
        <FlagBadge flag={series.latest_flag} />
      </div>
      <p className="mt-1 flex flex-wrap items-baseline gap-x-2">
        <span className="text-xl font-semibold tabular-nums">{formatNumber(latest.value)}</span>
        <span className="text-sm text-muted">{series.unit}</span>
        {series.change !== null && series.change_pct !== null && (
          <span className="inline-flex items-center gap-1 text-[13px] text-muted">
            {series.change > 0 ? (
              <>
                <ArrowUp aria-hidden className="h-3.5 w-3.5" />
                <span className="sr-only">Up</span>
              </>
            ) : series.change < 0 ? (
              <>
                <ArrowDown aria-hidden className="h-3.5 w-3.5" />
                <span className="sr-only">Down</span>
              </>
            ) : (
              <>
                <Minus aria-hidden className="h-3.5 w-3.5" />
                <span className="sr-only">No change</span>
              </>
            )}
            {Math.abs(series.change_pct)}% since {formatDate(previous.date)}
          </span>
        )}
      </p>
      <DirectionNote series={series} />
      <p className="mb-3 text-[13px] text-muted">
        Normal <span className="tabular-nums">{formatRange(series.ref_low, series.ref_high, null)}</span> {series.unit}
        <TypicalRangeNote rangeSource={series.range_source} />
      </p>
      <TrendChart series={series} />
      <details className="mt-3 text-sm">
        <summary className="w-fit cursor-pointer rounded-md font-medium text-muted hover:text-foreground">
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
              <tr key={p.report_id} className="border-t border-line">
                <td className="py-1.5">
                  <Link href={`/reports/${p.report_id}`} className="text-brand-700 hover:underline dark:text-brand-400">
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
      className="flex gap-3 rounded-card border border-amber-200 bg-amber-50/70 p-5 dark:border-amber-900 dark:bg-amber-950/30"
    >
      <CalendarClock aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-amber-800 dark:text-amber-300" />
      <div className="min-w-0">
      <h2 id="recheck-heading" className="section-title text-amber-950 dark:text-amber-100">
        Due for a recheck
      </h2>
      <ul className="mt-2 space-y-3">
        {due.map((d) => (
          <li key={d.key}>
            <p className="text-[15px] text-amber-950 dark:text-amber-100">
              {whose} {d.name} was {FLAG_WORD[d.flag] ?? "outside the normal range"} on {formatDate(d.last_date)}.
              Doctors often recheck it after {interval(d.months)}. Ask your doctor whether it&apos;s time.
            </p>
            {d.range_source === "typical" && (
              <p className="mt-0.5 text-sm text-amber-900 dark:text-amber-200">
                That report printed no normal range, so this compares it with a typical adult range, not your
                lab&apos;s.
              </p>
            )}
            <p className="mt-0.5 text-xs text-amber-900/75 dark:text-amber-200/70">Source: {d.source}</p>
          </li>
        ))}
      </ul>
      </div>
    </section>
  );
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
  return <p className={`mt-1 text-[13px] font-medium ${className}`}>{text}</p>;
}
