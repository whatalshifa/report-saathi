"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";

import { giveConsent } from "@/lib/api";

/**
 * The notice below, as a version. Must match CONSENT_VERSION in backend/app/services/consent.py.
 * Change both when the notice changes in a way that matters, and everyone is asked again.
 */
export const CONSENT_VERSION = "2026-10-06";

/**
 * Asked once, before a person's first upload (India's DPDP Act 2023 wants consent that is
 * informed and given before the data is collected). "I agree" records it on the server.
 */
export function ConsentDialog({ onAgree, onCancel }: { onAgree: () => void; onCancel: () => void }) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const agreed = useRef(false);

  // A native modal dialog keeps focus inside and closes on Escape, which counts as "Not now".
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);

  async function agree() {
    setSaving(true);
    setError(null);
    try {
      await giveConsent(CONSENT_VERSION);
      agreed.current = true;
      dialog.current?.close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that. Please try again.");
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={() => (agreed.current ? onAgree() : onCancel())}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-line bg-surface p-0 text-foreground shadow-xl backdrop:bg-slate-950/60"
    >
      <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 sm:p-6">
        <h2 id={titleId} className="text-lg font-semibold">
          Before your first upload
        </h2>
        <p className="mt-1 text-sm text-muted">Here is how we look after your family&apos;s reports.</p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm">
          <li>We keep the reports you upload, the values read from them and the explanations, so you can see them again.</li>
          <li>Report files are encrypted before they are stored, each with its own key. Only your account can see them.</li>
          <li>
            To read a report, we send it to Claude, an AI made by Anthropic. Anthropic does not use it to train its
            models.
          </li>
          <li>You can download everything, or delete it all, at any time from your Account page.</li>
        </ul>
        <p className="mt-4 text-sm">
          <Link href="/privacy" target="_blank" className="link">
            Read the full privacy page
          </Link>
        </p>
        {error && (
          <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </p>
        )}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button type="button" onClick={() => dialog.current?.close()} className="btn btn-secondary">
            Not now
          </button>
          <button type="button" onClick={agree} disabled={saving} className="btn btn-primary">
            {saving ? "Saving…" : "I agree"}
          </button>
        </div>
      </div>
    </dialog>
  );
}
