"use client";

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
import { IconAlert, IconArrowDownRight, IconArrowRight, IconArrowUpRight, IconCheckCircle, IconChevronRight, IconLock, IconMinus, IconPlus, IconRecheck, IconReport, IconStethoscope, IconTimeline, IconTrendUp } from "@/components/icons";

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
                  <IconArrowRight aria-hidden className="h-3.5 w-3.5" />
                </AppLink>
              </SectionHead>
              {!trends ? (
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3" aria-hidden>
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="skeleton h-[150px] rounded-card" />
                  ))}
                </div>
              ) : markers.length === 0 ? (
                <p className="rounded-card bg-tint px-4 py-6 text-sm text-muted">
                  Trend lines appear once a test shows up in a second report.
                </p>
              ) : (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 max-sm:[&>li:nth-child(n+7)]:hidden">
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
                className={`flex h-11 items-center gap-2 rounded-full py-1 pr-4 pl-1 text-[13px] transition ${
                  active ? "bg-surface shadow-soft" : "bg-tint"
                }`}
              >
                <PersonAvatar name={p.name} size="chip" ring={active} />
                <span className="font-semibold">{p.name}</span>
                <span className="text-muted">{p.is_sample ? "Sample" : RELATION_LABEL[p.relation]}</span>
              </AppLink>
            </li>
          );
        })}
        <li>
          <AppLink
            href="/family"
            className="flex h-11 items-center gap-1.5 rounded-full bg-tint-coral pr-4 pl-3 text-[13px] font-bold text-coral-800 [--duo:var(--duo-coral)] dark:text-coral-200"
          >
            <IconPlus aria-hidden className="h-5 w-5" />
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
          <p className="text-[13px] font-semibold text-muted max-lg:hidden">
            {person.is_sample ? "Sample person" : RELATION_LABEL[person.relation]}
          </p>
          <h1 className="truncate text-[28px] leading-tight font-extrabold tracking-[-0.03em] sm:text-[34px]">
            {person.name}
          </h1>
          <p className="mt-0.5 text-[13px] text-muted">{facts.join(" · ")}</p>
        </div>
      </div>
      {person.report_count > 0 && (
        <div className="grid shrink-0 grid-cols-2 gap-2 sm:flex">
          <AppLink href={`/profiles/${person.id}`} className="btn btn-secondary">
            <IconTimeline aria-hidden className="h-[18px] w-[18px]" />
            Timeline
          </AppLink>
          <AppLink href={`/briefs?profile=${person.id}`} className="btn btn-primary">
            <IconStethoscope aria-hidden className="h-[18px] w-[18px]" />
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
      <h2 id={id} className="text-lg font-bold tracking-[-0.015em]">
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
      className="card p-5 sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 id="attention-heading" className="flex items-center gap-2.5 text-[17px] font-bold">
          {count > 0 ? (
            <span className="grid h-9 w-9 place-items-center rounded-full bg-tint-coral text-coral-600 [--duo:var(--duo-coral)] dark:text-coral-300">
              <IconAlert aria-hidden className="h-5 w-5" />
            </span>
          ) : (
            <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <IconCheckCircle aria-hidden className="h-5 w-5" />
            </span>
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
        <ul className="mt-4 space-y-1.5">
          {attention.map((s) => {
            const latest = s.points[s.points.length - 1];
            const previous = s.points.length > 1 ? s.points[s.points.length - 2] : null;
            const dir = direction(s);
            return (
              <li key={s.key}>
                <AppLink
                  href={`/profiles/${person.id}`}
                  className="group flex items-center gap-3 rounded-[18px] bg-tint px-3 py-2.5 transition-colors hover:bg-tint-strong"
                >
                  <span
                    aria-hidden
                    className={`h-10 w-1.5 shrink-0 rounded-full ${s.latest_flag === "low" ? "bg-amber-500" : "bg-coral-500"}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="font-semibold">{s.name}</span>
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
                    <span className="block text-xl leading-tight font-extrabold tabular-nums">
                      {formatNumber(latest.value)}
                    </span>
                    <span className="block text-xs text-muted">{s.unit}</span>
                  </span>
                </AppLink>
              </li>
            );
          })}
          {rechecks.map((d) => (
            <li key={`recheck-${d.key}`} className="flex items-start gap-3 rounded-[18px] bg-amber-50 px-3 py-2.5 dark:bg-amber-950/40">
              <IconRecheck aria-hidden className="mt-0.5 h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300" />
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
        <p className="mt-4 text-[13px] text-muted">
          Worth raising at the next visit.{" "}
          <AppLink href={`/briefs?profile=${person.id}`} className="dash-link">
            Prepare a doctor brief
            <IconArrowRight aria-hidden className="h-3.5 w-3.5" />
          </AppLink>
        </p>
      )}
    </section>
  );
}

export function ImprovedPanel({ person, improved, loading }: { person: Profile; improved: TrendSeries[]; loading: boolean }) {
  return (
    <section aria-labelledby="improved-heading" className="card p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="improved-heading" className="flex items-center gap-2.5 text-[17px] font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <IconTrendUp aria-hidden className="h-5 w-5" />
          </span>
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
                className="inline-flex h-9 items-center gap-1.5 rounded-full bg-emerald-50 whitespace-nowrap pr-3.5 pl-2 text-[13px] font-semibold text-emerald-900 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-100 dark:ring-emerald-400/20 dark:hover:bg-emerald-950"
              >
                <IconCheckCircle aria-hidden className="h-[18px] w-[18px] text-emerald-600 dark:text-emerald-400" />
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
  const Arrow = series.change && series.change > 0 ? IconArrowUpRight : series.change && series.change < 0 ? IconArrowDownRight : IconMinus;
  return (
    <AppLink
      href={href}
      className="group flex h-full flex-col card p-4 transition hover:-translate-y-0.5 hover:shadow-lift"
    >
      <span className="flex items-start justify-between gap-2">
        <span className="min-w-0 truncate text-[13.5px] font-semibold">{series.name}</span>
        <span className={`flex shrink-0 items-center gap-1 pt-1 text-[11.5px] leading-none font-medium ${status.text}`}>
          <span aria-hidden className={`h-2 w-2 rounded-full ${status.dot}`} />
          {/* In range is the usual case: a dot says it; out of range is spelled out. */}
          <span className={series.latest_flag === "normal" ? "sr-only" : ""}>{status.word}</span>
        </span>
      </span>
      <span className="mt-1 flex items-baseline gap-1">
        <span className="text-[26px] leading-none font-extrabold tracking-tight tabular-nums">
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
    <section aria-labelledby="latest-heading" className="card overflow-hidden">
      <div className="bg-tint-coral px-5 py-4">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="latest-heading" className="text-[17px] font-bold">
            Latest report
          </h2>
          <span className="text-[13px] text-muted tabular-nums">{formatDate(report.report_date ?? report.created_at)}</span>
        </div>
        <p className="mt-0.5 truncate text-[13px] text-muted">{report.lab_name ?? report.filename}</p>
      </div>
      <div className="px-5 py-4">
        {glance ? (
          <>
            <p className="text-sm">
              <span className="font-semibold tabular-nums">{glance.out_of_range}</span>
              <span className="text-muted"> of {glance.total} values outside the normal range</span>
            </p>
            <div aria-hidden className="mt-2.5 flex h-2.5 gap-[3px] overflow-hidden">
              {Array.from({ length: glance.total }, (_, i) => (
                <span
                  key={i}
                  className={`flex-1 rounded-full ${i < glance.out_of_range ? "bg-coral-500" : "bg-emerald-500/35 dark:bg-emerald-400/30"}`}
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
          <IconArrowRight aria-hidden className="h-3.5 w-3.5" />
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
        <ul className="space-y-1.5">
          {reports.slice(0, 5).map((report) => {
            const status = STATUS_BADGE[report.status];
            const glance = glances[report.id];
            return (
              <li key={report.id}>
                <AppLink
                  href={`/reports/${report.id}`}
                  className="group flex items-center gap-3 rounded-full bg-surface py-2 pr-4 pl-2 shadow-soft transition hover:-translate-y-px"
                >
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-tint text-brand-700 [--duo:var(--duo-coral)] dark:text-brand-300">
                    <IconReport aria-hidden className="h-[18px] w-[18px]" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold">{report.lab_name ?? report.filename}</span>
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
                  <IconChevronRight aria-hidden className="h-4 w-4 shrink-0 text-muted" />
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
    <p className="flex gap-2.5 px-2 text-[13px] text-muted">
      <IconLock aria-hidden className="h-[18px] w-[18px] shrink-0 text-brand-600 dark:text-brand-300" />
      Files are encrypted before they&apos;re stored, and only your account can open them.
    </p>
  );
}
