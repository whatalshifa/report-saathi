"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ErrorNote, SkeletonList } from "@/components/Skeleton";
import { StatusPanel } from "@/components/StatusPanel";
import { listReports, type ReportSummary } from "@/lib/api";
import { formatDate } from "@/lib/format";

// A read report needs no label (it is the usual case); only the others say where they are.
const STATUS: Record<ReportSummary["status"], { label: string; className: string } | null> = {
  queued: { label: "Waiting", className: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300" },
  processing: { label: "Reading…", className: "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200" },
  done: null,
  failed: { label: "Couldn't read", className: "bg-rose-50 text-rose-800 dark:bg-rose-950 dark:text-rose-200" },
};

export function ReportList({ profileId }: { profileId: string }) {
  const [reports, setReports] = useState<ReportSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listReports(profileId)
      .then(setReports)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load the reports"));
  }, [profileId]);

  if (error) return <ErrorNote message={error} />;
  if (reports === null) return <SkeletonList />;
  if (reports.length === 0) {
    return (
      <StatusPanel tone="empty" title="No reports yet" heading="p">
        Reports you add for this person will show up here, newest first.
      </StatusPanel>
    );
  }

  return (
    <ul className="card divide-y divide-line overflow-hidden">
      {reports.map((report) => {
        const status = STATUS[report.status];
        return (
          <li key={report.id}>
            <Link
              href={`/reports/${report.id}`}
              className="group flex items-center gap-4 px-4 py-4 transition-colors hover:bg-stone-50 focus-visible:-outline-offset-2 sm:px-5 dark:hover:bg-stone-800/50"
            >
              <span
                aria-hidden
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
                  />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-medium break-words">{report.lab_name ?? report.filename}</p>
                <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-sm text-muted">
                  <span className="tabular-nums whitespace-nowrap">
                    {formatDate(report.report_date ?? report.created_at)}
                  </span>
                  {report.patient_name && (
                    <>
                      <span aria-hidden>·</span>
                      <span className="min-w-0 truncate">{report.patient_name}</span>
                    </>
                  )}
                </p>
              </div>
              {status && <span className={`badge shrink-0 ${status.className}`}>{status.label}</span>}
              <svg
                viewBox="0 0 20 20"
                className="h-5 w-5 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5 dark:text-stone-500"
                fill="currentColor"
                aria-hidden
              >
                <path
                  fillRule="evenodd"
                  d="M8.22 5.22a.75.75 0 0 1 1.06 0l4.25 4.25a.75.75 0 0 1 0 1.06l-4.25 4.25a.75.75 0 0 1-1.06-1.06L11.94 10 8.22 6.28a.75.75 0 0 1 0-1.06Z"
                  clipRule="evenodd"
                />
              </svg>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
