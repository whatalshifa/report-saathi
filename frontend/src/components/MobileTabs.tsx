"use client";

import { FileText, UserRound, Users, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: { href: string; label: string; also: string[]; Icon: LucideIcon }[] = [
  { href: "/", label: "Reports", also: ["/reports"], Icon: FileText },
  { href: "/family", label: "Family", also: ["/profiles", "/briefs"], Icon: Users },
  { href: "/account", label: "Account", also: [], Icon: UserRound },
];

/**
 * On phones, a signed-in person moves around the app from a tab bar at the bottom of the screen, where a
 * thumb reaches, like an installed app. Larger screens keep the links in the header instead.
 */
export function MobileTabs({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  if (!signedIn || pathname === "/shared") return null;
  return (
    <>
      <div aria-hidden className="h-16 sm:hidden print:hidden" />
      <nav
        aria-label="App"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md sm:hidden print:hidden"
      >
        <ul className="mx-auto grid h-14 max-w-md grid-cols-3">
          {TABS.map(({ href, label, also, Icon }) => {
            const active =
              (href === "/" ? pathname === "/" : pathname.startsWith(href)) ||
              also.some((prefix) => pathname.startsWith(prefix));
            return (
              <li key={href} className="relative">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] leading-none font-medium transition-colors ${
                    active ? "text-brand-700 dark:text-brand-300" : "text-muted hover:text-foreground"
                  }`}
                >
                  {active && (
                    <span aria-hidden className="absolute inset-x-8 top-0 h-0.5 rounded-b bg-brand-700 dark:bg-brand-300" />
                  )}
                  <Icon aria-hidden className="h-5 w-5" strokeWidth={active ? 2 : 1.75} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
