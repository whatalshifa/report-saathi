"use client";

import { useEffect, useState } from "react";

import { deleteAccount, getMe, logout, type User } from "@/lib/api";

export function AccountView() {
  const [user, setUser] = useState<User | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMe().then(setUser);
  }, []);

  async function signOut() {
    await logout();
    // Full page loads after signing out, so nothing from the old session stays in memory.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/login");
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

  if (!user) return <p className="text-slate-500">Loading…</p>;

  return (
    <div className="max-w-lg space-y-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{user.name}</h1>
          <p className="text-slate-600 dark:text-slate-400">{user.email}</p>
        </div>
        <button
          onClick={signOut}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:border-teal-600 dark:border-slate-700"
        >
          Sign out
        </button>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <h2 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">How your data is kept</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Report files are encrypted before they are stored, each with its own key.</li>
          <li>Your password is stored only as a slow, salted hash (Argon2), never as text.</li>
          <li>Only your account can see your family’s reports.</li>
          <li>Reports are sent to Claude (Anthropic) to be read, and are not used to train models.</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-rose-200 bg-white p-5 dark:border-rose-900 dark:bg-slate-900">
        <h2 className="font-semibold text-rose-800 dark:text-rose-300">Delete account</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Deletes your account, every family profile, every report and its file, and all explanations and briefs.
          This can’t be undone.
        </p>
        <label className="mt-4 block text-sm">
          Type <strong>DELETE</strong> to confirm
          <input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900"
          />
        </label>
        {error && <p className="mt-2 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
        <button
          disabled={confirmText !== "DELETE"}
          onClick={removeAccount}
          className="mt-3 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-800 disabled:opacity-40"
        >
          Delete everything
        </button>
      </section>
    </div>
  );
}
