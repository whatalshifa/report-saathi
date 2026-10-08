import Link from "next/link";
import type { ReactNode } from "react";

/**
 * The top of every page: an optional way back, a small label, the title, a line about the page, and
 * the page's own buttons on the right (under the title on phones). One component so every page lines up.
 */
export function PageHeader({
  back,
  eyebrow,
  title,
  description,
  actions,
}: {
  back?: { href: string; label: string };
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back && (
          <div className="mb-3">
            <BackLink href={back.href}>{back.label}</BackLink>
          </div>
        )}
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="page-title">{title}</h1>
        {description && <div className="page-lead">{description}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

/** "‹ Meera Joshi’s reports": the one way back up, drawn the same everywhere. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="back-link">
      <svg viewBox="0 0 20 20" className="-ml-1 h-4 w-4" fill="currentColor" aria-hidden>
        <path
          fillRule="evenodd"
          d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z"
          clipRule="evenodd"
        />
      </svg>
      {children}
    </Link>
  );
}
