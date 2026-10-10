"use client";

import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  FileText,
  Lock,
  Minus,
  Plus,
  Stethoscope,
  TrendingUp,
  TriangleAlert,
} from "lucide-react";
import type { ReactNode } from "react";

import { FlagBadge } from "@/components/FlagBadge";
import { Sparkline } from "@/components/Sparkline";
import { PersonAvatar } from "@/components/shell/PersonAvatar";
import { AppLink } from "@/components/shell/ShellContext";
import {
  isOutOfRange,
  type Flag,
  type Profile,
  type RecheckDue,
  type ReportSummary,
  type Trends,
  type TrendSeries,
} from "@/lib/api";
import {
  formatAge,
  formatDate,
  formatNumber,
  formatSex,
  formatShortDate,
  possessive,
  RELATION_LABEL,
} from "@/lib/format";
import { direction, keyMarkers } from "@/lib/trends";

/** What the dashboard needs from one report: how many values are out of range, and which. */
export interface ReportGlance {
  out_of_range: number;
  total: number;
  flagged: {
    name: string;
    value_text: string;
    unit: string | null;
    flag: Flag;
    reference_text: string | null;
    ref_low: number | null;
    ref_high: number | null;
  }[];
}

export interface DashboardData {
  person: Profile;
  profiles: Profile[];
  /** Newest first; null while loading. */
  reports: ReportSummary[] | null;
  trends: Trends | null;
  glances: Record<string, ReportGlance>;
}

/**
 * One person's health at a glance: what needs attention, what got better, the key markers as small
 * trend lines, the latest report and the list of reports. Used for the sample family and for real
 * accounts alike; `side` holds the upload box (or the sign-up prompt in the sample).
 */
