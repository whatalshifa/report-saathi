"use client";

import Link from "next/link";
import { useState } from "react";

import { DemoButton } from "@/components/DemoButton";
import { LogoMark } from "@/components/Logo";
import { login, signup } from "@/lib/api";

/** Only go back to a page on this site, never to an address someone put in the link. */
function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
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
    <div className="mx-auto grid max-w-4xl overflow-hidden rounded-3xl border border-line bg-surface shadow-sm md:grid-cols-2">
      <aside className="hidden flex-col justify-between bg-teal-800 p-10 text-teal-50 md:flex dark:bg-teal-950">
        <LogoMark className="h-10 w-10" />
        <div>
          <p className="text-2xl font-semibold text-white">Every value read. Every flag explained.</p>
          <ul className="mt-6 space-y-3 text-sm text-teal-100">
            <li>✓ Reads photos and PDFs from any lab</li>
            <li>✓ Explains results in English, Hindi and Marathi</li>
            <li>✓ Tracks your family&apos;s results across labs</li>
            <li>✓ Files encrypted, visible only to you</li>
          </ul>
        </div>
        <p className="text-xs text-teal-200/80">Not medical advice. Always check with your doctor.</p>
      </aside>
      <div className="p-6 sm:p-10">
      <h1 className="text-2xl font-bold tracking-tight">{isSignup ? "Create your account" : "Sign in"}</h1>
      <p className="mt-1 text-muted">
        {isSignup
          ? "Keep your family’s lab reports in one private place."
          : "Welcome back. Your reports are waiting."}
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {isSignup && (
          <label className="block text-sm font-medium">
            Your name
            <input name="name" required maxLength={100} autoComplete="name" className="input" />
          </label>
        )}
        <label className="block text-sm font-medium">
          Email
          <input name="email" type="email" required autoComplete="email" className="input" />
        </label>
        <label className="block text-sm font-medium">
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
            <span className="mt-1 block font-normal text-muted">
              At least 10 characters. A short phrase is easier to remember than a jumble.
            </span>
          )}
        </label>
        {error && (
          <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
            {error}
          </p>
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
        <button disabled={busy} className="btn btn-primary w-full py-3">
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
        <p className="text-sm text-muted">Just looking around?</p>
        <div className="mt-3">
          <DemoButton className="btn btn-secondary" label="Open the demo account" />
        </div>
      </div>
      </div>
    </div>
  );
}
