import Link from "next/link";
import type { ReactNode } from "react";

export interface ViewTab {
  href: string;
  label: ReactNode;
  current: boolean;
  /** A small number after the label, such as how many results the view holds. */
  count?: number;
}

/**
 * A segmented control that splits a long page into views. Each view is a plain link with its own
 * address (`?tab=…`), so it can be shared, bookmarked and reached with the back button.
 */
export function ViewTabs({ label, tabs, className = "" }: { label: string; tabs: ViewTab[]; className?: string }) {
  return (
    <nav aria-label={label} className={`max-w-full print:hidden ${className}`}>
      <ul className="flex w-fit max-w-full gap-0.5 rounded-full bg-tint p-1">
        {tabs.map((tab) => (
          <li key={tab.href} className="min-w-0">
            <Link
              href={tab.href}
              scroll={false}
              aria-current={tab.current ? "page" : undefined}
              className={`flex h-9 items-center gap-1.5 rounded-full px-3.5 text-sm whitespace-nowrap transition-colors ${
                tab.current
                  ? "bg-surface font-semibold text-foreground shadow-soft dark:bg-brand-800"
                  : "font-medium text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`rounded-full px-1.5 text-xs leading-5 font-semibold tabular-nums ${
                    tab.current ? "bg-tint-coral text-coral-800 dark:text-coral-200" : "bg-tint-strong"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