export function DashboardView({ data, side }: { data: DashboardData; side: ReactNode }) {
  const { person, profiles, reports, trends } = data;
  const series = trends?.series ?? [];
  const attention = series.filter((s) => isOutOfRange(s.latest_flag));
  const rechecks = trends?.rechecks ?? [];
  const backInRange = series.filter((s) => direction(s) === "back");
  const markers = keyMarkers(series, 9);
  const done = (reports ?? []).filter((r) => r.status === "done");
  const latest = done[0];
  const latestGlance = latest ? data.glances[latest.id] : undefined;

  return (
    <div className="space-y-6 lg:space-y-7">
      <PersonSwitcher profiles={profiles} selected={person.id} />
      <DashboardHeader person={person} trends={trends} />

      {person.report_count === 0 ? null : (
        <>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
            <AttentionPanel person={person} attention={attention} rechecks={rechecks} loading={!trends} />
            <ImprovedPanel person={person} improved={backInRange} loading={!trends} />
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-7">
            <section aria-labelledby="markers-heading" className="min-w-0">
              <SectionHead id="markers-heading" title="Key markers">
                <AppLink href={`/profiles/${person.id}`} className="dash-link">
                  All {possessive(person.name)} results over time
                  <ArrowRight aria-hidden className="h-3.5 w-3.5" />
                </AppLink>
              </SectionHead>
              {!trends ? (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" aria-hidden>
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="skeleton h-[134px] rounded-xl" />
                  ))}
                </div>
              ) : markers.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line px-4 py-6 text-sm text-muted">
                  Trend lines appear once a test shows up in a second report.
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 max-sm:[&>li:nth-child(n+7)]:hidden">
                  {markers.map((s) => (
                    <li key={s.key} className="min-w-0">
                      <MarkerTile series={s} href={`/profiles/${person.id}`} />
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <div className="min-w-0 space-y-6">
              {latest && <LatestReport report={latest} glance={latestGlance} />}
              <ReportsList person={person} reports={reports} glances={data.glances} />
              {side}
            </div>
          </div>
        </>
      )}

      {person.report_count === 0 && side}
    </div>
  );
}

/** On phones the sidebar is gone, so the family sits in a row of chips at the top of the dashboard. */
function PersonSwitcher({ profiles, selected }: { profiles: Profile[]; selected: string }) {
  return (
    <nav aria-label="Family members" className="-mx-4 overflow-x-auto px-4 sm:-mx-6 sm:px-6 lg:hidden">
      <ul className="flex w-max gap-2 pb-1">
        {profiles.map((p) => {
          const active = p.id === selected;
          return (
            <li key={p.id}>
              <AppLink
                href={`/dashboard?profile=${p.id}`}
                aria-current={active ? "page" : undefined}
                className={`flex h-10 items-center gap-2 rounded-full border py-1 pr-3.5 pl-1.5 text-[13px] transition-colors ${
                  active
                    ? "border-brand-600 bg-surface ring-1 ring-brand-600 ring-inset dark:border-brand-400 dark:ring-brand-400"
                    : "border-line bg-surface"
                }`}
              >
                <PersonAvatar name={p.name} />
                <span className="font-medium">{p.name}</span>
                <span className="text-muted">{p.is_sample ? "Sample" : RELATION_LABEL[p.relation]}</span>
              </AppLink>
            </li>
          );
        })}
        <li>
          <AppLink
            href="/family"
            className="flex h-10 items-center gap-1.5 rounded-full border border-dashed border-line px-3.5 text-[13px] font-medium text-muted"
          >
            <Plus aria-hidden className="h-4 w-4" />
            Add
          </AppLink>
        </li>
      </ul>
    </nav>
  );
}

function DashboardHeader({ person, trends }: { person: Profile; trends: Trends | null }) {
  const summary = trends?.profile;
  const facts = [
    formatAge(summary?.age ?? null) || (person.birth_year ? `Born ${person.birth_year}` : ""),
    formatSex(summary?.sex ?? person.sex),
    person.report_count > 0
      ? `${person.report_count} report${person.report_count === 1 ? "" : "s"}${
          summary && summary.labs.length > 1 ? ` from ${summary.labs.length} labs` : ""
        }`
      : "Nothing uploaded yet",
    person.last_report_date ? `last tested ${formatDate(person.last_report_date)}` : "",
  ].filter(Boolean);

  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3.5">
        {/* On phones the chip row above already shows who this is. */}
        <PersonAvatar name={person.name} size="lg" className="max-lg:hidden" />
        <div className="min-w-0">
          <p className="text-[13px] font-medium text-muted max-lg:hidden">
            {person.is_sample ? "Sample person" : RELATION_LABEL[person.relation]}
          </p>
          <h1 className="truncate text-[22px] leading-tight font-semibold tracking-[-0.015em] sm:text-2xl">
            {person.name}
          </h1>
          <p className="mt-0.5 text-[13px] text-muted">{facts.join(" · ")}</p>
        </div>
      </div>
      {person.report_count > 0 && (
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
          <AppLink href={`/profiles/${person.id}`} className="btn btn-secondary btn-sm">
            <Activity aria-hidden className="h-3.5 w-3.5" />
            Timeline
          </AppLink>
          <AppLink href={`/briefs?profile=${person.id}`} className="btn btn-primary btn-sm">
            <Stethoscope aria-hidden className="h-3.5 w-3.5" />
            Doctor brief
          </AppLink>
        </div>
      )}
    </header>
  );
}

function SectionHead({ id, title, children }: { id: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
      <h2 id={id} className="text-[15px] font-semibold tracking-[-0.01em]">
        {title}
      </h2>
      {children}
    </div>
  );
}

const FLAG_WORD: Partial<Record<Flag, string>> = { high: "high", low: "low" };

function rangeWords(low: number | null, high: number | null, unit: string): string {
  if (low !== null && high !== null) return `Normal ${formatNumber(low)}–${formatNumber(high)} ${unit}`;
  if (high !== null) return `Normal below ${formatNumber(high)} ${unit}`;
  if (low !== null) return `Normal above ${formatNumber(low)} ${unit}`;
  return "No normal range printed";
}

