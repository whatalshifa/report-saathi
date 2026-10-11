"use client";

import { useState } from "react";

/**
 * The first `first` items of a list that can grow long, and `step` more each time more are asked for.
 * Spread the result into `ShowMoreButton`.
 */
export function useShowMore<T>(items: T[], first: number, step = first) {
  const [limit, setLimit] = useState(first);
  const hidden = Math.max(items.length - limit, 0);
  return {
    shown: items.slice(0, limit),
    hidden,
    next: Math.min(hidden, step),
    more: () => setLimit((current) => current + step),
  };
}

/** "Show 20 more reports", "Show the last 3 links", or nothing once everything is showing. */
export function ShowMoreButton({
  hidden,
  next,
  more,
  noun,
  className = "",
}: {
  hidden: number;
  next: number;
  more: () => void;
  /** Singular and plural, e.g. ["report", "reports"]. */
  noun: [string, string];
  className?: string;
}) {
  if (hidden === 0) return null;
  const count = next === hidden ? (hidden === 1 ? "the last" : `the last ${hidden}`) : `${next} more`;
  return (
    <button type="button" onClick={more} className={`btn btn-secondary btn-sm ${className}`}>
      Show {count} {next === 1 ? noun[0] : noun[1]}
    </button>
  );
}
