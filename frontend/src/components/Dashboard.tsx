"use client";

import { ArrowRight, Lock, Plus } from "lucide-react";
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
        <ul className="mt-6 flex flex-wrap gap-2" aria-label="Family members">
          {profiles.map((p) => {
            const active = p.id === selected.id;
            return (
              <li key={p.id}>
                <Link
                  href={`/?profile=${p.id}`}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-10 items-center gap-2 rounded-ctl border py-1 pr-3 pl-1.5 text-sm transition-colors ${
                    active
                      ? "border-brand-600 bg-brand-50 text-brand-900 ring-1 ring-brand-600 ring-inset dark:border-brand-400 dark:bg-brand-950/60 dark:text-brand-50 dark:ring-brand-400"
                      : "border-line bg-surface hover:bg-stone-50 dark:hover:bg-stone-800/60"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${
                      active
                        ? "bg-brand-700 text-white"
                        : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-200"
                    }`}
                  >
                    {p.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="font-medium">{p.name}</span>
                  <span className={active ? "text-brand-700 dark:text-brand-200" : "text-muted"}>
                    {p.is_sample ? "Sample" : RELATION_LABEL[p.relation]}
                  </span>
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href="/family"
              className="flex h-10 items-center gap-1.5 rounded-ctl px-3 text-sm font-medium text-muted transition-colors hover:bg-stone-100 hover:text-foreground dark:hover:bg-stone-800"
            >
              <Plus aria-hidden className="h-4 w-4" />
              Add family member
            </Link>
          </li>
        </ul>
      </section>

      <div className="grid gap-8 lg:grid-cols-[1fr_18rem] lg:gap-10">
        <div className="min-w-0 space-y-8">
          <UploadCard key={selected.id} profile={selected} reading={features.reading} />
          <section>
            <h2 className="section-title mb-3">{possessive(selected.name)} reports</h2>
            <ReportList key={selected.id} profileId={selected.id} />
          </section>
        </div>

        <aside className="space-y-6">
          {selected.report_count > 0 && (
            <Link
              href={`/profiles/${selected.id}`}
              className="card group block p-5 transition-colors hover:border-brand-300 dark:hover:border-brand-800"
            >
              <p className="text-[13px] text-muted">Timeline</p>
              <p className="mt-0.5 font-semibold">{possessive(selected.name)} results over time</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
                <div>
                  <dt className="text-muted">Reports</dt>
                  <dd className="mt-0.5 font-medium tabular-nums">{selected.report_count}</dd>
                </div>
                {selected.last_report_date && (
                  <div>
                    <dt className="text-muted">Latest</dt>
                    <dd className="mt-0.5 font-medium tabular-nums">{formatDate(selected.last_report_date)}</dd>
                  </div>
                )}
              </dl>
              <p className="mt-4 flex items-center gap-1 text-sm font-medium text-brand-700 dark:text-brand-300">
                See trends and a doctor brief
                <ArrowRight aria-hidden className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
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

          <div className="flex gap-2.5 px-1 text-[13px] text-muted">
            <Lock aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            <p>
              <span className="font-medium text-foreground">Private by design.</span> Files are encrypted before
              they&apos;re stored, and only your account can open them.
            </p>
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
          <div className="skeleton h-10 w-36" />
          <div className="skeleton h-10 w-36" />
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-6">
          <div className="skeleton h-40 rounded-card" />
          <SkeletonList />
        </div>
        <div className="skeleton h-48 rounded-card" />
      </div>
    </div>
  );
}
