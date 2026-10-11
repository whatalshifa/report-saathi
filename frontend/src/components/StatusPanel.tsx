import type { ReactNode } from "react";

import { IconAlert, IconFileSearch, IconLink, IconUpload, type IconComponent } from "@/components/icons";

type Tone = "empty" | "error" | "missing" | "working" | "link";

const ICONS: Record<Exclude<Tone, "working">, IconComponent> = {
  empty: IconUpload, // nothing here yet: add something
  error: IconAlert,
  missing: IconFileSearch, // looked, found nothing
  link: IconLink,
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
      <span aria-hidden className={`grid h-14 w-14 place-items-center rounded-full ${TONE_STYLE[tone]}`}>
        {tone === "working" ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent" />
        ) : (
          (() => {
            const Icon = ICONS[tone];
            return <Icon className="h-6 w-6" />;
          })()
        )}
      </span>
      <Heading
        className={`mt-4 font-extrabold tracking-[-0.02em] text-balance ${bare ? "text-[26px] sm:text-[30px]" : "text-[17px]"}`}
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
