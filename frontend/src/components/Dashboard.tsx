"use client";

import Link from "next/link";

import { ReportList } from "@/components/ReportList";
import { UploadCard } from "@/components/UploadCard";
import { listProfiles } from "@/lib/api";
import { formatDate, possessive, RELATION_LABEL } from "@/lib/format";
import { usePoll } from "@/lib/usePoll";

const noRepeat = () => false;

export function Dashboard({ profileId }: { profileId?: string }) {
  const { data: profiles, error } = usePoll(listProfiles, noRepeat);

  if (error) return <p className="text-rose-700 dark:text-rose-300">{error}</p>;
  if (!profiles) return <p className="text-slate-500">Loading…</p>;

  const selected = profiles.find((p) => p.id === profileId) ?? profiles[0];

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Whose report is it?</h1>
        <ul className="mt-4 flex flex-wrap gap-2">
          {profiles.map((p) => {
            const active = p.id === selected.id;
            return (
              <li key={p.id}>
                <Link
                  href={`/?profile=${p.id}`}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition ${
                    active
                      ? "border-teal-700 bg-teal-700 text-white"
                      : "border-slate-300 bg-white hover:border-teal-600 dark:border-slate-700 dark:bg-slate-900"
                  }`}
                >
                  <span className="font-medium">{p.name}</span>
                  <span className={active ? "text-teal-100" : "text-slate-500"}>{RELATION_LABEL[p.relation]}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href="/family"
              className="block rounded-full border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-600 hover:border-teal-600 hover:text-teal-700 dark:border-slate-700 dark:text-slate-300"
            >
              + Add family member
            </Link>
          </li>
        </ul>
      </section>

      <UploadCard key={selected.id} profile={selected} />

      {selected.report_count > 0 && (
        <Link
          href={`/profiles/${selected.id}`}
          className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5 hover:border-teal-500 dark:border-slate-800 dark:bg-slate-900"
        >
          <div>
            <p className="font-semibold">{possessive(selected.name)} health timeline</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {selected.report_count} report{selected.report_count === 1 ? "" : "s"}
              {selected.last_report_date && `, latest ${formatDate(selected.last_report_date)}`}. Trends, and a
              brief for the doctor.
            </p>
          </div>
          <span aria-hidden className="text-xl text-teal-700 dark:text-teal-400">
            →
          </span>
        </Link>
      )}

      <section>
        <h2 className="mb-3 text-lg font-semibold">{possessive(selected.name)} reports</h2>
        <ReportList key={selected.id} profileId={selected.id} />
      </section>
    </div>
  );
}
