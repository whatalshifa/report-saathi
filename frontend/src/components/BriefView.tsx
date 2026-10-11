"use client";

import { useCallback } from "react";

import { BriefSheet, PrintButton } from "@/components/BriefSheet";
import { SharePanel } from "@/components/SharePanel";
import { BackLink } from "@/components/PageHeader";
import { StatusPanel } from "@/components/StatusPanel";
import { getBrief, isPending } from "@/lib/api";
import { usePoll } from "@/lib/usePoll";

export function BriefView({ id }: { id: string }) {
  const load = useCallback(() => getBrief(id), [id]);
  const { data: job, error } = usePoll(load, (j) => isPending(j.status));

  if (error) {
    return (
      <StatusPanel tone="error" title="This brief didn’t load" heading="h1" actions={<BackLink href="/dashboard">Back to all reports</BackLink>}>
        {error}
      </StatusPanel>
    );
  }
  if (!job || isPending(job.status)) {
    return (
      <StatusPanel tone="working" title="Preparing the doctor brief…" heading="h1">
        Going through every report on file and summarising what changed.
      </StatusPanel>
    );
  }
  if (job.status === "failed" || !job.content) {
    return (
      <StatusPanel tone="error" title="The brief couldn’t be written" heading="h1" actions={<BackLink href="/dashboard">Back to all reports</BackLink>}>
        {job.error ?? "Please try again from the timeline in a moment."}
      </StatusPanel>
    );
  }
  const profileId = job.content.snapshot.profile.profile_id;
  return (
    // Wide screens keep the buttons and the sharing panel beside the brief, in view while the brief is read.
    <div className="space-y-4 xl:grid xl:grid-cols-[minmax(0,1fr)_19rem] xl:grid-rows-[auto_1fr] xl:items-start xl:gap-x-6 xl:gap-y-4 xl:space-y-0">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden xl:col-start-2 xl:row-start-1">
        <BackLink href={`/profiles/${profileId}`}>Back to timeline</BackLink>
        <PrintButton />
      </div>
      <div className="xl:col-start-1 xl:row-span-2 xl:row-start-1">
        <BriefSheet content={job.content} createdAt={job.created_at} rowsShown={8} />
      </div>
      <div className="pt-2 xl:sticky xl:top-6 xl:col-start-2 xl:row-start-2 xl:pt-0">
        <SharePanel briefId={job.id} profileId={profileId} personName={job.content.snapshot.profile.name} />
      </div>
    </div>
  );
}
