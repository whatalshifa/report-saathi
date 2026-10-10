"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { ErrorNote, SkeletonLines } from "@/components/Skeleton";
import { StatusPanel } from "@/components/StatusPanel";
import { ReadingPaused, useReportUpload } from "@/components/UploadCard";
import { getFeatures, listProfiles, type Profile } from "@/lib/api";
import { formatFileSize, possessive, RELATION_LABEL } from "@/lib/format";
import { clearSharedFile, readSharedFile, type SharedFile } from "@/lib/sharedFile";
import { usePoll } from "@/lib/usePoll";

const noRepeat = () => false;

// Set by public/sw.js (and the /share-target fallback) when a share couldn't be kept.
const SHARE_ERRORS: Record<string, string> = {
  unsupported: "That file can't be read here. Please share a PDF or a photo of the report (JPG, PNG or WebP).",
  "too-big": "That file is larger than 20 MB. Try sharing a photo of each page instead.",
  failed: "That share didn't come through. Please share it again, or upload it from your reports page.",
  missed: "That share didn't come through. Please share it again, or upload it from your reports page.",
  elsewhere: "That file was sent by a website, not shared from an app on your phone, so it wasn't kept.",
};

/** Real family members only: a shared report never belongs to the made-up sample person. */
function defaultProfile(profiles: Profile[]): Profile | undefined {
  return profiles.find((p) => p.relation === "self") ?? profiles[0];
}

export function ShareView({ error: shareError }: { error?: string }) {
  const router = useRouter();
  const { data: profiles, error } = usePoll(listProfiles, noRepeat);
  const { data: loadedFeatures, error: featuresError } = usePoll(getFeatures, noRepeat);
  // If the check fails, offer the upload anyway: the server says so itself if reading is off.
  const features = loadedFeatures ?? (featuresError ? { reading: true } : undefined);
  // undefined while reading it from this device, null when nothing is waiting.
  const [shared, setShared] = useState<SharedFile | null | undefined>(undefined);
  const [chosenId, setChosenId] = useState<string | null>(null);
  const { upload, uploading, error: uploadError, consentDialog } = useReportUpload(async (report) => {
    await clearSharedFile();
    router.push(`/reports/${report.id}`);
  });

  useEffect(() => {
    readSharedFile()
      .then(setShared)
      .catch(() => setShared(null));
  }, []);

  async function discard() {
    await clearSharedFile();
    setShared(null);
  }

  const people = profiles?.filter((p) => !p.is_sample) ?? [];
  const chosen = people.find((p) => p.id === chosenId) ?? defaultProfile(people);
  const problem = shareError ? (SHARE_ERRORS[shareError] ?? SHARE_ERRORS.failed) : null;

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <PageHeader back={{ href: "/", label: "Your reports" }} title="Add a shared report" />

      {problem && <ErrorNote message={problem} />}
      {error && <ErrorNote message={error} />}

      {!error && (shared === undefined || !profiles || !features) && <SkeletonLines lines={4} />}

      {shared === null && !problem && (
        <StatusPanel
          tone="empty"
          title="Nothing is waiting to be added"
          actions={
            <Link href="/" className="btn btn-secondary">
              Go to your reports
            </Link>
          }
        >
          On an Android phone, add ReportSaathi to your home screen. Then, in WhatsApp, tap and hold a report, tap
          Share and choose ReportSaathi.
        </StatusPanel>
      )}

      {shared && profiles && features && (
        <>
          {/* A failed share leaves the earlier one in place; say so, or it looks like the file that failed. */}
          {problem && <p className="font-semibold">A file you shared earlier is still waiting:</p>}
          <section aria-label="Shared file" className="card flex items-center gap-4 p-5">
            <span
              aria-hidden
              className="grid h-11 w-11 shrink-0 place-items-center rounded-ctl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={1.6}>
                <path strokeLinejoin="round" d="M7 3h7l5 5v12a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
                <path strokeLinejoin="round" d="M14 3v5h5" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="font-semibold break-words">{shared.file.name}</p>
              <p className="text-sm text-muted">
                {shared.file.type === "application/pdf" ? "PDF" : "Photo"} · {formatFileSize(shared.file.size)}
              </p>
            </div>
          </section>
          <p className="text-sm text-muted">
            Only add this file if you shared it yourself, from WhatsApp or another app on this phone.
          </p>

          {!features.reading ? (
            <ReadingPaused />
          ) : people.length === 0 || !chosen ? (
            <p className="card p-5 text-sm">
              First add the person this report belongs to on the{" "}
              <Link href="/family" className="link">
                family page
              </Link>
              , then come back here. The file will wait.
            </p>
          ) : (
            <fieldset>
              <legend className="font-semibold">Whose report is this?</legend>
              <div className="mt-3 flex flex-wrap gap-2">
                {people.map((p) => (
                  <label
                    key={p.id}
                    className="flex cursor-pointer items-center gap-2 rounded-ctl border border-line bg-surface py-1.5 pr-4 pl-3 text-sm min-h-10 has-checked:border-brand-700 has-checked:bg-brand-700 has-checked:text-white has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-600"
                  >
                    <input
                      type="radio"
                      name="profile"
                      value={p.id}
                      checked={p.id === chosen.id}
                      onChange={() => setChosenId(p.id)}
                      className="accent-white"
                    />
                    <span className="font-medium">{p.name}</span>
                    <span className="opacity-75">{RELATION_LABEL[p.relation]}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          {uploadError && <ErrorNote message={uploadError} />}
          <div className="flex flex-wrap gap-2">
            {features.reading && chosen && (
              <button
                type="button"
                onClick={() => upload(shared.file, chosen.id)}
                disabled={uploading}
                className="btn btn-primary"
              >
                {uploading ? "Uploading…" : `Add to ${possessive(chosen.name)} reports`}
              </button>
            )}
            <button type="button" onClick={discard} disabled={uploading} className="btn btn-secondary">
              Discard
            </button>
          </div>
          <p className="text-xs text-muted">
            The file waits only on this device until you add or discard it, and is removed after a day.
          </p>
          {consentDialog}
        </>
      )}
    </div>
  );
}
