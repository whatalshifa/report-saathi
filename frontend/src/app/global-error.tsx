"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Logo } from "@/components/Logo";
import { StatusPanel } from "@/components/StatusPanel";
import { applySavedTheme } from "@/components/ThemeToggle";
import "./globals.css";

/**
 * Shown only if the root layout itself fails. It replaces the whole document, so it brings its own
 * <html> and <body>, the stylesheet and the saved theme; the root layout's fonts don't reach it, so the
 * page falls back to the system sans.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    applySavedTheme();
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-foreground antialiased">
        <title>Something went wrong · ReportSaathi</title>
        <Logo />
        <StatusPanel
          tone="error"
          title="ReportSaathi hit a problem"
          heading="h1"
          bare
          actions={
            <>
              <button type="button" onClick={retry} className="btn btn-primary">
                Try again
              </button>
              <Link href="/" className="btn btn-secondary">
                Go to the home page
              </Link>
            </>
          }
        >
          It&apos;s not something you did, and your reports are safe. Try again, and if it keeps happening, come back
          in a few minutes.
        </StatusPanel>
      </body>
    </html>
  );
}
