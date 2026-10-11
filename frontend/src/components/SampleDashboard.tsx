"use client";

import Link from "next/link";

import { DashboardView, PrivateNote, type ReportGlance } from "@/components/DashboardView";
import { SAMPLE_PROFILES } from "@/components/shell/ShellContext";
import sample from "@/data/sample-family.json";
import type { ReportSummary, Trends } from "@/lib/api";
import { IconAddPerson } from "@/components/icons";

/**
 * What a signed-out visitor sees first: the demo account's sample person, drawn from a saved copy so
 * it appears at once, even while the free server is still waking up. Every link opens the live demo.
 */
export function SampleDashboard() {
  const person = SAMPLE_PROFILES[0];
  return (
    <DashboardView
      data={{
        person,
        profiles: SAMPLE_PROFILES,
        reports: sample.reports as ReportSummary[],
        trends: sample.trends as Trends,
        glances: sample.details as Record<string, ReportGlance>,
      }}
      side={
        <div className="space-y-4">
          <section aria-labelledby="own-heading" className="rounded-card bg-brand-100 p-5 dark:bg-brand-950">
            <h2 id="own-heading" className="flex items-center gap-2.5 text-[17px] font-bold">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-surface text-brand-700 [--duo:var(--duo-coral)] dark:text-brand-300">
                <IconAddPerson aria-hidden className="h-5 w-5" />
              </span>
              Add your own family
            </h2>
            <p className="mt-2 text-sm text-brand-900/80 dark:text-brand-100/85">
              Upload a PDF or a phone photo of any lab report. Every value is read, flagged and explained in
              English, Hindi or Marathi.
            </p>
            <div className="mt-4 flex gap-2">
              <Link href="/signup" className="btn btn-primary btn-sm flex-1">
                Sign up free
              </Link>
              <Link href="/#how" className="btn btn-sm bg-surface text-brand-900 hover:bg-brand-50 dark:text-brand-100 dark:hover:bg-brand-900">
                How it works
              </Link>
            </div>
          </section>
          <PrivateNote />
        </div>
      }
    />
  );
}
