import { BriefView } from "@/components/BriefView";

export default async function BriefPage({ params }: PageProps<"/briefs/[id]">) {
  const { id } = await params;
  return <BriefView id={id} />;
}
