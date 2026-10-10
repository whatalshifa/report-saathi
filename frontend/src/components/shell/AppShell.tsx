"use client";

import {
  Activity,
  BadgeCheck,
  FileText,
  House,
  Info,
  LayoutDashboard,
  Plus,
  Stethoscope,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Logo, LogoMark } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PersonAvatar } from "@/components/shell/PersonAvatar";
import { AppLink, ShellProvider, useShell } from "@/components/shell/ShellContext";
import { RELATION_LABEL } from "@/lib/format";

const BARE_PAGES = ["/login", "/signup"];

/**
 * The frame around every page. The app itself (dashboard, reports, timeline, briefs, family and the
 * reading pages) sits in a sidebar shell on computers and a top bar plus tab bar on phones. Sign-in
 * pages get a plain frame, and a doctor's shared brief gets the logo alone.
 */
export function AppShell({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/shared") {
    return (
      <>
        <header className="border-b border-line bg-background print:hidden">
          <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
            <Logo />
            <ThemeToggle />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6 print:py-0">
          {children}
        </main>
      </>
    );
  }

  if (BARE_PAGES.includes(pathname)) {
    return (
      <>
        <header className="print:hidden">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
            <Link href="/" aria-label="ReportSaathi home" className="rounded-ctl">
              <Logo />
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-16 sm:px-6 sm:pt-8">
          {children}
        </main>
      </>
    );
  }

  return (
    <ShellProvider signedIn={signedIn}>
      <Sidebar />
      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-60 print:pl-0">
        <Notice />
        <PhoneBar />
        <main id="main" className="mx-auto w-full max-w-[1100px] flex-1 px-4 pt-5 pb-10 sm:px-6 lg:px-10 lg:pt-8 print:p-0">
          {children}
        </main>
        <footer className="border-t border-line print:hidden">
          <div className="mx-auto flex max-w-[1100px] flex-col gap-3 px-4 py-5 text-[13px] text-muted sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
            <p>ReportSaathi explains lab reports. It is not medical advice; always check with your doctor.</p>
            <nav aria-label="About ReportSaathi">
              <ul className="flex flex-wrap gap-x-5 gap-y-1">
                <li>
                  <Link href="/about" className="hover:text-foreground">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="hover:text-foreground">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="/accuracy" className="hover:text-foreground">
                    Accuracy
                  </Link>
                </li>
                <li>
                  <a href="https://github.com/whatalshifa/report-saathi" className="hover:text-foreground">
                    Source code
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </footer>
        <PhoneTabs />
      </div>
      <OpeningToast />
    </ShellProvider>
  );
}

type NavItem = { label: string; short: string; href: string; active: boolean; Icon: LucideIcon };

function useNav(): NavItem[] {
  const pathname = usePathname();
  const { person, mode } = useShell();
  const id = person?.id;
  return [
    {
      label: "Dashboard",
      short: "Home",
      href: id && mode === "live" ? `/?profile=${id}` : "/",
      active: pathname === "/",
      Icon: LayoutDashboard,
    },
    { label: "Reports", short: "Reports", href: "/reports", active: pathname.startsWith("/reports"), Icon: FileText },
    {
      label: "Timeline",
      short: "Timeline",
      href: id ? `/profiles/${id}` : "/family",
      active: pathname.startsWith("/profiles"),
      Icon: Activity,
    },
    {
      label: "Doctor briefs",
      short: "Briefs",
      href: "/briefs",
      active: pathname.startsWith("/briefs"),
      Icon: Stethoscope,
    },
    { label: "Family", short: "Family", href: "/family", active: pathname === "/family", Icon: Users },
  ];
}

