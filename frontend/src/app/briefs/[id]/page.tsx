import type { Metadata } from "next";

import { BriefView } from "@/components/BriefView";

export const metadata: Metadata = { title: "Doctor brief" };

export default async function BriefPage({ params }: PageProps<"/briefs/[id]">) {
  const { id } = await params;
  return <BriefView id={id} />;
}
