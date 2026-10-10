"use client";

import { ArrowRight, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { ExplanationPanel } from "@/components/ExplanationPanel";
import { FlagBadge } from "@/components/FlagBadge";
import { MoreMenu, MoreMenuItem } from "@/components/MoreMenu";
import { BackLink, PageHeader } from "@/components/PageHeader";
import { useSelectPerson } from "@/components/shell/ShellContext";
import { RangeBar } from "@/components/RangeBar";
import { SkeletonPage } from "@/components/Skeleton";
import { SourceButton, SourceDialog } from "@/components/SourceView";
import { StatCard, StatRow } from "@/components/StatCard";
import { StatusPanel } from "@/components/StatusPanel";
import { TypicalRangeNote } from "@/components/TypicalRangeNote";
import { CorrectedChip, FixButton, ValueEditor } from "@/components/ValueFix";
import {
  deleteReport,
  getReport,
  hasOriginal,
  isOutOfRange,
  listProfiles,
  moveReport,
  reportFileUrl,
  type Profile,
  type ReportDetail,
  type TestResult,
} from "@/lib/api";
import { formatAge, formatDate, formatRange, formatSex, possessive, serverTime } from "@/lib/format";
import { usePdfViewer } from "@/lib/usePdfViewer";

const POLL_MS = 2000;

export function ReportView({ id }: { id: string }) {
  const router = useRouter();
  const [report, setReport] = useState<ReportDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  // The value whose source is showing, and the button that opened it (focus goes back there).
  const [source, setSource] = useState<{ result: TestResult; trigger: HTMLElement } | null>(null);
  const showsPdf = usePdfViewer();
  useSelectPerson(report?.profile_id);

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

  function closeSource() {
    source?.trigger.focus();
    setSource(null);
  }

  async function handleDelete() {
    if (!confirm("Delete this report and its file? Any doctor links for this person will stop working.")) return;
    await deleteReport(id);
    router.push(`/?profile=${report?.profile_id ?? ""}`);
  }

  if (error) {
    return /not found/i.test(error) ? (
      <Notice tone="missing" title="We couldn’t find this report" body="It may have been deleted, or the link is from another account." />
    ) : (
      <Notice tone="error" title="This report didn’t load" body={error} />
    );
  }
  if (!report) return <SkeletonPage />;
  if (report.status === "queued" || report.status === "processing") {
    return (
      <Notice
        tone="working"
        title="Reading your report…"
        body="The AI is going through every page and pulling out each value. This usually takes under a minute."
      />
    );
  }
  if (report.status === "failed") {
    return <Notice tone="error" title="We couldn’t read this report" body={report.error ?? undefined} />;
  }

  const flagged = report.results.filter((r) => isOutOfRange(r.flag));
  // Only values with a known spot on a file we can show get a source button.
  const canShowSource = hasOriginal(report);
  // Phones without a PDF viewer download the file, so the link says so.
  const downloadsPdf = !showsPdf && report.content_type === "application/pdf";
  const showSource = (r: TestResult) =>
    canShowSource && r.box ? (trigger: HTMLElement) => setSource({ result: r, trigger }) : undefined;
  const sections = groupBySection(report.results);
  // Every typical range used on this report, and where each comes from, for the note under the table.
  const typicalSources = [
    ...new Set(
      report.results.filter((r) => r.range_source === "typical").map((r) => r.typical_range_source ?? ""),
    ),
  ].filter(Boolean);
  const lastCorrection = report.results
    .map((r) => r.corrected_at)
    .filter((t): t is string => t !== null)
    .sort((a, b) => serverTime(a) - serverTime(b))
    .at(-1);

  return (
    <div className="space-y-8">
      <PageHeader
        back={{ href: `/?profile=${report.profile.id}`, label: `${possessive(report.profile.name)} reports` }}
        title={report.lab_name ?? report.filename}
        description={
          <>
            <p className="flex flex-wrap gap-x-2 text-sm">
              {[
                report.patient_name,
                [formatAge(report.patient_age), formatSex(report.patient_sex)].filter(Boolean).join(", "),
                formatDate(report.report_date),
              ]
                .filter(Boolean)
                .map((part, i, parts) => (
                  // The dot rides at the end of the part before it, so a wrapped line never starts with one.
                  <span key={part} className="whitespace-nowrap">
                    {part}
                    {i < parts.length - 1 && (
                      <span aria-hidden className="ml-2 text-stone-400">
                        ·
                      </span>
                    )}
                  </span>
                ))}
            </p>
            <p className="mt-2 text-sm">
              <Link href={`/profiles/${report.profile.id}`} className="link inline-flex items-center gap-1">
                See {possessive(report.profile.name)} results over time
                <ArrowRight aria-hidden className="h-4 w-4" />
              </Link>
            </p>
          </>
        }
        actions={
          <>
            {canShowSource && (
              <a
                href={reportFileUrl(report.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary btn-sm"
                title={downloadsPdf ? "This phone saves the PDF to its downloads to open it" : undefined}
              >
                <ExternalLink aria-hidden className="h-3.5 w-3.5" />
                {downloadsPdf ? "Download original" : "View original"}
              </a>
            )}
            <MoreMenu label="More actions for this report">
              <MoreMenuItem danger onSelect={handleDelete} icon={<Trash2 aria-hidden className="h-4 w-4" />}>
                Delete
              </MoreMenuItem>
            </MoreMenu>
          </>
        }
      />

      {report.name_matches_profile === false && <WrongPersonWarning report={report} onMoved={setReport} />}

      <StatRow>
        <StatCard label="Values read" value={report.results.length} />
        <StatCard label="Outside normal range" value={flagged.length} tone={flagged.length > 0 ? "warn" : undefined} />
        <StatCard label="Within range" value={report.results.filter((r) => r.flag === "normal").length} />
      </StatRow>

      {flagged.length > 0 && (
        <section aria-labelledby="needs-attention">
          <h2 id="needs-attention" className="section-title mb-3">
            Needs attention
          </h2>
          {/* One list on phones; two columns of cards from tablets up. */}
          <ul className="card divide-y divide-line overflow-hidden sm:grid sm:grid-cols-2 sm:gap-3 sm:divide-y-0 sm:overflow-visible sm:rounded-none sm:border-0 sm:bg-transparent">
            {flagged.map((r) => (
              <li key={r.id} className="p-4 sm:rounded-card sm:border sm:border-line sm:bg-surface">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[15px] font-medium">{r.name}</p>
                  <FlagBadge flag={r.flag} />
                </div>
                <div className="mt-1 mb-2.5 flex flex-wrap items-center justify-between gap-x-3">
                  <p className="flex items-center gap-1.5">
                    <span className="text-lg font-semibold tracking-tight tabular-nums">{r.value_text}</span>
                    <span className="text-sm text-muted">{r.unit}</span>
                    <SourceToggle name={r.name} onShow={showSource(r)} />
                  </p>
                  <p className="text-[13px] text-muted">
                    Normal <span className="tabular-nums">{formatRange(r.ref_low, r.ref_high, r.reference_text)}</span>
                    <TypicalRangeNote rangeSource={r.range_source} source={r.typical_range_source} />
                  </p>
                </div>
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
          <h2 id="all-results" className="section-title">
            All results
          </h2>
          <p className="mt-1 text-sm text-muted">
            {canShowSource && report.results.some((r) => r.box)
              ? "Tap the page icon beside a value to see it on the original report. Read wrongly? Use the pencil to fix it."
              : "Something read wrongly? Use the pencil beside a value to fix it."}
          </p>
        </div>
        {sections.map(([section, results]) => (
          <div key={section}>
            <h3 className="mb-2 text-sm font-medium text-muted">{section}</h3>
            {/* Phones get a stacked list; wider screens get a table. */}
            <ul className="card divide-y divide-line sm:hidden">
              {results.map((r) => (
                <ResultItem
                  key={r.id}
                  reportId={report.id}
                  result={r}
                  onSaved={handleCorrected}
                  onShowSource={showSource(r)}
                />
              ))}
            </ul>
            <div className="card hidden overflow-hidden sm:block">
              <table className="w-full table-fixed text-sm">
                <colgroup>
                  <col className="w-[24%]" />
                  <col className="w-[22%]" />
                  <col className="w-[20%]" />
                  <col className="w-[20%]" />
                  <col className="w-[14%]" />
                </colgroup>
                <thead className="border-b border-line text-left text-xs text-muted">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Test</th>
                    <th className="px-4 py-2.5 font-medium">Result</th>
                    <th className="px-4 py-2.5 font-medium">Normal range</th>
                    <th className="px-4 py-2.5 font-medium">Where it sits</th>
                    <th className="px-4 py-2.5 text-right font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {results.map((r) => (
                    <ResultRow
                      key={r.id}
                      reportId={report.id}
                      result={r}
                      onSaved={handleCorrected}
                      onShowSource={showSource(r)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))}
        {typicalSources.length > 0 && (
          <p className="text-sm text-muted">
            Your lab printed no normal range for some values, so we compared them with a typical range for
            adults instead. Labs and doctors may use a slightly different one, so ask your doctor what is normal
            for you.
            {/* Citations are long and technical; keep them small and apart from the plain words above. */}
            <span className="mt-1 block text-xs">
              {typicalSources.length === 1 ? "Source" : "Sources"}: {typicalSources.join("; ")}.
            </span>
          </p>
        )}
      </section>

      <p className="text-xs text-muted">
        ReportSaathi reads your report with AI and can make mistakes. Check values against the original
        report, and talk to your doctor before acting on anything here.
      </p>
      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
      {source?.result.box && (
        <SourceDialog
          reportId={report.id}
          contentType={report.content_type}
          result={source.result}
          box={source.result.box}
          onClose={closeSource}
        />
      )}
    </div>
  );
}

interface ResultProps {
  reportId: string;
  result: TestResult;
  onSaved: (updated: TestResult) => void;
  /** Opens the original with this value highlighted; missing when its place on the page isn't known. */
  onShowSource?: (trigger: HTMLElement) => void;
}

function SourceToggle({ name, onShow }: { name: string; onShow?: (trigger: HTMLElement) => void }) {
  return onShow ? <SourceButton name={name} onClick={onShow} /> : null;
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
function ResultItem({ reportId, result: r, onSaved, onShowSource }: ResultProps) {
  const { editing, button, toggle, close } = useFixForm();
  return (
    <li className="px-4 py-3">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[15px] font-medium">{r.name}</p>
          <p className="mt-0.5 text-[13px] text-muted">
            Normal <span className="tabular-nums">{formatRange(r.ref_low, r.ref_high, r.reference_text)}</span>
            <TypicalRangeNote rangeSource={r.range_source} source={r.typical_range_source} />
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <p className="text-[15px] whitespace-nowrap tabular-nums">
            <span className="font-semibold">{r.value_text}</span>{" "}
            <span className="text-[13px] text-muted">{r.unit}</span>
          </p>
          <FlagBadge flag={r.flag} />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <RangeBar result={r} />
        </div>
        <span className="-mr-2 flex shrink-0">
          <SourceToggle name={r.name} onShow={onShowSource} />
          <FixButton ref={button} name={r.name} open={editing} onClick={toggle} />
        </span>
      </div>
      {r.corrected && (
        <div className="mt-2">
          <CorrectedChip result={r} showReading />
        </div>
      )}
      {editing && (
        <div className="mt-2">
          <ValueEditor reportId={reportId} result={r} onSaved={onSaved} onClose={close} />
        </div>
      )}
    </li>
  );
}

// Wider screens get a table; the fix form opens in a full-width row under the value.
function ResultRow({ reportId, result: r, onSaved, onShowSource }: ResultProps) {
  const { editing, button, toggle, close } = useFixForm();
  return (
    <>
      <tr className={editing ? "border-b-0" : undefined}>
        <td className="px-4 py-2.5 font-medium">{r.name}</td>
        <td className="px-4 py-2.5 font-semibold tabular-nums">
          {r.value_text} <span className="font-normal text-muted">{r.unit}</span>{" "}
          <span className="inline-flex align-middle">
            <SourceToggle name={r.name} onShow={onShowSource} />
            <FixButton ref={button} name={r.name} open={editing} onClick={toggle} />
          </span>
          {r.corrected && (
            <div className="mt-1">
              <CorrectedChip result={r} />
            </div>
          )}
        </td>
        <td className="px-4 py-2.5 text-muted tabular-nums">
          {formatRange(r.ref_low, r.ref_high, r.reference_text)}
          <TypicalRangeNote rangeSource={r.range_source} source={r.typical_range_source} />
        </td>
        <td className="px-4 py-2.5">
          <RangeBar result={r} />
        </td>
        <td className="px-4 py-2.5 text-right">
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

function Notice({
  tone,
  title,
  body,
}: {
  tone: "missing" | "error" | "working";
  title: string;
  body?: string;
}) {
  return (
    <StatusPanel tone={tone} title={title} heading="h1" actions={<BackLink href="/">Back to all reports</BackLink>}>
      {body}
    </StatusPanel>
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
      className="rounded-card border border-amber-200 bg-amber-50 p-4 text-sm dark:border-amber-800 dark:bg-amber-950/40"
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
            className="h-9 rounded-ctl border border-amber-300 bg-surface px-3 dark:border-amber-800"
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
            className="h-9 rounded-ctl bg-amber-700 px-3 font-medium text-white hover:bg-amber-800 disabled:opacity-50"
          >
            Move
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-rose-700 dark:text-rose-300">{error}</p>}
    </section>
  );
}
