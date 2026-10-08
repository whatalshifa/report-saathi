"use client";

import Link from "next/link";
import { useCallback } from "react";

import { BriefSheet, PrintButton } from "@/components/BriefSheet";
import { SharePanel } from "@/components/SharePanel";
import { ErrorNote } from "@/components/Skeleton";
import { getBrief, isPending } from "@/lib/api";
import { usePoll } from "@/lib/usePoll";

export function BriefView({ id }: { id: string }) {
  const load = useCallback(() => getBrief(id), [id]);
  const { data: job, error } = usePoll(load, (j) => isPending(j.status));

  if (error) return <ErrorNote message={error} />;
  if (!job || isPending(job.status)) {
    return (
      <div className="card p-10 text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-teal-200 border-t-teal-600" />
        <h1 className="text-xl font-semibold">Preparing the doctor brief…</h1>
        <p className="mx-auto mt-2 max-w-md text-muted">
          Going through every report on file and summarising what changed.
        </p>
      </div>
    );
  }
  if (job.status === "failed" || !job.content) {
    return <ErrorNote message={job.error ?? "The brief could not be written."} />;
  }
  const profileId = job.content.snapshot.profile.profile_id;
  return (
    <div className="space-y-6">
      <BriefSheet
        content={job.content}
        createdAt={job.created_at}
        toolbar={
          <>
            <Link href={`/profiles/${profileId}`} className="back-link">
              ← Back to timeline
            </Link>
            <PrintButton />
          </>
        }
      />
      <SharePanel briefId={job.id} profileId={profileId} personName={job.content.snapshot.profile.name} />
    </div>
  );
}
