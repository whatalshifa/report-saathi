"use client";

import Link from "next/link";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react";

import sample from "@/data/sample-family.json";
import { checkHealth, getMe, listProfiles, listReports, startDemo, type Profile, type User } from "@/lib/api";

/**
 * Signed-out visitors land in the app with a sample family already open (`sample`): the same screens a
 * signed-in person sees, drawn from a saved copy of the demo account. The first click on anything that
 * needs an account opens a real demo account and goes to the same place in it (`openLive`).
 */
export type ShellMode = "loading" | "sample" | "live";

export const SAMPLE_PROFILES = sample.profiles as Profile[];
const SAMPLE_ID = /sample-(meera|\d{4}-\d{2}-\d{2})/;
const PERSON_KEY = "rs-person";

interface Shell {
  mode: ShellMode;
  user: User | null;
  /** Everyone in the family, or null while loading. */
  profiles: Profile[] | null;
  reloadProfiles: () => void;
  /** The person the sidebar and the person-scoped links (timeline, briefs) point at. */
  person: Profile | null;
  selectPerson: (id: string) => void;
  /** Opens a demo account and goes to `href` in it, with the sample ids swapped for the real ones. */
  openLive: (href: string) => void;
  opening: boolean;
  openError: string | null;
}

const ShellContext = createContext<Shell | null>(null);

export function useShell(): Shell {
  const shell = useContext(ShellContext);
  if (!shell) throw new Error("useShell outside ShellProvider");
  return shell;
}

/** Marks a person as the one being looked at, so the sidebar and tab bar follow along. */
export function useSelectPerson(id: string | undefined) {
  const { selectPerson } = useShell();
  useEffect(() => {
    if (id) selectPerson(id);
  }, [id, selectPerson]);
}

/** With no person picked, open on someone who has reports rather than an empty page. */
export function pickProfile(profiles: Profile[], profileId?: string | null): Profile {
  return (
    profiles.find((p) => p.id === profileId) ??
    profiles.find((p) => p.relation === "self" && p.report_count > 0) ??
    profiles.find((p) => p.report_count > 0) ??
    profiles[0]
  );
}

function readSaved(): string | null {
  try {
    return localStorage.getItem(PERSON_KEY);
  } catch {
    return null;
  }
}

export function ShellProvider({ signedIn, children }: { signedIn: boolean; children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(signedIn ? undefined : null);
  const [profiles, setProfiles] = useState<Profile[] | null>(signedIn ? null : SAMPLE_PROFILES);
  const [round, setRound] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [opening, setOpening] = useState(false);
  const [openError, setOpenError] = useState<string | null>(null);

  const mode: ShellMode = user === undefined ? "loading" : user ? "live" : "sample";

  useEffect(() => {
    if (!signedIn) {
      // Wake the free server now, so the first click into the demo is quick.
      checkHealth().catch(() => {});
      return;
    }
    let cancelled = false;
    getMe()
      .then(async (me) => {
        if (cancelled) return;
        setUser(me);
        if (!me) setProfiles(SAMPLE_PROFILES);
        else {
          const list = await listProfiles();
          if (!cancelled) setProfiles(list);
        }
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      });
    return () => {
      cancelled = true;
    };
  }, [signedIn, round]);

  useEffect(() => {
    // Read after mounting: the server can't know what this browser picked last time.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSelectedId((current) => current ?? readSaved());
  }, []);

  const reloadProfiles = useCallback(() => setRound((r) => r + 1), []);
  const selectPerson = useCallback((id: string) => {
    setSelectedId(id);
    try {
      localStorage.setItem(PERSON_KEY, id);
    } catch {}
  }, []);

  const openLive = useCallback(async (href: string) => {
    setOpening(true);
    setOpenError(null);
    try {
      await checkHealth();
      await startDemo();
      let target = href;
      if (SAMPLE_ID.test(href)) {
        const real = (await listProfiles()).find((p) => p.is_sample);
        if (!real) throw new Error("The sample family is missing from the demo");
        const reports = /sample-\d{4}/.test(href) ? await listReports(real.id) : [];
        target = href.replace(new RegExp(SAMPLE_ID.source, "g"), (_, key: string) =>
          key === "meera" ? real.id : (reports.find((r) => r.report_date === key)?.id ?? real.id),
        );
        // A report that can't be matched falls back to the person's dashboard.
        if (target.startsWith("/reports/") && target.endsWith(real.id)) target = `/dashboard?profile=${real.id}`;
      }
      // A full page load, so every part of the page sees the new sign-in.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign(target);
    } catch (err) {
      setOpenError(err instanceof Error ? err.message : "Could not open the demo");
      setOpening(false);
    }
  }, []);

  const person = profiles && profiles.length > 0 ? pickProfile(profiles, selectedId) : null;

  const value = useMemo<Shell>(
    () => ({
      mode,
      user: user ?? null,
      profiles,
      reloadProfiles,
      person,
      selectPerson,
      openLive,
      opening,
      openError,
    }),
    [mode, user, profiles, reloadProfiles, person, selectPerson, openLive, opening, openError],
  );

  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>;
}

// Pages that read the same signed in or out. Everything else, in the sample, needs the demo account.
const OPEN_PATHS = ["/privacy", "/accuracy", "/login", "/signup"];

function needsAccount(href: string): boolean {
  if (!href.startsWith("/")) return false;
  // The landing page and the sample dashboard itself are open to everyone; a person's dashboard opens the demo.
  if (href === "/" || href === "/dashboard") return false;
  const path = href.split(/[?#]/)[0];
  return !OPEN_PATHS.includes(path);
}

/**
 * A link inside the app. In the sample family, links into private pages open the demo account first
 * and then land on the same page there; everywhere else it is a plain link.
 */
export function AppLink({ href, onClick, ...props }: Omit<ComponentProps<typeof Link>, "href"> & { href: string }) {
  const { mode, openLive } = useShell();
  if (mode === "sample" && needsAccount(href)) {
    return (
      <a
        href={href}
        {...props}
        onClick={(event) => {
          onClick?.(event);
          if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey) return;
          event.preventDefault();
          openLive(href);
        }}
      />
    );
  }
  return <Link href={href} onClick={onClick} {...props} />;
}
