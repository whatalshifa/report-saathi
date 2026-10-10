"use client";

import { ChevronRight } from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { SkeletonList } from "@/components/Skeleton";
import { LoadError, StatusPanel } from "@/components/StatusPanel";
import { PersonAvatar } from "@/components/shell/PersonAvatar";
import { AppLink, useShell } from "@/components/shell/ShellContext";
import { listReports, type ReportSummary } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { usePoll } from "@/lib/usePoll";

const STATUS: Record<ReportSummary["status"], string> = {
  queued: "Waiting",
  processing: "Reading…",
  done: "Read",
  failed: "Couldn't read",
};

const loadAll = () => listReports();

/** Every report in the family, newest first, with a filter for one person. */
export function ReportsIndex() {
  const { profiles } = useShell();
  const { data: reports, error, reload } = usePoll(loadAll, () => false);
  const [only, setOnly] = useState<string | null>(null);

  if (error) return <LoadError message={error} onRetry={reload} />;
  const names = new Map((profiles ?? []).map((p) => [p.id, p.name]));
  const shown = (reports ?? []).filter((r) => !only || r.profile_id === only);
  const sorted = [...shown].sort((a, b) =>
    (b.report_date ?? b.created_at).localeCompare(a.report_date ?? a.created_at),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports"
        description="Every lab report in the family, newest first. Open one to see each value, its range and an explanation."
      />

      {profiles && profiles.length > 1 && (
        <div role="group" aria-label="Show reports for" className="flex flex-wrap gap-1.5">
          {[{ id: null, name: "Everyone" }, ...profiles.map((p) => ({ id: p.id as string | null, name: p.name }))].map(
            (p) => (
              <button
                key={p.id ?? "all"}
                type="button"
                aria-pressed={only === p.id}
                onClick={() => setOnly(p.id)}
                className={`h-8 rounded-full border px-3 text-[13px] font-medium transition-colors ${
                  only === p.id
                    ? "border-brand-700 bg-brand-700 text-white dark:border-brand-300 dark:bg-brand-300 dark:text-brand-950"
                    : "border-line bg-surface text-muted hover:text-foreground"
                }`}
              >
                {p.name}
              </button>
            ),
          )}
        </div>
      )}

      {!reports ? (
        <SkeletonList rows={4} />
      ) : sorted.length === 0 ? (
        <StatusPanel tone="empty" title="No reports yet" heading="p">
          Reports you add from a person&apos;s dashboard show up here.
        </StatusPanel>
      ) : (
        <div className="overflow-hidden rounded-xl border border-line bg-surface">
          <div className="hidden grid-cols-[7.5rem_minmax(0,1fr)_12rem_7rem_1rem] gap-4 border-b border-line px-4 py-2.5 text-xs font-medium text-muted md:grid">
            <span>Date</span>
            <span>Lab</span>
            <span>Person</span>
            <span>Status</span>
            <span />
          </div>
          <ul className="divide-y divide-line">
            {sorted.map((r) => {
              const name = names.get(r.profile_id) ?? "";
              return (
                <li key={r.id}>
                  <AppLink
                    href={`/reports/${r.id}`}
                    className="grid grid-cols-[minmax(0,1fr)_1rem] items-center gap-x-4 gap-y-0.5 px-4 py-3 text-sm transition-colors hover:bg-stone-50 focus-visible:-outline-offset-2 md:grid-cols-[7.5rem_minmax(0,1fr)_12rem_7rem_1rem] dark:hover:bg-stone-800/50"
                  >
                    <span className="order-2 text-[13px] text-muted tabular-nums md:order-none md:text-sm md:text-foreground">
                      {formatDate(r.report_date ?? r.created_at)}
                      <span className="md:hidden"> · {name}</span>
                    </span>
                    <span className="order-1 truncate font-medium md:order-none">{r.lab_name ?? r.filename}</span>
                    <span className="hidden items-center gap-2 md:flex">
                      <PersonAvatar name={name} size="sm" />
                      <span className="truncate">{name}</span>
                    </span>
                    <span
                      className={`hidden md:block ${r.status === "failed" ? "text-rose-700 dark:text-rose-300" : "text-muted"}`}
                    >
                      {STATUS[r.status]}
                    </span>
                    <ChevronRight
                      aria-hidden
                      className="order-3 row-span-2 h-4 w-4 text-stone-400 md:order-none md:row-span-1 dark:text-stone-500"
                    />
                  </AppLink>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
