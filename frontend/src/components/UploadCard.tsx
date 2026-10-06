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
      <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white px-6 py-8 text-center dark:border-slate-700 dark:bg-slate-900">
        <p className="text-lg font-semibold">Reading new reports is paused on this demo</p>
        <p className="mx-auto mt-2 max-w-prose text-sm text-slate-500 dark:text-slate-400">
          This copy of ReportSaathi runs without an AI key, so it can&apos;t read new uploads yet. The sample reports
          below show everything it does with a report once it&apos;s read.
        </p>
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
            : "border-slate-300 bg-white hover:border-teal-500 dark:border-slate-700 dark:bg-slate-900"
        } disabled:cursor-wait disabled:opacity-70`}
      >
        <svg aria-hidden viewBox="0 0 24 24" className="h-10 w-10 text-teal-600" fill="none" stroke="currentColor">
          <path strokeWidth={1.5} strokeLinecap="round" d="M12 16V4m0 0-4 4m4-4 4 4M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
        </svg>
        <span className="text-lg font-semibold">
          {uploading ? "Uploading…" : `Upload a report for ${profile.name}`}
        </span>
        <span className="text-sm text-slate-500 dark:text-slate-400">
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
