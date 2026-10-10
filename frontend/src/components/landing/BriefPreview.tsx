"use client";

import { Link2, Printer, QrCode } from "lucide-react";

import { BriefSheet } from "@/components/BriefSheet";

import { BRIEF, SAMPLE_SAVED_AT } from "./sample";

/** The sample family's real doctor brief, as the app draws it, shown as a page on the desk. */
export function BriefPreview() {
  return (
    <figure className="relative">
      <figcaption className="sr-only">
        The doctor brief for the sample person: an overview, key findings with each test&apos;s values over time,
        a table of latest values, and questions to ask. {BRIEF.brief.overview}
      </figcaption>
      <div aria-hidden inert className="relative">
        <div className="relative h-[520px] overflow-hidden rounded-[18px] shadow-[0_40px_80px_-40px_rgb(44_18_42/0.55)] sm:h-[600px] lg:h-[640px]">
          <div className="origin-top-left [zoom:0.78] sm:[zoom:0.86]">
            <BriefSheet
              content={BRIEF}
              createdAt={SAMPLE_SAVED_AT}
              toolbar={
                <>
                  <span className="text-sm text-muted">Ready to print or share</span>
                  <span className="flex gap-2">
                    <span className="btn btn-secondary btn-sm">
                      <Link2 className="h-3.5 w-3.5" />
                      Share link
                    </span>
                    <span className="btn btn-primary btn-sm">
                      <Printer className="h-3.5 w-3.5" />
                      Print
                    </span>
                  </span>
                </>
              }
            />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-surface via-surface/80 to-transparent" />
        </div>
        <div className="absolute -bottom-6 left-4 flex items-center gap-3 rounded-2xl border border-line bg-surface px-4 py-3 shadow-xl sm:-left-6">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100">
            <QrCode className="h-5 w-5" />
          </span>
          <span className="text-[13px] leading-tight">
            <span className="block font-semibold">Private link for the doctor</span>
            <span className="text-muted">Expires on its own, or turn it off</span>
          </span>
        </div>
      </div>
    </figure>
  );
}
