import { TimelineView } from "@/components/TimelineView";

export default async function TimelinePage({ params }: PageProps<"/profiles/[id]">) {
  const { id } = await params;
  return <TimelineView profileId={id} />;
}
