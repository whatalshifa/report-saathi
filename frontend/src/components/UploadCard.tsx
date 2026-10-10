"use client";

import { PauseCircle, Upload } from "lucide-react";
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
    <div className="flex gap-3 rounded-ctl border border-line bg-surface px-4 py-3 text-sm">
      <PauseCircle aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
      <div>
        <p className="font-medium">Reading new reports is paused on this demo</p>
        <p className="mt-0.5 text-[13px] text-muted">
          This copy of ReportSaathi runs without an AI key, so it can&apos;t read new uploads yet. The sample reports
          show everything it does once a report is read.
        </p>
      </div>
    </div>
  );
}

export function UploadCard({
  profile,
  reading,
  compact = false,
}: {
  profile: Profile;
  reading: boolean;
  /** A smaller box for the dashboard's side column. */
  compact?: boolean;
}) {
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
        className={`flex w-full flex-col items-center gap-2 border border-dashed text-center transition-colors ${
          compact ? "rounded-xl px-4 py-5" : "rounded-card px-6 py-8 sm:py-10"
        } ${
          dragging
            ? "border-brand-600 bg-brand-50 dark:bg-brand-950/40"
            : "border-stone-300 bg-surface hover:border-brand-500 hover:bg-brand-50/40 dark:border-stone-700 dark:hover:bg-brand-950/20"
        } disabled:cursor-wait disabled:opacity-70`}
      >
        <span
          aria-hidden
          className="grid h-10 w-10 place-items-center rounded-ctl bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300"
        >
          <Upload className="h-5 w-5" strokeWidth={1.75} />
        </span>
        <span className="mt-1 font-semibold">
          {uploading ? "Uploading…" : `Upload a report for ${profile.name}`}
        </span>
        <span className="max-w-md text-[13px] text-pretty text-muted">
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
