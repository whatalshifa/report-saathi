"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ReportList } from "@/components/ReportList";
import { SampleCard } from "@/components/SampleCard";
import { ErrorNote, SkeletonList } from "@/components/Skeleton";
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

  if (error) return <ErrorNote message={error} />;
  if (!profiles || !features) return <DashboardSkeleton />;

  const selected = pickProfile(profiles, profileId);
  const hasSamples = profiles.some((p) => p.is_sample);

  return (
    <div className="space-y-8">
      <section>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Whose reports?</h1>
        <p className="mt-1 text-muted">Each person in the family has their own reports and timeline.</p>
        <ul className="mt-5 flex flex-wrap gap-2">
          {profiles.map((p) => {
            const active = p.id === selected.id;
            return (
              <li key={p.id}>
                <Link
                  href={`/?profile=${p.id}`}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2.5 rounded-full border py-1.5 pr-4 pl-1.5 text-sm transition ${
                    active
                      ? "border-teal-700 bg-teal-700 text-white shadow-sm dark:border-teal-600 dark:bg-teal-600"
                      : "border-line bg-surface hover:border-teal-600"
                  }`}
                >
                  <span
                    aria-hidden
                    className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${
                      active ? "bg-white/20" : "bg-teal-50 text-teal-800 dark:bg-teal-950 dark:text-teal-200"
                    }`}
                  >
                    {p.name.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="font-medium">{p.name}</span>
                  <span className={active ? "text-teal-100" : "text-muted"}>
                    {p.is_sample ? "Sample" : RELATION_LABEL[p.relation]}
                  </span>
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href="/family"
              className="flex h-full items-center rounded-full border border-dashed border-line px-4 py-1.5 text-sm text-muted hover:border-teal-600 hover:text-teal-700 dark:hover:text-teal-300"
            >
              + Add family member
            </Link>
          </li>
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          <UploadCard key={selected.id} profile={selected} reading={features.reading} />
          <section>
            <h2 className="mb-3 text-lg font-semibold">{possessive(selected.name)} reports</h2>
            <ReportList key={selected.id} profileId={selected.id} />
          </section>
        </div>

        <aside className="space-y-4">
          {selected.report_count > 0 && (
            <Link
              href={`/profiles/${selected.id}`}
              className="card group block p-5 transition hover:border-teal-500"
            >
              <p className="eyebrow">Timeline</p>
              <p className="mt-2 font-semibold">{possessive(selected.name)} results over time</p>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-muted">Reports</dt>
                  <dd className="text-xl font-semibold tabular-nums">{selected.report_count}</dd>
                </div>
                {selected.last_report_date && (
                  <div>
                    <dt className="text-muted">Latest</dt>
                    <dd className="font-semibold">{formatDate(selected.last_report_date)}</dd>
                  </div>
                )}
              </dl>
              <p className="mt-4 text-sm font-medium text-teal-700 group-hover:underline dark:text-teal-400">
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

          <div className="card p-5 text-sm">
            <p className="font-semibold">Private by design</p>
            <p className="mt-1 text-muted">
              Files are encrypted before they&apos;re stored, and only your account can open them.
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