export function AttentionPanel({
  person,
  attention,
  rechecks,
  loading,
}: {
  person: Profile;
  attention: TrendSeries[];
  rechecks: RecheckDue[];
  loading: boolean;
}) {
  const count = attention.length + rechecks.length;
  return (
    <section
      aria-labelledby="attention-heading"
      className="rounded-xl border border-line bg-surface p-4 sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="attention-heading" className="flex items-center gap-2 text-[15px] font-semibold">
          {count > 0 ? (
            <TriangleAlert aria-hidden className="h-4 w-4 text-coral-500" strokeWidth={2} />
          ) : (
            <CheckCircle2 aria-hidden className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
          )}
          Needs attention
        </h2>
        {!loading && (
          <span className="text-[13px] text-muted tabular-nums">
            {count === 0 ? "Nothing right now" : `${count} item${count === 1 ? "" : "s"}`}
          </span>
        )}
      </div>

      {loading ? (
        <div className="mt-3 space-y-2" aria-hidden>
          <div className="skeleton h-14" />
        </div>
      ) : count === 0 ? (
        <p className="mt-2 text-sm text-muted">
          Every tracked test is inside its normal range on the latest reading.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-line">
          {attention.map((s) => {
            const latest = s.points[s.points.length - 1];
            const previous = s.points.length > 1 ? s.points[s.points.length - 2] : null;
            const dir = direction(s);
            return (
              <li key={s.key} className="py-2.5 first:pt-0 last:pb-0">
                <AppLink
                  href={`/profiles/${person.id}`}
                  className="group -mx-2 flex items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-stone-50 dark:hover:bg-stone-800/50"
                >
                  <span
                    aria-hidden
                    className={`h-9 w-1 shrink-0 rounded-full ${s.latest_flag === "low" ? "bg-amber-500" : "bg-coral-500"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-medium">{s.name}</span>
                      <FlagBadge flag={s.latest_flag} />
                    </span>
                    <span className="mt-0.5 block text-[13px] text-muted">
                      {rangeWords(s.ref_low, s.ref_high, s.unit)}
                      {previous && (
                        <>
                          {" · "}
                          {dir === "better" ? (
                            <span className="text-emerald-700 dark:text-emerald-300">
                              improving, was {formatNumber(previous.value)} in {formatShortDate(previous.date)}
                            </span>
                          ) : (
                            <>was {formatNumber(previous.value)} in {formatShortDate(previous.date)}</>
                          )}
                        </>
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-right">
                    <span className="block text-lg leading-tight font-semibold tabular-nums">
                      {formatNumber(latest.value)}
                    </span>
                    <span className="block text-xs text-muted">{s.unit}</span>
                  </span>
                </AppLink>
              </li>
            );
          })}
          {rechecks.map((d) => (
            <li key={`recheck-${d.key}`} className="flex items-start gap-3 py-2.5 last:pb-0">
              <CalendarClock aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
              <p className="text-[13px]">
                <span className="font-medium">Recheck due: {d.name}</span>
                <span className="text-muted">
                  {" "}
                  was {FLAG_WORD[d.flag] ?? "out of range"} on {formatDate(d.last_date)}. Ask the doctor whether it&apos;s time.
                </span>
              </p>
            </li>
          ))}
        </ul>
      )}
      {!loading && count > 0 && (
        <p className="mt-4 border-t border-line pt-3 text-[13px] text-muted">
          Worth raising at the next visit.{" "}
          <AppLink href={`/briefs?profile=${person.id}`} className="dash-link">
            Prepare a doctor brief
            <ArrowRight aria-hidden className="h-3.5 w-3.5" />
          </AppLink>
        </p>
      )}
    </section>
  );
}

export function ImprovedPanel({ person, improved, loading }: { person: Profile; improved: TrendSeries[]; loading: boolean }) {
  return (
    <section aria-labelledby="improved-heading" className="rounded-xl border border-line bg-surface p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="improved-heading" className="flex items-center gap-2 text-[15px] font-semibold">
          <TrendingUp aria-hidden className="h-4 w-4 text-emerald-600 dark:text-emerald-400" strokeWidth={2} />
          Back in range
        </h2>
        {!loading && (
          <span className="text-[13px] text-muted tabular-nums">since the report before</span>
        )}
      </div>
      {loading ? (
        <div className="skeleton mt-3 h-14" aria-hidden />
      ) : improved.length === 0 ? (
        <p className="mt-2 text-sm text-muted">No test moved back into its normal range on the latest report.</p>
      ) : (
        <ul className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {improved.map((s) => (
            <li key={s.key}>
              <AppLink
                href={`/profiles/${person.id}`}
                className="inline-flex h-7 items-center gap-1.5 rounded-full bg-emerald-50 whitespace-nowrap px-2.5 text-[13px] text-emerald-900 ring-1 ring-emerald-600/15 ring-inset hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-100 dark:ring-emerald-400/20 dark:hover:bg-emerald-950"
              >
                <CheckCircle2 aria-hidden className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                {s.name}
                <span className="text-emerald-800/80 tabular-nums dark:text-emerald-200/80">
                  {formatNumber(s.points[s.points.length - 1].value)}
                </span>
              </AppLink>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

const STATUS_TEXT: Record<Flag, { word: string; dot: string; text: string }> = {
  normal: { word: "In range", dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-300" },
  high: { word: "High", dot: "bg-coral-500", text: "text-rose-700 dark:text-rose-300" },
  low: { word: "Low", dot: "bg-amber-500", text: "text-amber-800 dark:text-amber-300" },
  abnormal: { word: "Abnormal", dot: "bg-coral-500", text: "text-rose-700 dark:text-rose-300" },
  unknown: { word: "No range", dot: "bg-stone-400", text: "text-muted" },
};

export function MarkerTile({ series, href }: { series: TrendSeries; href: string }) {
  const latest = series.points[series.points.length - 1];
  const previous = series.points[series.points.length - 2];
  const status = STATUS_TEXT[series.latest_flag];
  const dir = direction(series);
  const good = dir === "better" || dir === "back";
  const Arrow = series.change && series.change > 0 ? ArrowUpRight : series.change && series.change < 0 ? ArrowDownRight : Minus;
  return (
    <AppLink
      href={href}
      className="group flex h-full flex-col rounded-xl border border-line bg-surface p-3.5 transition-colors hover:border-brand-300 dark:hover:border-brand-800"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-[13px] font-medium">{series.name}</span>
        <span className={`flex shrink-0 items-center gap-1 pt-1 text-[11.5px] leading-none font-medium ${status.text}`}>
          <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {/* In range is the usual case: a dot says it; out of range is spelled out. */}
          <span className={series.latest_flag === "normal" ? "sr-only" : ""}>{status.word}</span>
        </span>
      </span>
      <span className="mt-1 flex items-baseline gap-1">
        <span className="text-[22px] leading-none font-semibold tracking-tight tabular-nums">
          {formatNumber(latest.value)}
        </span>
        <span className="truncate text-xs text-muted">{series.unit}</span>
      </span>
      <Sparkline series={series} className="mt-3 mb-2 h-9" />
      <span className="mt-auto flex items-center justify-between gap-2 text-[11.5px] text-muted">
        {series.change_pct !== null && previous ? (
          <span className={`inline-flex items-center gap-0.5 tabular-nums ${good ? "text-emerald-700 dark:text-emerald-300" : ""}`}>
            <Arrow aria-hidden className="h-3.5 w-3.5" />
            <span className="sr-only">{series.change! > 0 ? "Up" : series.change! < 0 ? "Down" : "No change"}</span>
            {Math.abs(series.change_pct)}% since {monthOf(previous.date, latest.date)}
          </span>
        ) : (
          <span />
        )}
      </span>
    </AppLink>
  );
}

/** "Apr", or "Apr 2025" when the earlier reading was in another year. */
function monthOf(date: string, latest: string): string {
  const d = new Date(date);
  const sameYear = d.getFullYear() === new Date(latest).getFullYear();
  return d.toLocaleDateString("en-IN", sameYear ? { month: "short" } : { month: "short", year: "numeric" });
}

export function LatestReport({ report, glance }: { report: ReportSummary; glance?: ReportGlance }) {
  return (
    <section aria-labelledby="latest-heading" className="rounded-xl border border-line bg-surface">
      <div className="border-b border-line px-4 py-3.5">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="latest-heading" className="text-[15px] font-semibold">
            Latest report
          </h2>
          <span className="text-[13px] text-muted tabular-nums">{formatDate(report.report_date ?? report.created_at)}</span>
        </div>
        <p className="mt-0.5 truncate text-[13px] text-muted">{report.lab_name ?? report.filename}</p>
      </div>
      <div className="px-4 py-3.5">
        {glance ? (
          <>
            <p className="text-sm">
              <span className="font-semibold tabular-nums">{glance.out_of_range}</span>
              <span className="text-muted"> of {glance.total} values outside the normal range</span>
            </p>
            <div aria-hidden className="mt-2 flex h-1.5 gap-px overflow-hidden rounded-full">
              {Array.from({ length: glance.total }, (_, i) => (
                <span
                  key={i}
                  className={`flex-1 ${i < glance.out_of_range ? "bg-coral-500" : "bg-emerald-500/35 dark:bg-emerald-400/30"}`}
                />
              ))}
            </div>
            {glance.flagged.length > 0 && (
              <ul className="mt-3 space-y-2">
                {glance.flagged.slice(0, 4).map((r) => (
                  <li key={r.name} className="flex items-center justify-between gap-3 text-[13px]">
                    <span className="min-w-0 truncate">{r.name}</span>
                    <span className="flex shrink-0 items-center gap-2">
                      <span className="tabular-nums">
                        <span className="font-semibold">{r.value_text}</span> <span className="text-muted">{r.unit}</span>
                      </span>
                      <FlagBadge flag={r.flag} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <div className="space-y-2" aria-hidden>
            <div className="skeleton h-4 w-2/3" />
            <div className="skeleton h-1.5" />
          </div>
        )}
        <AppLink href={`/reports/${report.id}`} className="dash-link mt-3.5">
          Open the full report
          <ArrowRight aria-hidden className="h-3.5 w-3.5" />
        </AppLink>
      </div>
    </section>
  );
}

const STATUS_BADGE: Record<ReportSummary["status"], { label: string; className: string } | null> = {
  queued: { label: "Waiting", className: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300" },
  processing: { label: "Reading…", className: "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200" },
  done: null,
  failed: { label: "Couldn't read", className: "bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200" },
};

function ReportsList({
  person,
  reports,
  glances,
}: {
  person: Profile;
  reports: ReportSummary[] | null;
  glances: Record<string, ReportGlance>;
}) {
  return (
    <section aria-labelledby="reports-heading">
      <SectionHead id="reports-heading" title={`${possessive(person.name)} reports`}>
        <AppLink href="/reports" className="dash-link">
          All reports
        </AppLink>
      </SectionHead>
      {reports === null ? (
        <div className="space-y-2" aria-hidden>
          <div className="skeleton h-14" />
          <div className="skeleton h-14" />
        </div>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
          {reports.slice(0, 5).map((report) => {
            const status = STATUS_BADGE[report.status];
            const glance = glances[report.id];
            return (
              <li key={report.id}>
                <AppLink
                  href={`/reports/${report.id}`}
                  className="group flex items-center gap-3 px-3.5 py-3 transition-colors hover:bg-stone-50 focus-visible:-outline-offset-2 dark:hover:bg-stone-800/50"
                >
                  <FileText aria-hidden className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.75} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-medium">{report.lab_name ?? report.filename}</span>
                    <span className="block text-xs text-muted tabular-nums">
                      {formatDate(report.report_date ?? report.created_at)}
                    </span>
                  </span>
                  {status ? (
                    <span className={`badge shrink-0 ${status.className}`}>{status.label}</span>
                  ) : glance ? (
                    <span
                      className={`shrink-0 text-xs tabular-nums ${
                        glance.out_of_range > 0 ? "font-medium text-rose-700 dark:text-rose-300" : "text-muted"
                      }`}
                    >
                      {glance.out_of_range > 0 ? `${glance.out_of_range} flagged` : "All normal"}
                    </span>
                  ) : null}
                  <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-stone-400 dark:text-stone-500" />
                </AppLink>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** The small print under the side column. */
export function PrivateNote() {
  return (
    <p className="flex gap-2 px-1 text-xs text-muted">
      <Lock aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      Files are encrypted before they&apos;re stored, and only your account can open them.
    </p>
  );
}
