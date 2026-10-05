"use client";

import Link from "next/link";
import { useCallback } from "react";

import { FlagBadge } from "@/components/FlagBadge";
import { getBrief, isPending, type BriefContent } from "@/lib/api";
import { formatDate, formatNumber, formatRange } from "@/lib/format";
import { usePoll } from "@/lib/usePoll";

export function BriefView({ id }: { id: string }) {
  const load = useCallback(() => getBrief(id), [id]);
  const { data: job, error } = usePoll(load, (j) => isPending(j.status));

  if (error) return <p className="text-rose-700 dark:text-rose-300">{error}</p>;
  if (!job || isPending(job.status)) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" />
        <h1 className="text-xl font-semibold">Preparing the doctor brief…</h1>
        <p className="mx-auto mt-2 max-w-md text-slate-600 dark:text-slate-400">
          Going through every report on file and summarising what changed.
        </p>
      </div>
    );
  }
  if (job.status === "failed" || !job.content) {
    return <p className="text-rose-700 dark:text-rose-300">{job.error ?? "The brief could not be written."}</p>;
  }
  return <Brief content={job.content} createdAt={job.created_at} />;
}

function Brief({ content, createdAt }: { content: BriefContent; createdAt: string }) {
  const { brief, snapshot } = content;
  const { profile: person, series } = snapshot;

  return (
    <article className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 print:border-0 print:p-0 sm:p-8 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          href={`/profiles/${person.profile_id}`}
          className="text-sm font-medium text-teal-700 dark:text-teal-400"
        >
          ← Back to timeline
        </Link>
        <button
          onClick={() => window.print()}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800"
        >
          Print or save as PDF
        </button>
      </div>

      <header className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <p className="text-sm font-semibold uppercase tracking-wide text-teal-700 dark:text-teal-400">
          Pre-visit lab summary
        </p>
        <h1 className="mt-1 text-2xl font-bold">{person.name}</h1>
        <p className="text-slate-600 dark:text-slate-400">
          {[person.age, person.sex].filter(Boolean).join(", ")}
          {person.age || person.sex ? " · " : ""}
          {person.report_count} reports, {formatDate(person.first_date)} to {formatDate(person.last_date)}
          {person.labs.length > 0 && ` · ${person.labs.join(", ")}`}
        </p>
      </header>

      <section>
        <h2 className="mb-1 font-semibold">Overview</h2>
        <p className="leading-relaxed">{brief.overview}</p>
      </section>

      {brief.key_findings.length > 0 && (
        <section>
          <h2 className="mb-1 font-semibold">Key findings</h2>
          <ul className="list-disc space-y-1 pl-5">
            {brief.key_findings.map((f) => (
              <li key={f.test + f.finding}>
                <strong>{f.test}:</strong> {f.finding}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="mb-2 font-semibold">Latest values</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 text-left text-slate-500 dark:border-slate-800">
              <tr>
                <th className="py-2 pr-3 font-medium">Test</th>
                <th className="py-2 pr-3 font-medium">Latest</th>
                <th className="py-2 pr-3 font-medium">Previous</th>
                <th className="py-2 pr-3 font-medium">Normal</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {series.map((s) => {
                const latest = s.points[s.points.length - 1];
                const previous = s.points.length > 1 ? s.points[s.points.length - 2] : null;
                return (
                  <tr key={s.key}>
                    <td className="py-2 pr-3">{s.name}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {formatNumber(latest.value)} {s.unit}
                      <span className="block text-xs text-slate-500">{formatDate(latest.date)}</span>
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-slate-600 dark:text-slate-400">
                      {previous ? (
                        <>
                          {formatNumber(previous.value)}
                          <span className="block text-xs text-slate-500">{formatDate(previous.date)}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-3 text-slate-600 dark:text-slate-400">
                      {formatRange(s.ref_low, s.ref_high, null)}
                    </td>
                    <td className="py-2">
                      <FlagBadge flag={s.latest_flag} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {brief.questions_for_doctor.length > 0 && (
        <section>
          <h2 className="mb-1 font-semibold">Questions I’d like to ask</h2>
          <ul className="list-disc space-y-1 pl-5">
            {brief.questions_for_doctor.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </section>
      )}

      <p className="border-t border-slate-200 pt-4 text-xs text-slate-500 dark:border-slate-800">
        Prepared {formatDate(createdAt)} by ReportSaathi from the patient’s lab reports. Values from different labs
        are converted to the units shown; each status uses the range printed by that lab. The overview and findings
        are written by AI. Please check against the original reports.
      </p>
    </article>
  );
}
