"use client";

import type { ReactNode } from "react";

import { FlagBadge } from "@/components/FlagBadge";
import type { BriefContent } from "@/lib/api";
import { formatAge, formatDate, formatNumber, formatRange, formatSex } from "@/lib/format";

/**
 * The doctor brief as one printable page. Shared by the owner's brief page and the
 * read-only page a doctor opens from a link; each puts its own buttons in `toolbar`.
 */
export function BriefSheet({
  content,
  createdAt,
  toolbar,
}: {
  content: BriefContent;
  createdAt: string;
  /** Shown above the brief on screen, never on paper. */
  toolbar: ReactNode;
}) {
  const { brief, snapshot } = content;
  const { profile: person, series } = snapshot;

  return (
    <article className="card space-y-6 p-6 sm:p-8 print:border-0 print:p-0 print:shadow-none">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">{toolbar}</div>

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
                    <td className="py-2 pr-3">
                      {s.name}
                      {s.loinc && <span className="block text-xs text-muted">LOINC {s.loinc}</span>}
                    </td>
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
                      {s.range_source === "typical" && (
                        <span className="block text-xs">Typical range, not from the lab</span>
                      )}
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
        are converted to the units shown; each status uses the range printed by that lab, or a typical adult range
        where the lab printed none (marked). LOINC codes identify each test. The overview and findings are written
        by AI. Please check against the original reports.
      </p>
    </article>
  );
}

export function PrintButton() {
  return (
    <button onClick={() => window.print()} className="btn btn-primary">
      Print or save as PDF
    </button>
  );
}
