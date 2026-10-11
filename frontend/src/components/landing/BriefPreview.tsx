"use client";


import { BriefSheet } from "@/components/BriefSheet";

import { BRIEF, SAMPLE_SAVED_AT } from "./sample";
import { IconLink, IconPrinter, IconQr } from "@/components/icons";

/** The sample family's real doctor brief, as the app draws it, shown as a page on the desk. */
export function BriefPreview() {
  return (
    <figure className="relative">
      <figcaption className="sr-only">
        The doctor brief for the sample person: an overview, key findings with each test&apos;s values over time,
        a table of latest values, and questions to ask. {BRIEF.brief.overview}
      </figcaption>
      <div aria-hidden inert className="relative">
        <div className="relative h-[520px] overflow-hidden rounded-[32px] shadow-lift sm:h-[600px] lg:h-[640px]">
          <div className="origin-top-left [zoom:0.78] sm:[zoom:0.86]">
            <BriefSheet
              content={BRIEF}
              createdAt={SAMPLE_SAVED_AT}
              toolbar={
                <>
                  <span className="text-sm text-muted">Ready to print or share</span>
                  <span className="flex gap-2">
                    <span className="btn btn-secondary btn-sm">
                      <IconLink className="h-3.5 w-3.5" />
                      Share link
                    </span>
                    <span className="btn btn-primary btn-sm">
                      <IconPrinter className="h-3.5 w-3.5" />
                      Print
                    </span>
                  </span>
                </>
              }
            />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-surface via-surface/80 to-transparent" />
        </div>
        <div className="absolute -bottom-6 left-4 flex items-center gap-3 rounded-full bg-surface py-2.5 pr-5 pl-2.5 shadow-lift sm:-left-6">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100">
            <IconQr className="h-5 w-5" />
          </span>
          <span className="text-[13px] leading-tight">
            <span className="block font-bold">Private link for the doctor</span>
            <span className="text-muted">Expires on its own, or turn it off</span>
          </span>
        </div>
      </div>
    </figure>
  );
}
