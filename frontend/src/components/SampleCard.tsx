"use client";

import { useState } from "react";

import { addSamples, type Profile } from "@/lib/api";

/** Offers the example person's reports, so the app can be tried without uploading anything. */
export function SampleCard({ onAdded }: { onAdded: (profile: Profile) => void }) {
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    setAdding(true);
    setError(null);
    try {
      onAdded(await addSamples());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add the sample reports");
      setAdding(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
      <div>
        <p className="font-semibold">No report handy? Try sample reports</p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Adds Meera, a made-up example person, with three reports from two labs: flags, trends, explanations in
          English, Hindi and Marathi, and a doctor brief.
        </p>
        {error && (
          <p role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={add}
        disabled={adding}
        className="shrink-0 rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-wait disabled:opacity-70"
      >
        {adding ? "Adding…" : "Add sample reports"}
      </button>
    </div>
  );
}
