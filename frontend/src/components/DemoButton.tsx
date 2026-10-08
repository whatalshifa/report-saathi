"use client";

import { useEffect, useState } from "react";

import { checkHealth, startDemo } from "@/lib/api";

/** Wakes the free server as soon as the page opens, so the demo button is quick when clicked. */
export function WakeServer() {
  useEffect(() => {
    checkHealth().catch(() => {});
  }, []);
  return null;
}

/**
 * `next`: where to go once the demo is open (from the sign-in page, the page that asked for it).
 * `full`: as wide as its column on phones, its own width from tablets up.
 */
export function DemoButton({ className = "btn btn-primary", label = "Try the demo", next = "/", full = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      await checkHealth(); // waits out a sleeping server before creating anything
      await startDemo();
      // A full page load, so the header and every page see the new sign-in.
      window.location.assign(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the demo");
      setBusy(false);
    }
  }

  return (
    <span className={`flex-col items-start gap-2 ${full ? "flex w-full sm:inline-flex sm:w-auto" : "inline-flex"}`}>
      <button type="button" onClick={start} disabled={busy} className={className}>
        {busy ? (
          <>
            <span
              aria-hidden
              className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
            />
            Setting up your demo…
          </>
        ) : (
          label
        )}
      </button>
      {error && (
        <span role="alert" className="text-sm text-rose-700 dark:text-rose-300">
          {error}
        </span>
      )}
    </span>
  );
}
