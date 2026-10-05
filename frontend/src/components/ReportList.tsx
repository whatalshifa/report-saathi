"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { listReports, type ReportSummary } from "@/lib/api";
import { formatDate } from "@/lib/format";

const STATUS_LABEL: Record<ReportSummary["status"], string> = {
  queued: "Waiting",
  processing: "Reading…",
  done: "Ready",
  failed: "Failed",
};

export function ReportList() {
  const [reports, setReports] = useState<ReportSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listReports()
      .then(setReports)
      .catch(() => setError("Could not reach the server. Is the backend running?"));
  }, []);

  if (error) return <p className="text-sm text-rose-700 dark:text-rose-300">{error}</p>;
  if (reports === null) return <p className="text-sm text-slate-500">Loading…</p>;
  if (reports.length === 0) return <p className="text-sm text-slate-500">No reports yet.</p>;

  return (
    <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
      {reports.map((report) => (
        <li key={report.id}>
          <Link
            href={`/reports/${report.id}`}
            className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/60"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{report.lab_name ?? report.filename}</p>
              <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                {[report.patient_name, formatDate(report.report_date ?? report.created_at)]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <span
              className={`shrink-0 text-sm ${report.status === "failed" ? "text-rose-700 dark:text-rose-300" : "text-slate-500"}`}
            >
              {STATUS_LABEL[report.status]}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
