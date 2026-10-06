"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { SkeletonLines } from "@/components/Skeleton";
import { deleteAccount, getFeatures, getMe, logout, type User } from "@/lib/api";

export function AccountView() {
  const [user, setUser] = useState<User | null>(null);
  const [reading, setReading] = useState(true);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe().then(setUser);
    getFeatures()
      .then((f) => setReading(f.reading))
      .catch(() => {});
  }, []);

  async function signOut() {
    await logout();
    // Full page loads after signing out, so nothing from the old session stays in memory.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/");
  }

  async function removeAccount() {
    try {
      await deleteAccount();
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/signup");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the account");
    }
  }

  if (!user) return <SkeletonLines lines={4} />;

  return (
    <div className="max-w-lg space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{user.is_guest ? "Demo account" : user.name}</h1>
          <p className="text-muted">{user.is_guest ? "Temporary, deleted after 24 hours" : user.email}</p>
        </div>
        <button onClick={signOut} className="btn btn-secondary">
          Sign out
        </button>
      </header>

      <section className="card p-5 text-sm text-slate-600 dark:text-slate-300">
        <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">How your data is kept</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Report files are encrypted before they are stored, each with its own key.</li>
          {!user.is_guest && <li>Your password is stored only as a slow, salted hash (Argon2), never as text.</li>}
          <li>Only your account can see your family’s reports.</li>
          {reading ? (
            <li>Reports are sent to Claude (Anthropic) to be read, and are not used to train models.</li>
          ) : (
            <li>On this demo the AI is switched off, so no report leaves this server.</li>
          )}
        </ul>
      </section>

      {user.is_guest ? (
        <section className="card p-5">
          <h2 className="font-semibold">Keep your own reports</h2>
          <p className="mt-1 text-sm text-muted">
            This demo account and everything in it is deleted after 24 hours. Create a free account to keep your
            family&apos;s reports.
          </p>
          <Link href="/signup" className="btn btn-primary mt-4">
            Create a free account
          </Link>
        </section>
      ) : (
        <section className="rounded-2xl border border-rose-200 bg-surface p-5 dark:border-rose-900">
          <h2 className="font-semibold text-rose-800 dark:text-rose-300">Delete account</h2>
          <p className="mt-1 text-sm text-muted">
            Deletes your account, every family profile, every report and its file, and all explanations and briefs.
            This can’t be undone.
          </p>
          <label className="mt-4 block text-sm">
            Type <strong>DELETE</strong> to confirm
            <input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} className="input" />
          </label>
          {error && <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
          <button
            disabled={confirmText !== "DELETE"}
            onClick={removeAccount}
            className="btn btn-danger mt-3"
          >
            Delete everything
          </button>
        </section>
      )}
    </div>
  );
}
