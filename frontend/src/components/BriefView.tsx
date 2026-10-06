"use client";

import Link from "next/link";
import { useCallback } from "react";

import { FlagBadge } from "@/components/FlagBadge";
import { ErrorNote } from "@/components/Skeleton";
import { getBrief, isPending, type BriefContent } from "@/lib/api";
import { formatAge, formatDate, formatNumber, formatRange, formatSex } from "@/lib/format";
import { usePoll } from "@/lib/usePoll";

export function BriefView({ id }: { id: string }) {
  const load = useCallback(() => getBrief(id), [id]);
  const { data: job, error } = usePoll(load, (j) => isPending(j.status));

  if (error) return <ErrorNote message={error} />;
  if (!job || isPending(job.status)) {
    return (
      <div className="card p-10 text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" />
        <h1 className="text-xl font-semibold">Preparing the doctor brief…</h1>
        <p className="mx-auto mt-2 max-w-md text-muted">
          Going through every report on file and summarising what changed.
        </p>
      </div>
    );
  }
  if (job.status === "failed" || !job.content) {
    return <ErrorNote message={job.error ?? "The brief could not be written."} />;
  }
  return <Brief content={job.content} createdAt={job.created_at} />;
}

function Brief({ content, createdAt }: { content: BriefContent; createdAt: string }) {
  const { brief, snapshot } = content;
  const { profile: person, series } = snapshot;

  return (
    <article className="card space-y-6 p-6 sm:p-8 print:border-0 print:p-0 print:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link href={`/profiles/${person.profile_id}`} className="back-link">
          ← Back to timeline
        </Link>
        <button
          onClick={() => window.print()}
          className="btn btn-primary"
        >
          Print or save as PDF
        </button>
      </div>

      <header className="border-b border-line pb-4">
        <p className="eyebrow">
          Pre-visit lab summary
        </p>
        <h1 className="mt-1 text-2xl font-bold">{person.name}</h1>
        <p className="text-muted">
          {[formatAge(person.age), formatSex(person.sex)].filter(Boolean).join(", ")}
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
            <thead className="border-b border-line text-left text-muted">
              <tr>
                <th className="py-2 pr-3 font-medium">Test</th>
                <th className="py-2 pr-3 font-medium">Latest</th>
                <th className="py-2 pr-3 font-medium">Previous</th>
                <th className="py-2 pr-3 font-medium">Normal</th>
                <th className="py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {series.map((s) => {
                const latest = s.points[s.points.length - 1];
                const previous = s.points.length > 1 ? s.points[s.points.length - 2] : null;
                return (
                  <tr key={s.key}>
                    <td className="py-2 pr-3">{s.name}</td>
                    <td className="py-2 pr-3 tabular-nums">
                      {formatNumber(latest.value)} {s.unit}
                      <span className="block text-xs text-muted">{formatDate(latest.date)}</span>
                    </td>
                    <td className="py-2 pr-3 tabular-nums text-muted">
                      {previous ? (
                        <>
                          {formatNumber(previous.value)}
                          <span className="block text-xs text-muted">{formatDate(previous.date)}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-2 pr-3 text-muted">
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

      <p className="border-t border-line pt-4 text-xs text-muted">
        Prepared {formatDate(createdAt)} by ReportSaathi from the patient’s lab reports. Values from different labs
        are converted to the units shown; each status uses the range printed by that lab. The overview and findings
        are written by AI. Please check against the original reports.
      </p>
    </article>
  );
}
