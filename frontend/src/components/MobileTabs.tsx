"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  {
    href: "/",
    label: "Reports",
    also: ["/reports"],
    icon: "M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z",
  },
  {
    href: "/family",
    label: "Family",
    also: ["/profiles", "/briefs"],
    icon: "M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z",
  },
  {
    href: "/account",
    label: "Account",
    also: [],
    icon: "M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z",
  },
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
      <div aria-hidden className="h-20 sm:hidden print:hidden" />
      <nav
        aria-label="App"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-lg sm:hidden print:hidden"
      >
        <ul className="mx-auto grid max-w-md grid-cols-3">
          {TABS.map((tab) => {
            const active =
              (tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href)) ||
              tab.also.some((prefix) => pathname.startsWith(prefix));
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-col items-center gap-0.5 py-2.5 text-xs font-semibold ${
                    active ? "text-brand-700 dark:text-brand-300" : "text-muted"
                  }`}
                >
                  <span
                    className={`grid h-8 w-14 place-items-center rounded-full transition-colors ${
                      active ? "bg-brand-100 dark:bg-brand-900" : ""
                    }`}
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                    </svg>
                  </span>
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
