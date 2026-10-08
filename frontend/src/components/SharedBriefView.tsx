"use client";

import { useEffect, useState } from "react";

import { BriefSheet, PrintButton } from "@/components/BriefSheet";
import { ErrorNote, SkeletonLines } from "@/components/Skeleton";
import { ApiError, getSharedBrief, type SharedBrief } from "@/lib/api";
import { formatDate } from "@/lib/format";

// The same words the API uses for every link that doesn't work (backend/app/api/shares.py).
const GONE = "This link has expired or was turned off. Ask the person who sent it for a new one.";

/** The link's token, after the "#" (see shareUrl). */
const tokenInAddress = () => decodeURIComponent(window.location.hash.slice(1));

/** The read-only brief a doctor opens from a link, with no way into the account that sent it. */
export function SharedBriefView() {
  const [shared, setShared] = useState<SharedBrief | null>(null);
  const [error, setError] = useState<ApiError | null>(null);

  useEffect(() => {
    const token = tokenInAddress();
    // No token is answered like a dead link, without asking the server.
    (token ? getSharedBrief(token) : Promise.reject(new ApiError(GONE, 404)))
      .then(setShared)
      .catch((err) => setError(err instanceof ApiError ? err : new ApiError("Could not open this summary", 0)));
  }, []);

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