function Sidebar() {
  const pathname = usePathname();
  const { mode, user, profiles, person } = useShell();
  const nav = useNav();

  return (
    <aside
      aria-label="App"
      className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-line bg-sidebar lg:flex print:hidden"
    >
      <div className="flex h-14 shrink-0 items-center px-4">
        <Link href="/" aria-label="ReportSaathi home" className="rounded-ctl">
          <Logo size="sm" />
        </Link>
      </div>

      <nav aria-label="Main" className="px-2.5 pt-1">
        <ul className="space-y-px">
          {nav.map((item) => (
            <li key={item.label}>
              <SideLink {...item} />
            </li>
          ))}
          <li>
            <SideLink
              label="Accuracy"
              short="Accuracy"
              href="/accuracy"
              active={pathname === "/accuracy"}
              Icon={BadgeCheck}
            />
          </li>
        </ul>
      </nav>

      <section aria-labelledby="people-heading" className="mt-6 min-h-0 flex-1 overflow-y-auto px-2.5">
        <div className="flex items-center justify-between px-2 pb-1.5">
          <h2 id="people-heading" className="text-xs font-medium text-muted">
            {mode === "sample" ? "Sample family" : "Family"}
          </h2>
          <AppLink
            href="/family"
            aria-label="Add family member"
            title="Add family member"
            className="grid h-6 w-6 place-items-center rounded-md text-muted hover:bg-sidebar-hover hover:text-foreground"
          >
            <Plus aria-hidden className="h-3.5 w-3.5" />
          </AppLink>
        </div>
        {profiles === null ? (
          <div className="space-y-2 px-2 pt-1" aria-hidden>
            <div className="skeleton h-8" />
            <div className="skeleton h-8" />
          </div>
        ) : (
          <ul className="space-y-px">
            {profiles.map((p) => {
              const selected = p.id === person?.id;
              return (
                <li key={p.id}>
                  <AppLink
                    href={`/?profile=${p.id}`}
                    aria-current={selected && pathname === "/" ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors ${
                      selected ? "bg-sidebar-active shadow-[0_0_0_1px_var(--border)]" : "hover:bg-sidebar-hover"
                    }`}
                  >
                    <PersonAvatar name={p.name} />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-[13px] font-medium">{p.name}</span>
                      <span className="block truncate text-xs text-muted">
                        {p.is_sample ? "Sample" : RELATION_LABEL[p.relation]}
                        {p.report_count > 0 && ` · ${p.report_count} report${p.report_count === 1 ? "" : "s"}`}
                      </span>
                    </span>
                  </AppLink>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="shrink-0 space-y-2 border-t border-line p-2.5">
        <SideLink label="About ReportSaathi" short="About" href="/about" active={pathname === "/about"} Icon={Info} />
        <div className="flex items-center gap-1">
          {mode === "live" && user ? (
            <Link
              href="/account"
              aria-label="Your account"
              aria-current={pathname === "/account" ? "page" : undefined}
              className={`flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors ${
                pathname === "/account" ? "bg-sidebar-active" : "hover:bg-sidebar-hover"
              }`}
            >
              <PersonAvatar name={user.name} size="sm" />
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[13px] font-medium">{user.is_guest ? "Demo account" : user.name}</span>
                <span className="block truncate text-xs text-muted">Account and data</span>
              </span>
            </Link>
          ) : mode === "sample" ? (
            <div className="flex flex-1 gap-1.5">
              <Link href="/signup" className="btn btn-primary btn-sm flex-1">
                Sign up free
              </Link>
              <Link href="/login" className="btn btn-ghost btn-sm">
                Sign in
              </Link>
            </div>
          ) : (
            <div className="flex-1" />
          )}
          <ThemeToggle />
        </div>
      </div>
    </aside>
  );
}

function SideLink({ label, href, active, Icon }: NavItem) {
  return (
    <AppLink
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex h-8 items-center gap-2.5 rounded-lg px-2 text-[13.5px] transition-colors ${
        active
          ? "bg-sidebar-active font-medium text-foreground shadow-[0_0_0_1px_var(--border)]"
          : "text-muted hover:bg-sidebar-hover hover:text-foreground"
      }`}
    >
      <Icon
        aria-hidden
        className={`h-4 w-4 shrink-0 ${active ? "text-brand-700 dark:text-brand-300" : ""}`}
        strokeWidth={1.85}
      />
      {label}
    </AppLink>
  );
}

function Notice() {
  const { mode, user } = useShell();
  const linkClass =
    "font-medium text-brand-800 underline underline-offset-2 hover:text-brand-950 dark:text-brand-200 dark:hover:text-white";
  if (mode === "sample") {
    return (
      <p className="border-b border-brand-100 bg-brand-50 px-4 py-2 text-[13px] leading-5 text-brand-900 sm:px-6 lg:px-10 dark:border-brand-900/60 dark:bg-brand-950/50 dark:text-brand-100 print:hidden">
        You&apos;re exploring a sample family.{" "}
        <Link href="/signup" className={linkClass}>
          Sign up free
        </Link>
        <span className="max-sm:hidden"> to add your own reports</span>.
      </p>
    );
  }
  if (mode === "live" && user?.is_guest) {
    return (
      <p className="border-b border-brand-100 bg-brand-50 px-4 py-2 text-[13px] leading-5 text-brand-900 sm:px-6 lg:px-10 dark:border-brand-900/60 dark:bg-brand-950/50 dark:text-brand-100 print:hidden">
        You&apos;re exploring a demo account.
        <span className="hidden sm:inline"> It&apos;s deleted after 24 hours.</span>{" "}
        <Link href="/signup" className={linkClass}>
          <span className="sm:hidden">Sign up free</span>
          <span className="hidden sm:inline">Create your own free account</span>
        </Link>
      </p>
    );
  }
  return null;
}

/** Phones: a slim bar with the logo, the theme switch and the account. The tab bar does the moving around. */
function PhoneBar() {
  const pathname = usePathname();
  const { mode, user } = useShell();
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-background/90 backdrop-blur-md lg:hidden print:hidden">
      <div className="flex h-12 items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/" aria-label="ReportSaathi home" className="flex items-center gap-2 rounded-ctl">
          <LogoMark className="h-6 w-6" />
          <span className="text-[15px] font-semibold tracking-[-0.01em]">ReportSaathi</span>
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {mode === "live" && user ? (
            <Link
              href="/account"
              aria-label="Your account"
              aria-current={pathname === "/account" ? "page" : undefined}
              className="grid h-9 w-9 place-items-center rounded-full"
            >
              <PersonAvatar name={user.name} />
            </Link>
          ) : mode === "sample" ? (
            <Link href="/login" className="btn btn-ghost btn-sm">
              Sign in
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}

const TAB_ICONS: Record<string, LucideIcon> = { Home: House };

/** Phones move around the app from a tab bar at the bottom, where a thumb reaches, like an installed app. */
function PhoneTabs() {
  const nav = useNav();
  return (
    <>
      <div aria-hidden className="h-16 lg:hidden print:hidden" />
      <nav
        aria-label="Sections"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden print:hidden"
      >
        <ul className="mx-auto grid h-16 max-w-lg grid-cols-5">
          {nav.map(({ short, href, active, Icon }) => {
            const TabIcon = TAB_ICONS[short] ?? Icon;
            return (
              <li key={short}>
                <AppLink
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-full flex-col items-center justify-center gap-1 text-[11px] leading-none font-medium transition-colors ${
                    active ? "text-brand-700 dark:text-brand-300" : "text-muted hover:text-foreground"
                  }`}
                >
                  <span
                    className={`grid h-7 w-12 place-items-center rounded-full transition-colors ${
                      active ? "bg-brand-100 dark:bg-brand-900/70" : ""
                    }`}
                  >
                    <TabIcon aria-hidden className="h-[18px] w-[18px]" strokeWidth={active ? 2.1 : 1.8} />
                  </span>
                  {short}
                </AppLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}

function OpeningToast() {
  const { opening, openError } = useShell();
  if (!opening && !openError) return null;
  return (
    <div
      role={openError ? "alert" : "status"}
      className="fixed inset-x-0 bottom-20 z-50 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-3 rounded-ctl border border-line bg-surface px-4 py-2.5 text-sm shadow-lg lg:bottom-6 print:hidden"
    >
      {openError ? (
        <span className="text-rose-700 dark:text-rose-300">{openError}</span>
      ) : (
        <>
          <span
            aria-hidden
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-brand-600 border-r-transparent"
          />
          Opening the sample family in a private demo account…
        </>
      )}
    </div>
  );
}
