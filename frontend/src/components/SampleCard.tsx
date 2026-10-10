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
    <div className="card p-5">
      <p className="text-[13px] text-muted">No report handy?</p>
      <p className="mt-0.5 font-semibold">Try the sample reports</p>
      <p className="mt-1 text-sm text-muted">
        Adds Meera, a made-up person, with three reports from two labs, explanations in three languages and a doctor
        brief.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
      <button type="button" onClick={add} disabled={adding} className="btn btn-secondary mt-4 w-full">
        {adding ? "Adding…" : "Add sample reports"}
      </button>
    </div>
  );
}
