"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ReportList } from "@/components/ReportList";
import { SampleCard } from "@/components/SampleCard";
import { PageHeader } from "@/components/PageHeader";
import { SkeletonList } from "@/components/Skeleton";
import { LoadError } from "@/components/StatusPanel";
import { UploadCard } from "@/components/UploadCard";
import { getFeatures, listProfiles, type Profile } from "@/lib/api";
import { formatDate, possessive, RELATION_LABEL } from "@/lib/format";
import { usePoll } from "@/lib/usePoll";

const noRepeat = () => false;

/** With no person picked, open on someone who has reports rather than an empty page. */
function pickProfile(profiles: Profile[], profileId?: string): Profile {
  return (
    profiles.find((p) => p.id === profileId) ??
    profiles.find((p) => p.relation === "self" && p.report_count > 0) ??
    profiles.find((p) => p.report_count > 0) ??
    profiles[0]
  );
}

export function Dashboard({ profileId }: { profileId?: string }) {
  const router = useRouter();
  const { data: profiles, error, reload } = usePoll(listProfiles, noRepeat);
  const { data: features } = usePoll(getFeatures, noRepeat);

  if (error) return <LoadError message={error} onRetry={reload} />;
  if (!profiles || !features) return <DashboardSkeleton />;

  const selected = pickProfile(profiles, profileId);
  const hasSamples = profiles.some((p) => p.is_sample);

  return (
    <div className="space-y-8">
      <section>
        <PageHeader title="Whose reports?" description="Each person in the family has their own reports and timeline." />
        <ul className="mt-6 flex flex-wrap gap-2">
          {profiles.map((p) => {
            const active = p.id === selected.id;
            return (
              <li key={p.id}>
                <Link
                  href={`/?profile=${p.id}`}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-10 items-center gap-2.5 rounded-full border py-1 pr-4 pl-1 text-sm transition-colors ${
                    active
                      ? "border-brand-700 bg-brand-700 text-white shadow-sm"
                      : "border-line bg-surface hover:border-stone-300 hover:bg-stone-50 dark:hover:border-stone-600 dark:hover:bg-stone-800/60"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${
                      active ? "bg-white/20" : "bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200"
                    }`}
                  >
                    {p.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="font-medium">{p.name}</span>
                  <span className={active ? "text-brand-50/90" : "text-muted"}>
                    {p.is_sample ? "Sample" : RELATION_LABEL[p.relation]}
                  </span>
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href="/family"
              className="flex min-h-10 items-center gap-1.5 rounded-full border border-dashed border-stone-300 px-4 py-1 text-sm font-medium text-muted transition-colors hover:border-brand-600 hover:text-brand-700 dark:border-stone-700 dark:hover:border-brand-400 dark:hover:text-brand-300"
            >
              <svg viewBox="0 0 20 20" className="h-4 w-4" fill="currentColor" aria-hidden>
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
              Add family member
            </Link>
          </li>
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          <UploadCard key={selected.id} profile={selected} reading={features.reading} />
          <section>
            <h2 className="section-title mb-3">{possessive(selected.name)} reports</h2>
            <ReportList key={selected.id} profileId={selected.id} />
          </section>
        </div>

        <aside className="space-y-4">
          {selected.report_count > 0 && (
            <Link
              href={`/profiles/${selected.id}`}
              className="card group block p-5 transition-colors hover:border-brand-500 dark:hover:border-brand-700"
            >
              <p className="eyebrow">Timeline</p>
              <p className="mt-2 font-semibold">{possessive(selected.name)} results over time</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
                <div>
                  <dt className="text-muted">Reports</dt>
                  <dd className="mt-0.5 font-semibold tabular-nums">{selected.report_count}</dd>
                </div>
                {selected.last_report_date && (
                  <div>
                    <dt className="text-muted">Latest</dt>
                    <dd className="mt-0.5 font-semibold tabular-nums">{formatDate(selected.last_report_date)}</dd>
                  </div>
                )}
              </dl>
              <p className="mt-4 text-sm font-medium text-brand-700 group-hover:underline dark:text-brand-400">
                See trends and a doctor brief →
              </p>
            </Link>
          )}

          {!hasSamples && (
            <SampleCard
              onAdded={(sample) => {
                reload();
                router.push(`/?profile=${sample.id}`);
              }}
            />
          )}

          <div className="card flex gap-3 p-5 text-sm">
            <svg viewBox="0 0 24 24" className="mt-0.5 h-5 w-5 shrink-0 text-brand-700 dark:text-brand-400" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
            </svg>
            <div>
              <p className="font-semibold">Private by design</p>
              <p className="mt-1 text-muted">
                Files are encrypted before they&apos;re stored, and only your account can open them.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading">
      <div className="space-y-3">
        <div className="skeleton h-8 w-56" />
        <div className="skeleton h-4 w-80 max-w-full" />
        <div className="flex gap-2 pt-2">
          <div className="skeleton h-10 w-36 rounded-full" />
          <div className="skeleton h-10 w-36 rounded-full" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <div className="skeleton h-40 rounded-2xl" />
          <SkeletonList />
        </div>
        <div className="skeleton h-48 rounded-2xl" />
      </div>
    </div>
  );
}
