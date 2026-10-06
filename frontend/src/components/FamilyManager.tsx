"use client";

import Link from "next/link";
import { useState } from "react";

import { ErrorNote, SkeletonList } from "@/components/Skeleton";
import {
  createProfile,
  deleteProfile,
  listProfiles,
  updateProfile,
  type Profile,
  type ProfileInput,
  type Relation,
  type Sex,
} from "@/lib/api";
import { RELATION_LABEL } from "@/lib/format";
import { usePoll } from "@/lib/usePoll";

const noRepeat = () => false;
const RELATIONS: Relation[] = ["spouse", "parent", "child", "sibling", "grandparent", "other"];

export function FamilyManager() {
  const { data: profiles, error, reload } = usePoll(listProfiles, noRepeat);
  const [editing, setEditing] = useState<string | null>(null);

  if (error) return <ErrorNote message={error} />;
  if (!profiles) return <SkeletonList />;

  async function remove(profile: Profile) {
    const reports = profile.report_count
      ? ` and ${profile.report_count} report${profile.report_count === 1 ? "" : "s"}`
      : "";
    if (!confirm(`Delete ${profile.name}${reports}? This can’t be undone.`)) return;
    try {
      await deleteProfile(profile.id);
      reload();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not delete");
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <Link href="/" className="back-link">
          ← Reports
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Family</h1>
        <p className="mt-1 text-muted">
          Add the people whose reports you look after. Each person gets their own reports and timeline.
        </p>
      </header>

      <ul className="divide-y divide-line card">
        {profiles.map((p) => (
          <li key={p.id} className="p-4">
            {editing === p.id ? (
              <ProfileForm
                initial={p}
                isSelf={p.relation === "self"}
                submitLabel="Save"
                onCancel={() => setEditing(null)}
                onSubmit={async (input) => {
                  await updateProfile(p.id, input);
                  setEditing(null);
                  reload();
                }}
              />
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {p.name} <span className="font-normal text-muted">· {p.is_sample ? "Sample" : RELATION_LABEL[p.relation]}</span>
                  </p>
                  <p className="text-sm text-muted">
                    {[p.birth_year && `Born ${p.birth_year}`, `${p.report_count} report${p.report_count === 1 ? "" : "s"}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <div className="flex gap-2 text-sm">
                  <button
                    onClick={() => setEditing(p.id)}
                    className="btn btn-secondary btn-sm"
                  >
                    Edit
                  </button>
                  {p.relation !== "self" && (
                    <button
                      onClick={() => remove(p)}
                      className="btn btn-secondary btn-sm hover:border-rose-400 hover:text-rose-700 dark:hover:text-rose-300"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <section className="card p-5">
        <h2 className="text-lg font-semibold">Add a family member</h2>
        <p className="mb-4 mt-1 text-sm text-muted">
          Use the name as their lab reports print it. Then ReportSaathi can tell you if a report lands in the wrong
          person’s profile.
        </p>
        <ProfileForm
          submitLabel="Add"
          resetOnSubmit
          onSubmit={async (input) => {
            await createProfile(input);
            reload();
          }}
        />
      </section>
    </div>
  );
}

function ProfileForm({
  initial,
  isSelf = false,
  submitLabel,
  resetOnSubmit = false,
  onSubmit,
  onCancel,
}: {
  initial?: ProfileInput;
  isSelf?: boolean;
  submitLabel: string;
  resetOnSubmit?: boolean;
  onSubmit: (input: ProfileInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const year = String(form.get("birth_year") ?? "");
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        name: String(form.get("name")),
        relation: isSelf ? "self" : (String(form.get("relation")) as Relation),
        birth_year: year ? Number(year) : null,
        sex: (String(form.get("sex")) || null) as Sex | null,
      });
      if (resetOnSubmit) formElement.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-2">
      <label className="block text-sm font-medium">
        Name
        <input name="name" required maxLength={100} defaultValue={initial?.name} className="input" />
      </label>
      {!isSelf && (
        <label className="block text-sm font-medium">
          Relation to you
          <select name="relation" defaultValue={initial?.relation ?? "parent"} className="input">
            {RELATIONS.map((r) => (
              <option key={r} value={r}>
                {RELATION_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block text-sm font-medium">
        Year of birth <span className="font-normal text-muted">(optional)</span>
        <input
          name="birth_year"
          type="number"
          inputMode="numeric"
          min={1900}
          max={new Date().getFullYear()}
          defaultValue={initial?.birth_year ?? ""}
          className="input"
        />
      </label>
      <label className="block text-sm font-medium">
        Sex <span className="font-normal text-muted">(optional, some ranges depend on it)</span>
        <select name="sex" defaultValue={initial?.sex ?? ""} className="input">
          <option value="">Prefer not to say</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other</option>
        </select>
      </label>
      {error && (
        <p role="alert" className="text-sm text-rose-700 sm:col-span-2 dark:text-rose-300">
          {error}
        </p>
      )}
      <div className="flex gap-2 sm:col-span-2">
        <button
          disabled={busy}
          className="btn btn-primary"
        >
          {busy ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn text-muted hover:text-foreground">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
