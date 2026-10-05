"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const POLL_MS = 2000;

type Loaded<T> = { source: unknown; data?: T; error?: string };

/**
 * Load something, and keep loading it every 2 seconds while `keepGoing` says
 * the server is still working on it. Used for reports, explanations and briefs.
 *
 * `data` is undefined until the first load for the current `load` function finishes,
 * so switching (for example) the explanation language shows a fresh loading state.
 */
export function usePoll<T>(load: () => Promise<T>, keepGoing: (value: T) => boolean) {
  const [state, setState] = useState<Loaded<T>>({ source: null });
  const [round, setRound] = useState(0);
  const keepGoingRef = useRef(keepGoing);

  useEffect(() => {
    keepGoingRef.current = keepGoing;
  });

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    async function tick() {
      try {
        const data = await load();
        if (cancelled) return;
        setState({ source: load, data });
        if (keepGoingRef.current(data)) timer = setTimeout(tick, POLL_MS);
      } catch (err) {
        if (!cancelled) setState({ source: load, error: err instanceof Error ? err.message : "Something went wrong" });
      }
    }
    tick();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [load, round]);

  const reload = useCallback(() => setRound((r) => r + 1), []);
  const current = state.source === load;
  return { data: current ? state.data : undefined, error: current ? (state.error ?? null) : null, reload };
}
