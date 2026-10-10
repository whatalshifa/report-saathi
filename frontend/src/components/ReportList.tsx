"use client";

import { ChevronRight, FileText } from "lucide-react";
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
              className="group flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-stone-50 focus-visible:-outline-offset-2 sm:px-5 dark:hover:bg-stone-800/50"
            >
              <span
                aria-hidden
                className="grid h-9 w-9 shrink-0 place-items-center rounded-ctl bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
              >
                <FileText className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-[15px] font-medium break-words">{report.lab_name ?? report.filename}</p>
                <p className="mt-0.5 flex flex-wrap gap-x-1.5 text-[13px] text-muted">
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
              <ChevronRight
                aria-hidden
                className="h-4 w-4 shrink-0 text-stone-400 transition-transform group-hover:translate-x-0.5 dark:text-stone-500"
              />
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
