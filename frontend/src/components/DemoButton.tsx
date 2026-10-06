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

export function DemoButton({ className = "btn btn-primary", label = "Try the demo" }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setBusy(true);
    setError(null);
    try {
      await checkHealth(); // waits out a sleeping server before creating anything
      await startDemo();
      // A full page load, so the header and every page see the new sign-in.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the demo");
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-2">
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
