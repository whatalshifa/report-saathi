"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ExplanationPanel } from "@/components/ExplanationPanel";
import { FlagBadge } from "@/components/FlagBadge";
import { RangeBar } from "@/components/RangeBar";
import { SkeletonPage } from "@/components/Skeleton";
import { CorrectedChip, FixButton, ValueEditor } from "@/components/ValueFix";
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
import { formatAge, formatDate, formatRange, formatSex, possessive, serverTime } from "@/lib/format";

const POLL_MS = 2000;

export function ReportView({ id }: { id: string }) {
  const router = useRouter();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

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

  // A fixed value comes back re-flagged; the stats, "needs attention" and the table all follow it.
  function handleCorrected(updated: TestResult) {
    setReport((current) =>
      current && { ...current, results: current.results.map((r) => (r.id === updated.id ? updated : r)) },
    );
    setAnnouncement(`Saved. ${updated.name} is now ${[updated.value_text, updated.unit].filter(Boolean).join(" ")}.`);
  }

  async function handleDelete() {
    if (!confirm("Delete this report and its file?")) return;
    await deleteReport(id);
    router.push(`/?profile=${report?.profile_id ?? ""}`);
  }

  if (error) return <Notice title="Something went wrong" body={error} />;
  if (!report) return <SkeletonPage />;
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
  const lastCorrection = report.results
    .map((r) => r.corrected_at)
    .filter((t): t is string => t !== null)
    .sort((a, b) => serverTime(a) - serverTime(b))
    .at(-1);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href={`/?profile=${report.profile.id}`} className="back-link">
            ← {possessive(report.profile.name)} reports
          </Link>
          <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{report.lab_name ?? report.filename}</h1>
          <p className="mt-1 text-muted">
            {[
              report.patient_name,
              [formatAge(report.patient_age), formatSex(report.patient_sex)].filter(Boolean).join(", "),
              formatDate(report.report_date),
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          <Link
            href={`/profiles/${report.profile.id}`}
            className="link mt-2 inline-block text-sm"
          >
            See {possessive(report.profile.name)} results over time →
          </Link>
        </div>
        <button onClick={handleDelete} className="btn btn-secondary btn-sm hover:border-rose-400 hover:text-rose-700 dark:hover:text-rose-300">
          Delete
        </button>
      </header>

      {report.name_matches_profile === false && <WrongPersonWarning report={report} onMoved={setReport} />}

      <section className="grid grid-cols-3 gap-3">
        <Stat label="Values read" value={report.results.length} />
        <Stat label="Outside normal range" value={flagged.length} highlight={flagged.length > 0} />
        <Stat label="Within range" value={report.results.filter((r) => r.flag === "normal").length} />
      </section>

      {flagged.length > 0 && (
        <section aria-labelledby="needs-attention">
          <h2 id="needs-attention" className="mb-3 text-lg font-semibold">
            Needs attention
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {flagged.map((r) => (
              <li
                key={r.id}
                className="card p-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{r.name}</p>
                  <FlagBadge flag={r.flag} />
                </div>
                <p className="mt-1 text-2xl font-semibold">
                  {r.value_text} <span className="text-sm font-normal text-muted">{r.unit}</span>
                </p>
                <p className="mb-3 text-sm text-muted">
                  Normal: {formatRange(r.ref_low, r.ref_high, r.reference_text)}
                </p>
                <RangeBar result={r} />
                {r.corrected && (
                  <div className="mt-3">
                    <CorrectedChip result={r} showReading />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <ExplanationPanel reportId={report.id} correctedAt={lastCorrection ?? null} />

      <section aria-labelledby="all-results" className="space-y-6">
        <div>
          <h2 id="all-results" className="text-lg font-semibold">
            All results
          </h2>
          <p className="mt-1 text-sm text-muted">Something read wrongly? Use the pencil beside a value to fix it.</p>
        </div>
        {sections.map(([section, results]) => (
          <div key={section}>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">{section}</h3>
            {/* Phones get a stacked list; wider screens get a table. */}
            <ul className="card divide-y divide-line sm:hidden">
              {results.map((r) => (
                <ResultItem key={r.id} reportId={report.id} result={r} onSaved={handleCorrected} />
              ))}
            </ul>
            <div className="card hidden overflow-hidden sm:block">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[26%]" />
                  <col className="w-[18%]" />
                  <col className="w-[22%]" />
                  <col className="w-[20%]" />
                  <col className="w-[14%]" />
                </colgroup>
                <thead className="bg-slate-50 text-left text-muted dark:bg-slate-800/60">
                  <tr>
                    <th className="px-4 py-2 font-medium">Test</th>
                    <th className="px-4 py-2 font-medium">Result</th>
                    <th className="px-4 py-2 font-medium">Normal range</th>
                    <th className="px-4 py-2 font-medium">Where it sits</th>
                    <th className="px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {results.map((r) => (
                    <ResultRow key={r.id} reportId={report.id} result={r} onSaved={handleCorrected} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </section>

      <p className="text-xs text-muted">
        ReportSaathi reads your report with AI and can make mistakes. Check values against the original
        report, and talk to your doctor before acting on anything here.
      </p>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

interface ResultProps {
  reportId: string;
  result: TestResult;
  onSaved: (updated: TestResult) => void;
}

/** Opening and closing the fix form, with focus going back to the pencil when it closes. */
function useFixForm() {
  const [editing, setEditing] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const close = () => {
    button.current?.focus();
    setEditing(false);
  };
  return { editing, button, toggle: () => setEditing((open) => !open), close };
}

// Phones get a stacked list.
function ResultItem({ reportId, result: r, onSaved }: ResultProps) {
  const { editing, button, toggle, close } = useFixForm();
  return (
    <li className="space-y-2 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">{r.name}</p>
        <FlagBadge flag={r.flag} />
      </div>
      <p className="text-sm">
        <span className="font-semibold">{r.value_text}</span> <span className="text-muted">{r.unit}</span>{" "}
        <FixButton ref={button} name={r.name} open={editing} onClick={toggle} />
        <span className="text-muted"> · Normal: {formatRange(r.ref_low, r.ref_high, r.reference_text)}</span>
      </p>
      <CorrectedChip result={r} showReading />
      {editing && <ValueEditor reportId={reportId} result={r} onSaved={onSaved} onClose={close} />}
      <RangeBar result={r} />
    </li>
  );
}

// Wider screens get a table; the fix form opens in a full-width row under the value.
function ResultRow({ reportId, result: r, onSaved }: ResultProps) {
  const { editing, button, toggle, close } = useFixForm();
  return (
    <>
      <tr className={editing ? "border-b-0" : undefined}>
        <td className="px-4 py-2.5">{r.name}</td>
        <td className="px-4 py-2.5 font-medium">
          {r.value_text} <span className="font-normal text-muted">{r.unit}</span>{" "}
          <FixButton ref={button} name={r.name} open={editing} onClick={toggle} />
          {r.corrected && (
            <div className="mt-1">
              <CorrectedChip result={r} />
            </div>
          )}
        </td>
        <td className="px-4 py-2.5 text-muted">{formatRange(r.ref_low, r.ref_high, r.reference_text)}</td>
        <td className="px-4 py-2.5">
          <RangeBar result={r} />
        </td>
        <td className="px-4 py-2.5">
          <FlagBadge flag={r.flag} />
        </td>
      </tr>
      {editing && (
        <tr>
          <td colSpan={5} className="px-4 pb-3">
            <ValueEditor reportId={reportId} result={r} onSaved={onSaved} onClose={close} />
          </td>
        </tr>
      )}
    </>
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
    <div className="card p-3 sm:p-4">
      <p className={`text-2xl font-bold sm:text-3xl ${highlight ? "text-rose-700 dark:text-rose-300" : ""}`}>{value}</p>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}

function Notice({ title, body, spinner = false }: { title: string; body?: string; spinner?: boolean }) {
  return (
    <div className="card p-10 text-center">
      {spinner && (
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" />
      )}
      <h1 className="text-xl font-semibold">{title}</h1>
      {body && <p className="mx-auto mt-2 max-w-md text-muted">{body}</p>}
      <Link href="/" className="back-link mt-6">
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
            className="rounded-lg border border-amber-300 bg-surface px-3 py-1.5 dark:border-amber-800"
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
