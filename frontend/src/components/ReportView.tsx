"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ExplanationPanel } from "@/components/ExplanationPanel";
import { FlagBadge } from "@/components/FlagBadge";
import { RangeBar } from "@/components/RangeBar";
import {
  deleteReport,
  getReport,
  isOutOfRange,
  listProfiles,
  moveReport,
  type Profile,
  type ReportDetail,
  type TestResult,
} from "@/lib/api";
import { formatDate, formatRange, possessive } from "@/lib/format";

const POLL_MS = 2000;

export function ReportView({ id }: { id: string }) {
  const router = useRouter();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Reading a report takes a little while, so ask the server again until it is done.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    async function load() {
      try {
        const next = await getReport(id);
        if (cancelled) return;
        setReport(next);
        if (next.status === "queued" || next.status === "processing") timer = setTimeout(load, POLL_MS);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load the report");
      }
    }
    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id]);

  async function handleDelete() {
    if (!confirm("Delete this report and its file?")) return;
    await deleteReport(id);
    router.push(`/?profile=${report?.profile_id ?? ""}`);
  }

  if (error) return <Notice title="Something went wrong" body={error} />;
  if (!report) return <Notice title="Loading…" />;
  if (report.status === "queued" || report.status === "processing") {
    return (
      <Notice
        title="Reading your report…"
        body="The AI is going through every page and pulling out each value. This usually takes under a minute."
        spinner
      />
    );
  }
  if (report.status === "failed") {
    return <Notice title="We couldn't read this report" body={report.error ?? undefined} />;
  }

  const flagged = report.results.filter((r) => isOutOfRange(r.flag));
  const sections = groupBySection(report.results);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{report.lab_name ?? report.filename}</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">
            {[
              report.patient_name,
              [report.patient_age, report.patient_sex].filter(Boolean).join(", "),
              formatDate(report.report_date),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <Link
            href={`/profiles/${report.profile.id}`}
            className="mt-2 inline-block text-sm font-medium text-teal-700 hover:underline dark:text-teal-400"
          >
            See {possessive(report.profile.name)} reports over time →
          </Link>
        </div>
        <button
          onClick={handleDelete}
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:border-rose-400 hover:text-rose-700 dark:border-slate-700 dark:text-slate-300"
        >
          Delete
        </button>
      </header>

      {report.name_matches_profile === false && <WrongPersonWarning report={report} onMoved={setReport} />}

      <section className="grid grid-cols-3 gap-3">
        <Stat label="Values read" value={report.results.length} />
        <Stat label="Outside normal range" value={report.out_of_range} highlight={report.out_of_range > 0} />
        <Stat label="Within range" value={report.results.filter((r) => r.flag === "normal").length} />
      </section>

      {flagged.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-semibold">Needs attention</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {flagged.map((r) => (
              <li
                key={r.id}
                className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{r.name}</p>
                  <FlagBadge flag={r.flag} />
                </div>
                <p className="mt-1 text-2xl font-semibold">
                  {r.value_text} <span className="text-sm font-normal text-slate-500">{r.unit}</span>
                </p>
                <p className="mb-3 text-sm text-slate-500">
                  Normal: {formatRange(r.ref_low, r.ref_high, r.reference_text)}
                </p>
                <RangeBar result={r} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <ExplanationPanel reportId={report.id} />

      <section className="space-y-6">
        <h2 className="text-lg font-semibold">All results</h2>
        {sections.map(([section, results]) => (
          <div key={section}>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{section}</h3>
            {/* Phones get a stacked list; wider screens get a table. */}
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white sm:hidden dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
              {results.map((r) => (
                <li key={r.id} className="space-y-2 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium">{r.name}</p>
                    <FlagBadge flag={r.flag} />
                  </div>
                  <p className="text-sm">
                    <span className="font-semibold">{r.value_text}</span>{" "}
                    <span className="text-slate-500">{r.unit}</span>
                    <span className="text-slate-500">
                      {" "}
                      · Normal: {formatRange(r.ref_low, r.ref_high, r.reference_text)}
                    </span>
                  </p>
                  <RangeBar result={r} />
                </li>
              ))}
            </ul>
            <div className="hidden overflow-hidden rounded-xl border border-slate-200 bg-white sm:block dark:border-slate-800 dark:bg-slate-900">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[26%]" />
                  <col className="w-[18%]" />
                  <col className="w-[22%]" />
                  <col className="w-[20%]" />
                  <col className="w-[14%]" />
                </colgroup>
                <thead className="bg-slate-50 text-left text-slate-500 dark:bg-slate-800/60">
                  <tr>
                    <th className="px-4 py-2 font-medium">Test</th>
                    <th className="px-4 py-2 font-medium">Result</th>
                    <th className="px-4 py-2 font-medium">Normal range</th>
                    <th className="px-4 py-2 font-medium">Where it sits</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {results.map((r) => (
                    <tr key={r.id}>
                      <td className="px-4 py-2.5">{r.name}</td>
                      <td className="px-4 py-2.5 font-medium">
                        {r.value_text} <span className="font-normal text-slate-500">{r.unit}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 dark:text-slate-400">
                        {formatRange(r.ref_low, r.ref_high, r.reference_text)}
                      </td>
                      <td className="px-4 py-2.5">
                        <RangeBar result={r} />
                      </td>
                      <td className="px-4 py-2.5">
                        <FlagBadge flag={r.flag} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      <p className="text-xs text-slate-500">
        ReportSaathi reads your report with AI and can make mistakes. Check values against the original
        report, and talk to your doctor before acting on anything here.
      </p>
    </div>
  );
}

function groupBySection(results: TestResult[]): [string, TestResult[]][] {
  const groups = new Map<string, TestResult[]>();
  for (const r of results) {
    const key = r.section ?? "Other tests";
    groups.set(key, [...(groups.get(key) ?? []), r]);
  }
  return [...groups.entries()];
}

function Stat({ label, value, highlight = false }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 dark:border-slate-800 dark:bg-slate-900">
      <p className={`text-2xl font-bold sm:text-3xl ${highlight ? "text-rose-700 dark:text-rose-300" : ""}`}>{value}</p>
      <p className="text-sm text-slate-500">{label}</p>
    </div>
  );
}

function Notice({ title, body, spinner = false }: { title: string; body?: string; spinner?: boolean }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
      {spinner && (
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" />
      )}
      <h1 className="text-xl font-semibold">{title}</h1>
      {body && <p className="mx-auto mt-2 max-w-md text-slate-600 dark:text-slate-400">{body}</p>}
      <Link href="/" className="mt-6 inline-block text-sm font-medium text-teal-700 dark:text-teal-400">
        ← Back to all reports
      </Link>
    </div>
  );
}

function WrongPersonWarning({ report, onMoved }: { report: ReportDetail; onMoved: (r: ReportDetail) => void }) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProfiles().then((all) => setProfiles(all.filter((p) => p.id !== report.profile_id)));
  }, [report.profile_id]);

  async function move() {
    try {
      onMoved(await moveReport(report.id, target));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not move the report");
    }
  }

  return (
    <section
      role="status"
      className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/40"
    >
      <p className="font-medium text-amber-900 dark:text-amber-200">
        This report is in {possessive(report.profile.name)} reports, but the name on it is {report.patient_name}.
      </p>
      <p className="mt-1 text-amber-900/80 dark:text-amber-200/80">
        If it belongs to someone else, move it so their timeline stays right.
      </p>
      {profiles.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            aria-label="Move to"
            className="rounded-lg border border-amber-300 bg-white px-3 py-1.5 dark:border-amber-800 dark:bg-slate-900"
          >
            <option value="">Move to…</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            disabled={!target}
            onClick={move}
            className="rounded-lg bg-amber-700 px-3 py-1.5 font-semibold text-white hover:bg-amber-800 disabled:opacity-50"
          >
            Move
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-rose-700 dark:text-rose-300">{error}</p>}
    </section>
  );
}
