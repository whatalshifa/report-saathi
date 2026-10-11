import { useCallback, useEffect, useState } from "react";

/** How long a picture keeps trying while the free API server wakes up, before it gives up. */
const WAKE_WAIT_MS = 75_000;

const pauseBefore = (retry: number) => Math.min(1500 * 2 ** retry, 10_000);

/** Whether a picture that failed is worth asking for again: the server is still waking up (the
 * website's forward to it fails with a gateway error, or nothing gets through) or has just woken,
 * rather than the picture being missing or refused. */
async function worthRetrying(src: string) {
  try {
    const { ok, status } = await fetch(src, { cache: "no-store" });
    return ok || (status >= 502 && status <= 504);
  } catch {
    return true;
  }
}

/**
 * An image drawn by the API that doesn't give up while the server is waking. Each source is
 * tried in turn (say a copy shipped with the website, then the API); while the server is waking,
 * the last one is asked again with growing pauses until it answers or about a minute has passed.
 */
export function useRetryingImage(sources: string[]) {
  const key = sources.join("\n");
  const [attempt, setAttempt] = useState({ key, index: 0, retry: 0, waited: 0 });
  const [state, setState] = useState<"loading" | "waiting" | "ready" | "failed">("loading");

  // A new picture starts again from its first source.
  if (attempt.key !== key) {
    setAttempt({ key, index: 0, retry: 0, waited: 0 });
    setState("loading");
  }

  const last = sources.length - 1;
  const base = sources[Math.min(attempt.index, last)];
  const src = attempt.retry ? `${base}${base.includes("?") ? "&" : "?"}try=${attempt.retry}` : base;

  const onLoad = useCallback(() => setState("ready"), []);
  const onError = useCallback(() => {
    if (attempt.index < last) {
      setAttempt((a) => ({ ...a, index: a.index + 1 }));
      return;
    }
    if (attempt.waited + pauseBefore(attempt.retry) > WAKE_WAIT_MS) {
      setState("failed");
      return;
    }
    worthRetrying(src).then((again) => setState(again ? "waiting" : "failed"));
  }, [attempt, last, src]);

  useEffect(() => {
    if (state !== "waiting") return;
    const pause = pauseBefore(attempt.retry);
    const timer = window.setTimeout(() => {
      setAttempt((a) => ({ ...a, retry: a.retry + 1, waited: a.waited + pause }));
      setState("loading");
    }, pause);
    return () => window.clearTimeout(timer);
  }, [state, attempt.retry]);

  return { src, state, onLoad, onError };
}
