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
    <div className="space-y-6">
      <BriefSheet
        content={job.content}
        createdAt={job.created_at}
        toolbar={
          <>
            <BackLink href={`/profiles/${profileId}`}>Back to timeline</BackLink>
            <PrintButton />
          </>
        }
      />
      <SharePanel briefId={job.id} profileId={profileId} personName={job.content.snapshot.profile.name} />
    </div>
  );
}
