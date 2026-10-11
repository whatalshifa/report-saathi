import type { Metadata } from "next";

import { TimelineView } from "@/components/TimelineView";

export const metadata: Metadata = { title: "Health timeline" };

export default async function TimelinePage({ params }: PageProps<"/profiles/[id]">) {
  const { id } = await params;
  return <TimelineView profileId={id} />;
}
