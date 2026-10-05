"use client";

import Link from "next/link";
import { useState } from "react";

import { login, signup } from "@/lib/api";

/** Only go back to a page on this site, never to an address someone put in the link. */
function safeNext(next: string | undefined) {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

const input =
  "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-600/20 dark:border-slate-700 dark:bg-slate-900";

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
    <div className="mx-auto max-w-sm">
      <h1 className="text-2xl font-bold">{isSignup ? "Create your account" : "Sign in"}</h1>
      <p className="mt-1 text-slate-600 dark:text-slate-400">
        {isSignup
          ? "Keep your family’s lab reports in one private place."
          : "Welcome back. Your reports are waiting."}
      </p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        {isSignup && (
          <label className="block text-sm font-medium">
            Your name
            <input name="name" required maxLength={100} autoComplete="name" className={input} />
          </label>
        )}
        <label className="block text-sm font-medium">
          Email
          <input name="email" type="email" required autoComplete="email" className={input} />
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
            className={input}
          />
          {isSignup && (
            <span className="mt-1 block font-normal text-slate-500">
              At least 10 characters. A short phrase is easier to remember than a jumble.
            </span>
          )}
        </label>
        {error && (
          <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">
            {error}
          </p>
        )}
        <button
          disabled={busy}
          className="w-full rounded-lg bg-teal-700 px-4 py-2.5 font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {busy ? "Please wait…" : isSignup ? "Create account" : "Sign in"}
        </button>
      </form>
      <p className="mt-6 text-sm text-slate-600 dark:text-slate-400">
        {isSignup ? "Already have an account? " : "New to ReportSaathi? "}
        <Link
          href={isSignup ? "/login" : "/signup"}
          className="font-medium text-teal-700 hover:underline dark:text-teal-400"
        >
          {isSignup ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </div>
  );
}
