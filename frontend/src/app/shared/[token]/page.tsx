import type { Metadata } from "next";

import { SharedBriefView } from "@/components/SharedBriefView";

export const metadata: Metadata = {
  title: "Shared lab summary",
  // Someone's health summary: never in search results, and the link (the key to it) is never sent
  // to another site as a referrer.
  robots: { index: false, follow: false, nocache: true },
  referrer: "no-referrer",
};

export default async function SharedBriefPage({ params }: PageProps<"/shared/[token]">) {
  const { token } = await params;
  return <SharedBriefView token={token} />;
}
