"use client";

import { Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { DemoButton } from "@/components/DemoButton";
import { LogoMark } from "@/components/Logo";
import { ErrorNote } from "@/components/Skeleton";
import { login, signup } from "@/lib/api";

const HERE = "https://reportsaathi.invalid";

const POINTS = [
  "Reads photos and PDFs from any lab",
  "Explains results in English, Hindi and Marathi",
  "Tracks your family’s results across labs",
  "Files encrypted, visible only to you",
];

/**
 * Only go back to a page on this site, never to an address someone put in the link. Browsers read
 * "/\evil.com" (and "/<tab>/evil.com") as "//evil.com", so the address is resolved the way a browser
 * would, against a stand-in origin, and kept only if it stays there.
 */
function safeNext(next: string | undefined) {
  if (!next?.startsWith("/")) return "/dashboard";
  try {
    const url = new URL(next, HERE);
    return url.origin === HERE ? url.pathname + url.search + url.hash : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

export function AuthForm({ mode, next }: { mode: "login" | "signup"; next?: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isSignup = mode === "signup";

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email"));
    const password = String(form.get("password"));
    setBusy(true);
    setError(null);
    try {
      if (isSignup) await signup(String(form.get("name")), email, password);
      else await login(email, password);
      // A full page load, so every part of the page sees the new sign-in.
      window.location.assign(safeNext(next));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto grid max-w-4xl overflow-hidden rounded-card border border-line bg-surface md:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-brand-800 p-10 text-brand-50 md:flex dark:bg-brand-950">
        <span className="flex items-center gap-2.5 text-lg font-semibold tracking-tight text-white">
          <LogoMark className="h-9 w-9 rounded-[10px] ring-1 ring-white/25" />
          ReportSaathi
        </span>
        <div>
          <p className="text-2xl font-semibold text-white">Every value read. Every flag explained.</p>
          <ul className="mt-6 space-y-3 text-sm text-brand-50">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3">
                <Check aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-brand-300" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-brand-100/80">Not medical advice. Always check with your doctor.</p>
      </aside>
      <div className="p-6 sm:p-10">
      <h1 className="page-title">{isSignup ? "Create your account" : "Sign in"}</h1>
      <p className="mt-2 text-muted">
        {isSignup
          ? "Keep your family’s lab reports in one private place."
          : "Welcome back. Your reports are waiting."}
      </p>
      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {isSignup && (
          <label className="label">
            Your name
            <input name="name" required maxLength={100} autoComplete="name" className="input" />
          </label>
        )}
        <label className="label">
          Email
          <input name="email" type="email" required autoComplete="email" className="input" />
        </label>
        <label className="label">
          Password
          <input
            name="password"
            type="password"
            required
            minLength={isSignup ? 10 : undefined}
            maxLength={128}
            autoComplete={isSignup ? "new-password" : "current-password"}
            className="input"
          />
          {isSignup && (
            <span className="hint">
              At least 10 characters. A short phrase is easier to remember than a jumble.
            </span>
          )}
        </label>
        {error && (
          <ErrorNote message={error} />
        )}
        {isSignup && (
          <p className="text-sm text-muted">
            Your reports are encrypted and only you can see them. Read how we look after them on our{" "}
            <Link href="/privacy" className="link">
              privacy page
            </Link>
            .
          </p>
        )}
        <button disabled={busy} className="btn btn-primary btn-lg w-full">
          {busy ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-sm text-muted">
        {isSignup ? "Already have an account? " : "New to ReportSaathi? "}
        <Link href={isSignup ? "/login" : "/signup"} className="link">
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>
      <div className="mt-8 border-t border-line pt-6">
        <p className="text-sm text-muted">Just looking around? Open a private sample account, nothing to fill in.</p>
        <div className="mt-3">
          <DemoButton full className="btn btn-secondary w-full sm:w-auto" label="Open the demo account" next={safeNext(next)} />
        </div>
      </div>
      </div>
    </div>
  );
}
