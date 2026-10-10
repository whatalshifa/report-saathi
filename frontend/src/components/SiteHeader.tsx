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
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Logo />
          <ThemeToggle />
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-background/95 backdrop-blur-lg print:hidden">
      {user?.is_guest && (
        <div className="bg-brand-800 px-4 py-2 text-center text-sm text-brand-50 dark:bg-brand-900">
          You&apos;re exploring a demo account. It&apos;s deleted after 24 hours.{" "}
          <Link href="/signup" className="font-semibold underline underline-offset-4">
            Create your own free account
          </Link>
        </div>
      )}
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Link href="/" aria-label="ReportSaathi home" className="rounded-lg">
          <Logo compact={signedIn} />
        </Link>
        <nav className="flex items-center gap-1 text-sm sm:gap-2">
          {signedIn && user ? (
            <>
              {/* On phones these live in the bottom tab bar (MobileTabs). */}
              <span className="hidden items-center gap-1 sm:flex sm:gap-2">
                <NavLink href="/" active={pathname === "/"}>
                  Reports
                </NavLink>
                <NavLink href="/family" active={pathname === "/family"}>
                  Family
                </NavLink>
              </span>
              <ThemeToggle />
              <Link
                href="/account"
                aria-label="Your account"
                className="ml-1 flex items-center gap-2 rounded-full p-1 text-sm font-medium text-muted transition-colors hover:bg-stone-100 hover:text-foreground md:pr-3 dark:hover:bg-stone-800"
              >
                <span
                  aria-hidden
                  className="grid h-8 w-8 place-items-center rounded-full bg-brand-100 text-sm font-semibold text-brand-800 dark:bg-brand-900 dark:text-brand-100"
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
                  <Link href="/login" className="btn btn-sm btn-ghost hidden sm:inline-flex">
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
      className={`rounded-lg px-3 py-2 font-medium transition-colors ${
        active
          ? "bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200"
          : "text-muted hover:bg-stone-100 hover:text-foreground dark:hover:bg-stone-800"
      }`}
    >
      {children}
    </Link>
  );
}
