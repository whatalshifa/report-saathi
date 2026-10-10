"use client";

import { ChevronRight, FileText, Link2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { ErrorNote } from "@/components/Skeleton";
import { StatusPanel } from "@/components/StatusPanel";
import { PersonAvatar } from "@/components/shell/PersonAvatar";
import { AppLink, useShell } from "@/components/shell/ShellContext";
import { listShareLinks, requestBrief, type Profile, type ShareLink } from "@/lib/api";
import { formatDate, RELATION_LABEL } from "@/lib/format";

const STATE: Record<ShareLink["state"], string> = { active: "Active", expired: "Expired", revoked: "Turned off" };

/**
 * Doctor briefs, person by person: prepare a new one, or go back to a brief that was shared with a
 * doctor (its links are the record of briefs that went out).
 */
export function BriefsIndex({ profileId }: { profileId?: string }) {
  const { profiles } = useShell();
  const withReports = (profiles ?? []).filter((p) => p.report_count > 0);
  // The person the dashboard asked about comes first.
  const ordered = [...withReports].sort((a, b) => Number(b.id === profileId) - Number(a.id === profileId));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Doctor briefs"
        description="A one-page summary for the next visit: what changed, what's outside the range, and questions worth asking. Print it, or send the doctor a private link that expires."
      />
      {!profiles ? (
        <div className="skeleton h-32 rounded-xl" aria-hidden />
      ) : ordered.length === 0 ? (
        <StatusPanel
          tone="empty"
          title="No reports to summarise yet"
          heading="p"
          actions={
            <AppLink href="/" className="btn btn-secondary">
              Add a report
            </AppLink>
          }
        >
          A brief is made from a person&apos;s reports, so add one first.
        </StatusPanel>
      ) : (
        <ul className="space-y-3">
          {ordered.map((p) => (
            <li key={p.id}>
              <PersonBriefs person={p} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PersonBriefs({ person }: { person: Profile }) {
  const router = useRouter();
  const [links, setLinks] = useState<ShareLink[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listShareLinks(person.id)
      .then(setLinks)
      .catch(() => setLinks([]));
  }, [person.id]);

  async function prepare() {
    setBusy(true);
    setError(null);
    try {
      const brief = await requestBrief(person.id);
      router.push(`/briefs/${brief.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the brief");
      setBusy(false);
    }
  }

  // One row per brief that went out, newest first.
  const sent = new Map<string, ShareLink>();
  for (const link of links ?? []) if (!sent.has(link.brief_id)) sent.set(link.brief_id, link);

  return (
    <section aria-label={person.name} className="rounded-xl border border-line bg-surface">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <PersonAvatar name={person.name} />
          <div className="min-w-0">
            <h2 className="truncate text-[15px] font-semibold">{person.name}</h2>
            <p className="text-[13px] text-muted">
              {person.is_sample ? "Sample" : RELATION_LABEL[person.relation]} · {person.report_count} report
              {person.report_count === 1 ? "" : "s"}
              {person.last_report_date && `, latest ${formatDate(person.last_report_date)}`}
            </p>
          </div>
        </div>
        <button type="button" onClick={prepare} disabled={busy} className="btn btn-primary btn-sm">
          <FileText aria-hidden className="h-3.5 w-3.5" />
          {busy ? "Starting…" : "Prepare a new brief"}
        </button>
      </div>
      {error && (
        <div className="px-4 pb-4">
          <ErrorNote message={error} />
        </div>
      )}
      <div className="border-t border-line px-4 py-3">
        <h3 className="text-xs font-medium text-muted">Shared with a doctor</h3>
        {links === null ? (
          <div className="skeleton mt-2 h-5 w-1/2" aria-hidden />
        ) : sent.size === 0 ? (
          <p className="mt-1 text-[13px] text-muted">No brief shared yet. Open one to make a private link or QR code.</p>
        ) : (
          <ul className="mt-1 divide-y divide-line">
            {[...sent.values()].map((link) => (
              <li key={link.id}>
                <AppLink
                  href={`/briefs/${link.brief_id}`}
                  className="flex items-center gap-3 py-2 text-[13px] hover:text-brand-700 dark:hover:text-brand-300"
                >
                  <Link2 aria-hidden className="h-3.5 w-3.5 shrink-0 text-muted" />
                  <span className="min-w-0 flex-1">
                    Brief shared {formatDate(link.created_at)}
                    <span className="text-muted">
                      {" · "}
                      {STATE[link.state]} · opened {link.view_count} time{link.view_count === 1 ? "" : "s"}
                    </span>
                  </span>
                  <ChevronRight aria-hidden className="h-4 w-4 shrink-0 text-stone-400" />
                </AppLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
