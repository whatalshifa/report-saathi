"use client";

import { useEffect, useState } from "react";

import { BriefSheet, PrintButton } from "@/components/BriefSheet";
import { ErrorNote, SkeletonLines } from "@/components/Skeleton";
import { ApiError, getSharedBrief, type SharedBrief } from "@/lib/api";
import { formatDate } from "@/lib/format";

/** The read-only brief a doctor opens from a link, with no way into the account that sent it. */
export function SharedBriefView({ token }: { token: string }) {
  const [shared, setShared] = useState<SharedBrief | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    getSharedBrief(token)
      .then(setShared)
      .catch((err) => setError(err instanceof ApiError ? err : new ApiError("Could not open this summary", 0)));
  }, [token]);

  if (error?.status === 404) {
    return (
      <div className="mx-auto max-w-md py-16 text-center">
        <p className="eyebrow">Shared lab summary</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">This link isn&apos;t working</h1>
        <p className="mt-3 text-muted">{error.message}</p>
      </div>
    );
  }
  if (error) return <ErrorNote message={error.message} />;
  if (!shared) {
    return (
      <div className="card space-y-6 p-6 sm:p-8" role="status" aria-label="Loading">
        <div className="skeleton h-8 w-64 max-w-full" />
        <SkeletonLines lines={4} />
      </div>
    );
  }
  return (
    <BriefSheet
      content={shared.content}
      createdAt={shared.created_at}
      toolbar={
        <>
          <p className="text-sm text-muted">
            <strong className="font-semibold text-foreground">Shared by a ReportSaathi user</strong>, read-only,
            expires on {formatDate(shared.expires_at)}
          </p>
          <PrintButton />
        </>
      }
    />
  );
}
