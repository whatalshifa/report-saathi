import { ChevronLeft } from "lucide-react";
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
    <header>
      {back && (
        <div className="mb-4">
          <BackLink href={back.href}>{back.label}</BackLink>
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          {eyebrow && <p className="eyebrow mb-1.5">{eyebrow}</p>}
          <h1 className="page-title">{title}</h1>
          {description && <div className="page-lead">{description}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 sm:pt-1">{actions}</div>}
      </div>
    </header>
  );
}

/** "Meera Joshi’s reports" with a chevron: the one way back up, drawn the same everywhere. */
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="back-link">
      <ChevronLeft aria-hidden className="-ml-1 h-4 w-4" />
      {children}
    </Link>
  );
}
