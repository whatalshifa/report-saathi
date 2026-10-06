"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

import { uploadReport, type Profile } from "@/lib/api";

const ACCEPTED = "application/pdf,image/jpeg,image/png,image/webp";

export function UploadCard({ profile, reading }: { profile: Profile; reading: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const report = await uploadReport(file, profile.id);
      router.push(`/reports/${report.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploading(false);
    }
  }

  if (!reading) {
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
        className={`flex w-full flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
          dragging
            ? "border-teal-600 bg-teal-50 dark:bg-teal-950/40"
            : "border-line bg-surface hover:border-teal-500 hover:bg-teal-50/40 dark:hover:bg-teal-950/20"
        } disabled:cursor-wait disabled:opacity-70`}
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-10 w-10 text-teal-600" fill="none" stroke="currentColor">
          <path strokeWidth={1.5} strokeLinecap="round" d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        <span className="text-lg font-semibold">
          {uploading ? "Uploading…" : `Upload a report for ${profile.name}`}
        </span>
        <span className="text-sm text-muted">
          Drop a PDF or a photo here, or tap to choose one. Up to 20 MB. Files are stored encrypted.
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
