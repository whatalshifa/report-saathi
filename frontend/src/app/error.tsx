"use client";

import Link from "next/link";
import { useEffect } from "react";

import { StatusPanel } from "@/components/StatusPanel";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <StatusPanel
      tone="error"
      title="This page hit a problem"
      heading="h1"
      bare
      actions={
        <>
          <button type="button" onClick={retry} className="btn btn-primary">
            Try again
          </button>
          <Link href="/dashboard" className="btn btn-secondary">
            Go home
          </Link>
        </>
      }
    >
      It&apos;s not something you did. Try again, and if it keeps happening, come back in a few minutes.
    </StatusPanel>
  );
}
