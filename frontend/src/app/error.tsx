"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <p className="eyebrow">Something went wrong</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight">This page hit a problem</h1>
      <p className="mt-3 text-muted">
        It&apos;s not something you did. Try again, and if it keeps happening, come back in a few minutes.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <button type="button" onClick={retry} className="btn btn-primary">
          Try again
        </button>
        <Link href="/" className="btn btn-secondary">
          Go home
        </Link>
      </div>
    </div>
  );
}
