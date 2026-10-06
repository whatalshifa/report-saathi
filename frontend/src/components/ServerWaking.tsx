"use client";

import { useSyncExternalStore } from "react";

import { serverStatus } from "@/lib/serverStatus";

export function ServerWaking() {
  const waking = useSyncExternalStore(serverStatus.subscribe, serverStatus.isWaking, () => false);
  if (!waking) return null;
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-4 z-50 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-3 rounded-full border border-line bg-surface px-4 py-2.5 text-sm shadow-lg print:hidden"
    >
      <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-amber-500" aria-hidden />
      <span>
        Waking up the server. On the free plan it sleeps when nobody is using it, so this can take up to a minute.
      </span>
    </div>
  );
}
