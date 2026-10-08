"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { ConsentDialog } from "@/components/ConsentDialog";
import { ErrorNote } from "@/components/Skeleton";
import { ApiError, getMe, uploadReport, type Profile, type ReportDetail } from "@/lib/api";

const ACCEPTED = "application/pdf,image/jpeg,image/png,image/webp";

/**
 * Sends a report for one person, first asking for consent if they haven't agreed to the data notice.
 * Shared by the upload box and the /share page (reports shared from WhatsApp). Render `consentDialog`.
 */
export function useReportUpload(onUploaded: (report: ReportDetail) => void) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A chosen file waiting for the person to agree to the data notice before it is sent.
  const [waiting, setWaiting] = useState<{ file: File; profileId: string } | null>(null);

  async function upload(file: File, profileId: string) {
    setError(null);
    setUploading(true);
    try {
      // Asked once, before the first upload: nothing is sent until they agree.
      const me = await getMe();
      if (me?.needs_consent) {
        setWaiting({ file, profileId });
        setUploading(false);
        return;
      }
      onUploaded(await uploadReport(file, profileId));
    } catch (err) {
      // 428: the notice changed since the page loaded; ask now.
      if (err instanceof ApiError && err.status === 428) setWaiting({ file, profileId });
      else setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  }

  const consentDialog = waiting && (
    <ConsentDialog
      onAgree={() => {
        setWaiting(null);
        upload(waiting.file, waiting.profileId);
      }}
      onCancel={() => setWaiting(null)}
    />
  );
  return { upload, uploading, error, consentDialog };
}

/** Shown instead of the upload box when the server has no AI key (demo mode). */
export function ReadingPaused() {
  return (
    <div className="card flex gap-4 p-5">
      <span
        aria-hidden
        className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" d="M10 9v6m4-6v6M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      </span>
      <div>
        <p className="font-semibold">Reading new reports is paused on this demo</p>
        <p className="mt-1 text-sm text-muted">
          This copy of ReportSaathi runs without an AI key, so it can&apos;t read new uploads yet. The sample reports
          show everything it does once a report is read.
        </p>
      </div>
    </div>
  );
}

export function UploadCard({ profile, reading }: { profile: Profile; reading: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { upload, uploading, error, consentDialog } = useReportUpload((report) => router.push(`/reports/${report.id}`));

  function handleFile(file: File | undefined) {
    if (file) upload(file, profile.id);
  }

  if (!reading) return <ReadingPaused />;

  return (
    <div>
      <button
        type="button"
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
        disabled={uploading}
        className={`flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition-colors sm:py-12 ${
          dragging
            ? "border-teal-600 bg-teal-50 dark:bg-teal-950/40"
            : "border-line bg-surface hover:border-teal-500 hover:bg-teal-50/40 dark:hover:bg-teal-950/20"
        } disabled:cursor-wait disabled:opacity-70`}
      >
        <span
          aria-hidden
          className="grid h-12 w-12 place-items-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300"
        >
          <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor">
            <path strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
          </svg>
        </span>
        <span className="text-lg font-semibold">
          {uploading ? "Uploading…" : `Upload a report for ${profile.name}`}
        </span>
        <span className="max-w-md text-sm text-pretty text-muted">
          Drop a PDF or a photo here, or tap to choose one. Up to 20 MB. Files are stored encrypted.
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = ""; // so choosing the same file again after "Not now" still works
        }}
      />
      {consentDialog}
      {error && (
        <div className="mt-3">
          <ErrorNote message={error} />
        </div>
      )}
    </div>
  );
}
