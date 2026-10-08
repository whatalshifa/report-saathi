"use client";

import { useSyncExternalStore } from "react";

const never = () => () => {};

/**
 * False where the browser has no built-in PDF viewer, as on Android phones and the installed app there:
 * a link to a PDF downloads it instead of showing it, and "#page=N" is lost. Pages say so up front.
 * True on the server and before the page starts, which is right for most computers.
 */
export function usePdfViewer(): boolean {
  return useSyncExternalStore(
    never,
    () => navigator.pdfViewerEnabled !== false,
    () => true,
  );
}
