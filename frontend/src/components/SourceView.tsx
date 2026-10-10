"use client";

import { FileSearch, X } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";

import { CorrectedChip } from "@/components/ValueFix";
import { reportFileUrl, reportPageUrl, type SourceBox, type TestResult } from "@/lib/api";
import { usePdfViewer } from "@/lib/usePdfViewer";

// "Where did this number come from?": a page icon beside a value opens the original report
// with that value highlighted, so people can check the AI's reading with their own eyes.

export function SourceButton({ name, onClick }: { name: string; onClick: (trigger: HTMLButtonElement) => void }) {
  return (
    <button
      type="button"
      onClick={(e) => onClick(e.currentTarget)}
      aria-label={`See ${name} on the original report`}
      aria-haspopup="dialog"
      title="Where did this number come from?"
      className="icon-btn -my-1 h-8 w-8 align-middle hover:text-brand-700 dark:hover:text-brand-300"
    >
      <FileSearch aria-hidden className="h-4 w-4" strokeWidth={1.75} />
    </button>
  );
}

/**
 * The original page with the value's box highlighted. A PDF's page is drawn as an image by the API;
 * if that fails, the dialog offers the PDF itself, opened at the right page.
 */
export function SourceDialog({
  reportId,
  contentType,
  result,
  box,
  onClose,
}: {
  reportId: string;
  contentType: string;
  result: TestResult;
  box: SourceBox;
  onClose: () => void;
}) {
  const titleId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const scroller = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const [zoomed, setZoomed] = useState(true);
  const [failed, setFailed] = useState(false);
  const isPdf = contentType === "application/pdf";
  const showsPdf = usePdfViewer();
  const value = [result.value_text, result.unit].filter(Boolean).join(" ");

  // A native modal dialog keeps focus inside and closes on Escape; the "close" event tells the page.
  useEffect(() => {
    if (!dialog.current?.open) dialog.current?.showModal();
  }, []);

  // Bring the highlighted value into view, at either zoom. It goes a little right of centre, or
  // further right on a narrow phone, so the test name printed to its left shows too.
  const centreOnBox = useCallback(() => {
    const view = scroller.current;
    const page = image.current;
    if (!view || !page?.complete || !page.naturalWidth) return;
    const rightOfCentre = ((box.x0 + box.x1) / 2) * page.clientWidth - view.clientWidth * 0.65;
    const atRightEdge = box.x1 * page.clientWidth + 16 - view.clientWidth;
    view.scrollTo({
      left: Math.min(rightOfCentre, atRightEdge),
      top: ((box.y0 + box.y1) / 2) * page.clientHeight - view.clientHeight / 2,
    });
  }, [box]);
  useEffect(() => centreOnBox(), [centreOnBox, zoomed]);

  return (
    <dialog
      ref={dialog}
      aria-labelledby={titleId}
      onClose={onClose}
      // The dialog itself is only hit outside its content, on the dimmed backdrop.
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-3xl overflow-hidden rounded-card border border-line bg-surface p-0 text-foreground shadow-xl backdrop:bg-stone-950/60"
    >
      <div className="flex max-h-[calc(100dvh-2rem)] flex-col gap-3 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id={titleId} className="text-lg font-semibold">
              Where this number came from
            </h2>
            <p className="text-sm text-muted">
              {result.name}: <span className="font-semibold text-foreground">{value}</span>
            </p>
            <CorrectedChip result={result} showReading />
          </div>
          <button
            type="button"
            onClick={() => dialog.current?.close()}
            aria-label="Close"
            className="icon-btn -mr-1"
          >
            <X aria-hidden className="h-5 w-5" />
          </button>
        </div>

        {isPdf && failed ? (
          <div className="rounded-ctl border border-line bg-background p-6 text-center">
            <p className="font-semibold">Page {box.page} of the original PDF</p>
            <p className="mt-1 text-sm text-muted">
              {showsPdf
                ? `Look for ${result.name} on that page. It opens in a new tab.`
                : `This phone saves the PDF to its downloads to open it. Then go to page ${box.page} and look for ${result.name}.`}
            </p>
            <a
              href={`${reportFileUrl(reportId)}#page=${box.page}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary mt-4"
            >
              {showsPdf ? `Open page ${box.page}` : "Download the PDF"}
            </a>
          </div>
        ) : failed ? (
          <p role="alert" className="rounded-ctl border border-line bg-background p-6 text-center text-sm text-muted">
            The original report couldn&apos;t be loaded. Please try again in a moment.
          </p>
        ) : (
          <figure className="flex min-h-0 flex-col gap-2">
            <div ref={scroller} className="min-h-0 overflow-auto rounded-ctl border border-line bg-white">
              {/* The highlight sits on the page in fractions of its size, so it stays put at any zoom. */}
              <div className="relative" style={{ width: zoomed ? "max(160%, 640px)" : "100%" }}>
                {/* A private file behind the sign-in cookie, so not one for Next's image optimiser. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={image}
                  src={isPdf ? reportPageUrl(reportId, box.page) : reportFileUrl(reportId)}
                  alt={`Page ${box.page} of the original report, with ${result.name} highlighted`}
                  onLoad={centreOnBox}
                  onError={() => setFailed(true)}
                  className="block h-auto w-full"
                />
                <div
                  data-testid="source-highlight"
                  aria-hidden
                  className="pointer-events-none absolute rounded-sm border-2 border-amber-500 bg-amber-300/25 shadow-[0_0_0_4px_rgb(245_158_11/0.3)]"
                  style={{
                    left: `${box.x0 * 100}%`,
                    top: `${box.y0 * 100}%`,
                    width: `${(box.x1 - box.x0) * 100}%`,
                    height: `${(box.y1 - box.y0) * 100}%`,
                  }}
                />
              </div>
            </div>
            <figcaption className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
              <span>Read from page {box.page} of the original</span>
              <span className="flex flex-wrap gap-2">
                {isPdf && (
                  <a
                    href={`${reportFileUrl(reportId)}#page=${box.page}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary btn-sm"
                  >
                    {showsPdf ? "Open the PDF" : "Download the PDF"}
                  </a>
                )}
                <button type="button" onClick={() => setZoomed((z) => !z)} className="btn btn-secondary btn-sm">
                  {zoomed ? "Show whole page" : "Zoom in"}
                </button>
              </span>
            </figcaption>
          </figure>
        )}
      </div>
    </dialog>
  );
}
