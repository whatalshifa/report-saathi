import type { ReactNode } from "react";

type Tone = "empty" | "error" | "missing" | "working" | "link";

const ICONS: Record<Exclude<Tone, "working">, string> = {
  // A document tray: nothing here yet.
  empty:
    "M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z",
  // A warning triangle: something failed.
  error:
    "M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z",
  // A magnifier: looked, found nothing.
  missing: "m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z",
  // A broken link.
  link: "M13.181 8.68a4.503 4.503 0 0 1 1.903 6.405m-9.768-2.782L3.56 14.06a4.5 4.5 0 0 0 6.364 6.365l3.129-3.129m5.614-5.615 1.757-1.757a4.5 4.5 0 0 0-6.364-6.365l-4.5 4.5c-.258.26-.479.541-.661.84m1.903 6.405a4.495 4.495 0 0 1-1.242-.88 4.483 4.483 0 0 1-1.07-1.648M12 2.25V4.5m5.834.166-1.591 1.591M20.25 10.5H18M7.757 14.743l-1.59 1.59M6 10.5H3.75m4.007-4.243-1.59-1.59",
};

const TONE_STYLE: Record<Tone, string> = {
  empty: "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300",
  missing: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
  link: "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300",
  error: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  working: "bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300",
};

/**
 * One look for every "nothing here", "something went wrong" and "still working" moment: an icon in a
 * soft circle, a title, a plain sentence and, when there is one, the next thing to do.
 */
export function StatusPanel({
  tone,
  title,
  children,
  actions,
  heading = "h2",
  bare = false,
}: {
  tone: Tone;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  heading?: "h1" | "h2" | "p";
  /** Without the card around it, for pages that are only this message (404, a dead link). */
  bare?: boolean;
}) {
  const Heading = heading;
  return (
    <div
      role={tone === "error" ? "alert" : tone === "working" ? "status" : undefined}
      className={`flex flex-col items-center px-6 text-center ${bare ? "py-16 sm:py-20" : "card py-10"}`}
    >
      <span aria-hidden className={`grid h-10 w-10 place-items-center rounded-ctl ${TONE_STYLE[tone]}`}>
        {tone === "working" ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
        ) : (
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={1.6}>
            <path strokeLinecap="round" strokeLinejoin="round" d={ICONS[tone]} />
          </svg>
        )}
      </span>
      <Heading
        className={`mt-4 font-semibold tracking-tight text-balance ${bare ? "text-[26px] sm:text-[30px]" : "text-[17px]"}`}
      >
        {title}
      </Heading>
      {children && <div className="mt-1.5 max-w-md text-sm text-pretty text-muted">{children}</div>}
      {actions && <div className="mt-6 flex flex-wrap justify-center gap-3">{actions}</div>}
    </div>
  );
}

/** A page's main data didn't load: say so plainly and offer to try again. */
export function LoadError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <StatusPanel
      tone="error"
      title="This didn’t load"
      actions={
        <button type="button" onClick={onRetry ?? (() => window.location.reload())} className="btn btn-primary">
          Try again
        </button>
      }
    >
      {message}
    </StatusPanel>
  );
}
