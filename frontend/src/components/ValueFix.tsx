"use client";

import { useId, useState, type FormEvent, type Ref } from "react";

import { correctResult, type TestResult } from "@/lib/api";

// Fixing a value the AI misread: a pencil beside each value opens a small form, and a
// "Corrected" chip says what it was read as. The server re-flags the value after a fix.

/** "10.6 g/dL": what the AI first read, before the person corrected it. */
export const readAs = (r: TestResult) => [r.original_value_text, r.original_unit].filter(Boolean).join(" ");

export function FixButton({
  name,
  open,
  onClick,
  ref,
}: {
  name: string;
  open: boolean;
  onClick: () => void;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      aria-label={`Fix ${name}`}
      aria-expanded={open}
      title="Read wrongly? Fix it"
      className="-my-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg align-middle text-muted transition-colors hover:bg-slate-100 hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-teal-600 dark:hover:bg-slate-800 dark:hover:text-teal-300"
    >
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} aria-hidden>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4" />
      </svg>
    </button>
  );
}

/** Shows that the person fixed this value. Phones can't hover, so they can show the old reading as text. */
export function CorrectedChip({ result, showReading = false }: { result: TestResult; showReading?: boolean }) {
  if (!result.corrected) return null;
  const reading = readAs(result) || "something else";
  const chip = (
    <span
      title={`You corrected this; it was read as ${reading}`}
      className="inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-xs font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-200"
    >
      Corrected
      {!showReading && <span className="sr-only">. You corrected this; it was read as {reading}.</span>}
    </span>
  );
  if (!showReading) return chip;
  return (
    <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted">
      {chip} It was read as {reading}.
    </span>
  );
}

export function ValueEditor({
  reportId,
  result,
  onSaved,
  onClose,
}: {
  reportId: string;
  result: TestResult;
  onSaved: (updated: TestResult) => void;
  onClose: () => void;
}) {
  const id = useId();
  const [value, setValue] = useState(result.value_text);
  const [unit, setUnit] = useState(result.unit ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (!value.trim()) {
      setError("Enter the value as it is printed on the report.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      onSaved(await correctResult(reportId, result.id, value.trim(), unit.trim()));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the fix");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={save}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
      aria-label={`Fix ${result.name}`}
      className="space-y-2 rounded-xl border border-line bg-background p-3 text-sm"
    >
      <p className="text-muted">Type it exactly as printed on the report.</p>
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-medium text-muted" htmlFor={`${id}-value`}>
          Value
          <input
            id={`${id}-value`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            autoComplete="off"
            // A full keyboard: values like "<0.5", ">1000" or "1+" are the ones most often misread.
            inputMode="text"
            maxLength={255}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className="input block w-28 px-2.5 py-1.5 text-sm"
          />
        </label>
        <label className="text-xs font-medium text-muted" htmlFor={`${id}-unit`}>
          Unit
          <input
            id={`${id}-unit`}
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            autoComplete="off"
            maxLength={50}
            className="input block w-28 px-2.5 py-1.5 text-sm"
          />
        </label>
        <div className="flex gap-2">
          <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
            {saving ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
            Cancel
          </button>
        </div>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-rose-700 dark:text-rose-300">
          {error}
        </p>
      )}
    </form>
  );
}
