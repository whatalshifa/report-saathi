"use client";

import { UserPlus } from "lucide-react";
import Link from "next/link";

import { DashboardView, PrivateNote, type ReportGlance } from "@/components/DashboardView";
import { SAMPLE_PROFILES } from "@/components/shell/ShellContext";
import sample from "@/data/sample-family.json";
import type { ReportSummary, Trends } from "@/lib/api";

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
          <section aria-labelledby="own-heading" className="rounded-xl border border-line bg-surface p-4">
            <h2 id="own-heading" className="flex items-center gap-2 text-[15px] font-semibold">
              <UserPlus aria-hidden className="h-4 w-4 text-brand-700 dark:text-brand-300" />
              Add your own family
            </h2>
            <p className="mt-1 text-[13px] text-muted">
              Upload a PDF or a phone photo of any lab report. Every value is read, flagged and explained in
              English, Hindi or Marathi.
            </p>
            <div className="mt-3 flex gap-2">
              <Link href="/signup" className="btn btn-primary btn-sm flex-1">
                Sign up free
              </Link>
              <Link href="/#how" className="btn btn-secondary btn-sm">
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
