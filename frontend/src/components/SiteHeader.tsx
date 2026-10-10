"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getMe, type User } from "@/lib/api";

const AUTH_PAGES = ["/login", "/signup"];

export function SiteHeader({ signedIn }: { signedIn: boolean }) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    if (!signedIn) return;
    getMe()
      .then(setUser)
      .catch(() => setUser(null));
  }, [signedIn]);

  const onAuthPage = AUTH_PAGES.includes(pathname);
  // A doctor opening a shared brief gets the brief alone: no way into the app or the sender's account.
  if (pathname === "/shared") {
    return (
      <header className="border-b border-line bg-background print:hidden">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
          <Logo />
          <ThemeToggle />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/90 backdrop-blur-md print:hidden">
      {user?.is_guest && (
        <div className="border-b border-line bg-brand-50 px-4 py-1.5 text-center text-[13px] leading-5 text-brand-900 dark:bg-brand-950/60 dark:text-brand-100">
          You&apos;re exploring a demo account.
          <span className="hidden sm:inline"> It&apos;s deleted after 24 hours.</span>{" "}
          <Link
            href="/signup"
            className="font-medium text-brand-700 underline underline-offset-2 hover:text-brand-900 dark:text-brand-300 dark:hover:text-brand-100"
          >
            <span className="sm:hidden">Sign up free</span>
            <span className="hidden sm:inline">Create your own free account</span>
          </Link>
        </div>
      )}
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" aria-label="ReportSaathi home" className="rounded-ctl">
          <Logo compact={signedIn} />
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {signedIn && user ? (
            <>
              {/* On phones these live in the bottom tab bar (MobileTabs). */}
              <span className="mr-2 hidden items-center gap-1 sm:flex">
                <NavLink href="/" active={pathname === "/" || pathname.startsWith("/reports")}>
                  Reports
                </NavLink>
                <NavLink
                  href="/family"
                  active={["/family", "/profiles", "/briefs"].some((p) => pathname.startsWith(p))}
                >
                  Family
                </NavLink>
              </span>
              <ThemeToggle />
              <Link
                href="/account"
                aria-label="Your account"
                aria-current={pathname === "/account" ? "page" : undefined}
                className="ml-1 flex items-center gap-2 rounded-ctl p-1 text-sm font-medium text-muted transition-colors hover:bg-stone-100 hover:text-foreground md:pr-2.5 dark:hover:bg-stone-800"
              >
                <span
                  aria-hidden
                  className="grid h-7 w-7 place-items-center rounded-full bg-brand-100 text-[13px] font-semibold text-brand-800 dark:bg-brand-900 dark:text-brand-100"
                >
                  {user.name.trim().charAt(0).toUpperCase()}
                </span>
                <span className="hidden max-w-32 truncate md:inline">{user.name}</span>
              </Link>
            </>
          ) : (
            <>
              <ThemeToggle />
              {!signedIn && !onAuthPage && (
                <>
                  <Link href="/login" className="btn btn-sm btn-ghost">
                    Sign in
                  </Link>
                  <Link href="/signup" className="btn btn-sm btn-primary">
                    Get started
                  </Link>
                </>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-ctl px-3 py-1.5 font-medium transition-colors ${
        active
          ? "bg-stone-100 text-foreground dark:bg-stone-800"
          : "text-muted hover:bg-stone-100 hover:text-foreground dark:hover:bg-stone-800"
      }`}
    >
      {children}
    </Link>
  );
}
