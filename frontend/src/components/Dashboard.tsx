"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { DashboardView, PrivateNote, type DashboardData, type ReportGlance } from "@/components/DashboardView";
import { SampleCard } from "@/components/SampleCard";
import { SampleDashboard } from "@/components/SampleDashboard";
import { LoadError, StatusPanel } from "@/components/StatusPanel";
import { ReadingPaused, UploadCard } from "@/components/UploadCard";
import { pickProfile, useSelectPerson, useShell } from "@/components/shell/ShellContext";
import {
  ApiError,
  getFeatures,
  getReport,
  getTrends,
  isOutOfRange,
  listReports,
  type Profile,
  type ReportDetail,
  type ReportSummary,
  type Trends,
} from "@/lib/api";
import { usePoll } from "@/lib/usePoll";

const noRepeat = () => false;
// The dashboard counts flags on the newest few reports; the reports page lists the rest.
const GLANCES = 5;

export function glance(report: ReportDetail): ReportGlance {
  return {
    out_of_range: report.out_of_range,
    total: report.results.length,
    flagged: report.results
      .filter((r) => isOutOfRange(r.flag))
      .map(({ name, value_text, unit, flag, reference_text, ref_low, ref_high }) => ({
        name,
        value_text,
        unit,
        flag,
        reference_text,
        ref_low,
        ref_high,
      })),
  };
}

type Loaded = {
  key: string;
  reports?: ReportSummary[];
  trends?: Trends | null;
  glances?: Record<string, ReportGlance>;
  error?: string;
};

/** Loads one person's reports, trends and the flags on their newest reports. */
function usePersonData(person: Profile | null) {
  const key = person ? `${person.id}:${person.report_count}` : "";
  const [loaded, setLoaded] = useState<Loaded>({ key: "" });

  useEffect(() => {
    if (!person) return;
    let cancelled = false;
    const id = person.id;
    const count = person.report_count;
    const thisKey = `${id}:${count}`;
    (async () => {
      try {
        const reportsPromise = listReports(id);
        const trendsPromise =
          count > 0
            ? getTrends(id).catch((err) => {
                // No finished report yet: no trends to draw, which isn't an error.
                if (err instanceof ApiError && err.status === 404) return null;
                throw err;
              })
            : Promise.resolve(null);
        const reports = await reportsPromise;
        if (cancelled) return;
        setLoaded((prev) => ({ ...(prev.key === thisKey ? prev : {}), key: thisKey, reports }));
        const [trends, details] = await Promise.all([
          trendsPromise,
          Promise.all(
            reports
              .filter((r) => r.status === "done")
              .slice(0, GLANCES)
              .map((r) => getReport(r.id)),
          ),
        ]);
        if (cancelled) return;
        setLoaded({
          key: thisKey,
          reports,
          trends,
          glances: Object.fromEntries(details.map((d) => [d.id, glance(d)])),
        });
      } catch (err) {
        if (!cancelled) setLoaded({ key: thisKey, error: err instanceof Error ? err.message : "Could not load" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [person]);

  return loaded.key === key ? loaded : { key };
}

export function Dashboard({ profileId }: { profileId?: string }) {
  const router = useRouter();
  const shell = useShell();
  const { data: features } = usePoll(getFeatures, noRepeat);
  const person = shell.mode === "live" && shell.profiles?.length ? pickProfile(shell.profiles, profileId ?? shell.person?.id) : null;
  useSelectPerson(person?.id);
  const data = usePersonData(person);

  // A sign-in that has run out shows the sample family until the person signs in again.
  if (shell.mode === "sample") return <SampleDashboard />;
  if (!shell.profiles || shell.mode === "loading") return <DashboardSkeleton />;
  if (!person) {
    return (
      <StatusPanel tone="empty" title="Nobody here yet" heading="h1">
        Add a family member on the Family page to start keeping their reports.
      </StatusPanel>
    );
  }
  if (data.error) return <LoadError message={data.error} />;

  const hasSamples = shell.profiles.some((p) => p.is_sample);
  const upload = features ? (
    features.reading ? (
      <UploadCard key={person.id} profile={person} reading compact />
    ) : (
      <ReadingPaused />
    )
  ) : (
    <div className="skeleton h-20 rounded-xl" aria-hidden />
  );
  const samples = !hasSamples && (
    <SampleCard
      onAdded={(sample) => {
        shell.reloadProfiles();
        router.push(`/?profile=${sample.id}`);
      }}
    />
  );

  const view: DashboardData = {
    person,
    profiles: shell.profiles,
    reports: data.reports ?? null,
    trends: data.trends ?? null,
    glances: data.glances ?? {},
  };

  const side =
    person.report_count === 0 ? (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-7">
        <div className="space-y-4">
          <StatusPanel tone="empty" title="No reports yet" heading="p">
            Add {person.name}&apos;s first lab report: a PDF or a phone photo of the printout. Every value is read,
            checked against the lab&apos;s range and lined up with later reports.
          </StatusPanel>
          {upload}
        </div>
        <div className="space-y-4">
          {samples}
          <PrivateNote />
        </div>
      </div>
    ) : (
      <div className="space-y-4">
        {upload}
        {samples}
        <PrivateNote />
      </div>
    );

  return <DashboardView data={view} side={side} />;
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading">
      <div className="flex items-center gap-3.5">
        <div className="skeleton h-11 w-11 rounded-full" />
        <div className="space-y-2">
          <div className="skeleton h-3 w-24" />
          <div className="skeleton h-6 w-48" />
        </div>
      </div>
      <div className="grid gap-3 lg:grid-cols-[1.5fr_1fr]">
        <div className="skeleton h-32 rounded-xl" />
        <div className="skeleton h-32 rounded-xl" />
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_19rem]">
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="skeleton h-[134px] rounded-xl" />
          ))}
        </div>
        <div className="skeleton h-64 rounded-xl" />
      </div>
    </div>
  );
}
