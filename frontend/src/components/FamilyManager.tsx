"use client";

import { useState } from "react";

import { PageHeader } from "@/components/PageHeader";
import { ErrorNote, SkeletonList } from "@/components/Skeleton";
import { LoadError } from "@/components/StatusPanel";
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

  if (error) return <LoadError message={error} onRetry={reload} />;
  if (!profiles) {
    return (
      <div className="space-y-8" role="status" aria-label="Loading">
        <div className="space-y-3">
          <div className="skeleton h-8 w-40" />
          <div className="skeleton h-4 w-96 max-w-full" />
        </div>
        <SkeletonList />
      </div>
    );
  }

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
      <PageHeader
        title="Family"
        description="Add the people whose reports you look after. Each person gets their own reports and timeline."
      />

      <ul className="card divide-y divide-line">
        {profiles.map((p) => (
          <li key={p.id} className="px-4 py-3.5 sm:px-5">
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
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    aria-hidden
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-stone-100 text-sm font-semibold text-stone-700 dark:bg-stone-800 dark:text-stone-200"
                  >
                    {p.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-x-2 text-[15px] font-medium">
                      {p.name}
                      <span className="badge bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                        {p.is_sample ? "Sample" : RELATION_LABEL[p.relation]}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[13px] text-muted">
                      {[
                        p.birth_year && `Born ${p.birth_year}`,
                        `${p.report_count} report${p.report_count === 1 ? "" : "s"}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setEditing(p.id)} className="btn btn-secondary btn-sm">
                    Edit
                  </button>
                  {p.relation !== "self" && (
                    <button onClick={() => remove(p)} className="btn btn-danger-quiet btn-sm">
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      <section className="card p-5 sm:p-6">
        <h2 className="section-title">Add a family member</h2>
        <p className="mt-1 mb-5 max-w-2xl text-sm text-muted">
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
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <label className="label">
        Name
        <input name="name" required maxLength={100} defaultValue={initial?.name} className="input" />
      </label>
      {!isSelf && (
        <label className="label">
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
      <label className="label">
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
      <label className="label">
        Sex <span className="font-normal text-muted">(optional, some ranges depend on it)</span>
        <select name="sex" defaultValue={initial?.sex ?? ""} className="input">
          <option value="">Prefer not to say</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other</option>
        </select>
      </label>
      {error && (
        <div className="sm:col-span-2">
          <ErrorNote message={error} />
        </div>
      )}
      <div className="flex gap-2 pt-1 sm:col-span-2">
        <button disabled={busy} className="btn btn-primary">
          {busy ? "Saving…" : submitLabel}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn btn-ghost">
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
