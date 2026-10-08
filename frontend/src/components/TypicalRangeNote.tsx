import type { RangeSource } from "@/lib/api";

/**
 * Said beside any range that is a typical adult range rather than one the lab printed, so a family
 * never mistakes it for their lab's. Renders nothing for the lab's own range.
 */
export function TypicalRangeNote({
  rangeSource,
  source,
  inline = false,
}: {
  rangeSource: RangeSource | null | undefined;
  /** Where the typical range comes from; shown on hover. */
  source?: string | null;
  inline?: boolean;
}) {
  if (rangeSource !== "typical") return null;
  return (
    <span
      className={`${inline ? "ml-1 inline" : "block"} text-xs font-medium text-amber-800 dark:text-amber-300`}
      title={source ? `From ${source}` : undefined}
    >
      Typical range, not from your lab
    </span>
  );
}
