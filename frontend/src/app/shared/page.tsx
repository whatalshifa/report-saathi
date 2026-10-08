import type { Metadata } from "next";

import { SharedBriefView } from "@/components/SharedBriefView";

export const metadata: Metadata = {
  title: "Shared lab summary",
  // Someone's health summary: never in search results, and the link (the key to it) is never sent
  // to another site as a referrer.
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

/** A doctor's link is /shared#<token>: the part after "#" never leaves the browser, so no server logs it. */
export default function SharedBriefPage() {
  return <SharedBriefView />;
}
