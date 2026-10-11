"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { PersonAvatar } from "@/components/shell/PersonAvatar";
import { StatusPanel } from "@/components/StatusPanel";
import { AppLink, OPEN_PATHS, ShellProvider, useShell } from "@/components/shell/ShellContext";
import { RELATION_LABEL } from "@/lib/format";
import { IconBadge, IconDashboard, IconFamily, IconHome, IconInfo, IconPlus, IconReport, IconStethoscope, IconTimeline, type IconComponent } from "@/components/icons";

const BARE_PAGES = ["/login", "/signup"];

/**
 * The frame around every page. The app itself (dashboard, reports, timeline, briefs, family and the
 * reading pages) sits in a sidebar shell on computers and a top bar plus tab bar on phones. Sign-in
 * pages get a plain frame, and a doctor's shared brief gets the logo alone.
 */
export function AppShell({
  signedIn,
  demoHint,
  children,
}: {
  signedIn: boolean;
  /** A demo account was opened in this browser: show its notice from the first paint (see lib/api.ts). */
  demoHint: boolean;
  children: ReactNode;
}) {
  const pathname = usePathname();

  // The landing page brings its own header and footer.
  if (pathname === "/") return children;

  if (pathname === "/shared") {
    return (
      <>
        <header className="print:hidden">
          <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
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
            <Link href="/" aria-label="ReportSaathi home" className="rounded-full p-1">
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
      <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-[272px] print:pl-0">
        <Notice demoHint={demoHint} />
        <PhoneBar />
        <main id="main" className="mx-auto w-full max-w-[1100px] flex-1 px-4 pt-5 pb-10 sm:px-6 lg:px-10 lg:pt-8 print:p-0">
          <ShellContent>{children}</ShellContent>
        </main>
        <footer className="px-3 pb-3 print:hidden">
          <div className="mx-auto flex max-w-[1100px] flex-col gap-3 rounded-card bg-tint px-5 py-4 text-[13px] text-muted sm:px-6 lg:flex-row lg:items-center lg:justify-between">
            <p>ReportSaathi explains lab reports. It is not medical advice; always check with your doctor.</p>
            <nav aria-label="About ReportSaathi">
              <ul className="flex flex-wrap gap-x-5 gap-y-1 font-semibold">
                <li>
                  <Link href="/" className="hover:text-foreground">
                    About ReportSaathi
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

/** The page, or, when the API can't be reached, a calm note in its place (pages that need no API still show). */
function ShellContent({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { mode, retry } = useShell();
  if (mode !== "offline" || OPEN_PATHS.includes(pathname)) return children;
  return (
    <StatusPanel
      tone="offline"
      title="The server is taking a nap"
      heading="h1"
      bare
      actions={
        <>
          <button type="button" onClick={retry} className="btn btn-primary">
            Try again
          </button>
          <Link href="/" className="btn btn-secondary">
            About ReportSaathi
          </Link>
        </>
      }
    >
      ReportSaathi&apos;s server runs on a free plan that sleeps when nobody is using it, and it didn&apos;t answer
      this time. Your reports are safe. Give it a moment, then try again.
    </StatusPanel>
  );
}

type NavItem = { label: string; short: string; href: string; active: boolean; Icon: IconComponent };

function useNav(): NavItem[] {
  const pathname = usePathname();
  const { person, mode } = useShell();
  const id = person?.id;
  return [
    {
      label: "Dashboard",
      short: "Home",
      href: id && mode === "live" ? `/dashboard?profile=${id}` : "/dashboard",
      active: pathname === "/dashboard",
      Icon: IconDashboard,
    },
    { label: "Reports", short: "Reports", href: "/reports", active: pathname.startsWith("/reports"), Icon: IconReport },
    {
      label: "Timeline",
      short: "Timeline",
      href: id ? `/profiles/${id}` : "/family",
      active: pathname.startsWith("/profiles"),
      Icon: IconTimeline,
    },
    {
      label: "Doctor briefs",
      short: "Briefs",
      href: "/briefs",
      active: pathname.startsWith("/briefs"),
      Icon: IconStethoscope,
    },
    { label: "Family", short: "Family", href: "/family", active: pathname === "/family", Icon: IconFamily },
  ];
}

function Sidebar() {
  const pathname = usePathname();
  const { mode, user, profiles, person } = useShell();
  const nav = useNav();

  return (
    <aside
      aria-label="App"
      className="fixed top-3 bottom-3 left-3 z-30 hidden w-[248px] flex-col rounded-[28px] bg-sidebar lg:flex print:hidden"
    >
      <div className="flex h-[68px] shrink-0 items-center justify-between pr-3 pl-5">
        <Link href="/dashboard" aria-label="ReportSaathi dashboard" className="rounded-full">
          <Logo />
        </Link>
        <ThemeToggle />
      </div>

      <nav aria-label="Main" className="px-3">
        <ul className="space-y-1">
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
              Icon={IconBadge}
            />
          </li>
        </ul>
      </nav>

      <section aria-labelledby="people-heading" className="mt-6 min-h-0 flex-1 overflow-y-auto px-3">
        <div className="flex items-center justify-between pr-1 pb-2 pl-3">
          <h2 id="people-heading" className="text-[13px] font-bold tracking-normal text-muted">
            {mode === "sample" ? "Sample family" : "Family"}
          </h2>
          <AppLink
            href="/family"
            aria-label="Add family member"
            title="Add family member"
            className="grid h-8 w-8 place-items-center rounded-full text-brand-700 [--duo:var(--duo-coral)] hover:bg-sidebar-hover dark:text-brand-300"
          >
            <IconPlus aria-hidden className="h-[18px] w-[18px]" />
          </AppLink>
        </div>
        {profiles === null ? (
          mode !== "offline" && (
            <div className="space-y-2 px-1 pt-1" aria-hidden>
              <div className="skeleton h-11 rounded-full" />
              <div className="skeleton h-11 rounded-full" />
            </div>
          )
        ) : (
          <ul className="space-y-1">
            {profiles.map((p) => {
              const selected = p.id === person?.id;
              return (
                <li key={p.id}>
                  <AppLink
                    href={`/dashboard?profile=${p.id}`}
                    aria-current={selected && pathname === "/dashboard" ? "page" : undefined}
                    className={`flex items-center gap-2.5 rounded-full py-1.5 pr-3 pl-1.5 transition ${
                      selected ? "bg-sidebar-active shadow-soft" : "hover:bg-sidebar-hover"
                    }`}
                  >
                    <PersonAvatar name={p.name} size="chip" ring={selected} />
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-sm font-semibold">{p.name}</span>
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

      <div className="shrink-0 space-y-2 p-3">
        <SideLink label="About ReportSaathi" short="About" href="/" active={false} Icon={IconInfo} />
        <div className="flex items-center gap-2 rounded-[22px] bg-sidebar-hover/70 p-1.5 empty:hidden">
          {mode === "live" && user ? (
            <Link
              href="/account"
              aria-label="Your account"
              aria-current={pathname === "/account" ? "page" : undefined}
              className={`flex min-w-0 flex-1 items-center gap-2 rounded-full py-1 pr-2 pl-1 transition-colors ${
                pathname === "/account" ? "bg-sidebar-active" : "hover:bg-sidebar-active/70"
              }`}
            >
              <PersonAvatar name={user.name} size="md" />
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[13px] font-semibold">{user.is_guest ? "Demo account" : user.name}</span>
                <span className="block truncate text-xs text-muted">Account and data</span>
              </span>
            </Link>
          ) : mode === "loading" ? (
            // Keeps the account's place while it loads, so the links above it don't move.
            <div aria-hidden className="h-10 flex-1" />
          ) : mode === "sample" ? (
            <div className="flex flex-1 gap-1">
              <Link href="/signup" className="btn btn-primary btn-sm flex-1 px-3">
                Sign up free
              </Link>
              <Link href="/login" className="btn btn-ghost btn-sm px-3">
                Sign in
              </Link>
            </div>
          ) : null}
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
      className={`flex h-11 items-center gap-3 rounded-full pr-3 pl-1.5 text-[15px] font-semibold transition ${
        active
          ? "bg-sidebar-active text-brand-800 shadow-soft dark:text-brand-100"
          : "text-muted hover:bg-sidebar-hover hover:text-foreground"
      }`}
    >
      <span
        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
          active
            ? "bg-tint-coral text-coral-700 [--duo:var(--duo-coral)] dark:text-coral-300"
            : "[--duo:var(--duo-plum)]"
        }`}
      >
        <Icon aria-hidden className="h-[19px] w-[19px]" />
      </span>
      {label}
    </AppLink>
  );
}

function Notice({ demoHint }: { demoHint: boolean }) {
  const { mode, user } = useShell();
  const linkClass =
    "font-bold text-coral-800 underline decoration-2 underline-offset-2 hover:text-brand-950 dark:text-coral-200 dark:hover:text-white";
  const boxClass =
    "mx-3 mt-3 rounded-2xl bg-tint-coral px-4 py-2.5 text-[13.5px] leading-5 font-medium text-coral-800 sm:mx-6 sm:rounded-full sm:px-5 lg:mx-10 lg:mt-4 dark:text-coral-200 print:hidden";
  if (mode === "sample") {
    return (
      <p className={boxClass}>
        You&apos;re exploring a sample family.{" "}
        <Link href="/signup" className={linkClass}>
          Sign up free
        </Link>
        <span className="max-sm:hidden"> to add your own reports</span>.
      </p>
    );
  }
  // While the API is asked who is signed in, a demo account's notice is already shown, so the page
  // doesn't jump down when the answer comes (a run-out demo swaps it for the same-sized sample notice).
  if ((mode === "live" && user?.is_guest) || (mode === "loading" && demoHint)) {
    return (
      <p className={boxClass}>
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

/** Phones: a slim bar with the wordmark, the theme switch and the account. The tab bar does the moving around. */
function PhoneBar() {
  const pathname = usePathname();
  const { mode, user } = useShell();
  return (
    <header className="sticky top-0 z-30 bg-background/85 backdrop-blur-md lg:hidden print:hidden">
      <div className="flex h-14 items-center justify-between gap-3 px-4 sm:px-6">
        <Link href="/dashboard" aria-label="ReportSaathi dashboard" className="rounded-full">
          <Logo size="sm" />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {mode === "live" && user ? (
            <Link
              href="/account"
              aria-label="Your account"
              aria-current={pathname === "/account" ? "page" : undefined}
              className="grid h-10 w-10 place-items-center rounded-full"
            >
              <PersonAvatar name={user.name} size="chip" />
            </Link>
          ) : mode === "sample" ? (
            <Link href="/login" className="btn btn-secondary btn-sm">
              Sign in
            </Link>
          ) : null}
        </div>
      </div>
    </header>
  );
}

const TAB_ICONS: Record<string, IconComponent> = { Home: IconHome };

/** Phones move around the app from a floating tab bar at the bottom, where a thumb reaches. */
function PhoneTabs() {
  const nav = useNav();
  return (
    <>
      <div aria-hidden className="h-24 lg:hidden print:hidden" />
      <nav
        aria-label="Sections"
        className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-40 rounded-full bg-surface/95 shadow-lift backdrop-blur-md lg:hidden print:hidden"
      >
        <ul className="mx-auto grid h-[68px] max-w-lg grid-cols-5 px-1.5">
          {nav.map(({ short, href, active, Icon }) => {
            const TabIcon = TAB_ICONS[short] ?? Icon;
            return (
              <li key={short}>
                <AppLink
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-full flex-col items-center justify-center gap-1 rounded-full text-[11.5px] leading-none font-bold transition-colors ${
                    active ? "text-brand-800 dark:text-brand-100" : "text-muted hover:text-foreground"
                  }`}
                >
                  <span
                    className={`grid h-8 w-12 place-items-center rounded-full transition-colors ${
                      active
                        ? "bg-tint-coral text-coral-700 [--duo:var(--duo-coral)] dark:text-coral-300"
                        : "[--duo:var(--duo-plum)]"
                    }`}
                  >
                    <TabIcon aria-hidden className="h-5 w-5" />
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

export function OpeningToast() {
  const { opening, openError } = useShell();
  if (!opening && !openError) return null;
  return (
    <div
      role={openError ? "alert" : "status"}
      className="fixed inset-x-0 bottom-24 z-50 mx-auto flex w-fit max-w-[calc(100%-2rem)] items-center gap-3 rounded-full bg-surface px-5 py-3 text-sm font-medium shadow-lift lg:bottom-6 print:hidden"
    >
      {openError ? (
        <span className="text-rose-700 dark:text-rose-300">{openError}</span>
      ) : (
        <>
          <span
            aria-hidden
            className="h-4 w-4 shrink-0 animate-spin rounded-full border-[3px] border-coral-500 border-r-transparent"
          />
          Opening the sample family in a private demo account…
        </>
      )}
    </div>
  );
}
