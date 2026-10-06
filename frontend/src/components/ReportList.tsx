"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ErrorNote, SkeletonList } from "@/components/Skeleton";
import { listReports, type ReportSummary } from "@/lib/api";
import { formatDate } from "@/lib/format";

const STATUS: Record<ReportSummary["status"], { label: string; className: string }> = {
  queued: { label: "Waiting", className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
  processing: { label: "Reading…", className: "bg-sky-50 text-sky-800 dark:bg-sky-950 dark:text-sky-200" },
  done: { label: "Ready", className: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" },
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
      <div className="card px-6 py-10 text-center">
        <p className="font-medium">No reports yet</p>
        <p className="mt-1 text-sm text-muted">Reports you add for this person will show up here, newest first.</p>
      </div>
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
              className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <span
                aria-hidden
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300"
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
                <p className="truncate font-medium">{report.lab_name ?? report.filename}</p>
                <p className="truncate text-sm text-muted">
                  {[report.patient_name, formatDate(report.report_date ?? report.created_at)]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${status.className}`}>
                {status.label}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
