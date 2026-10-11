import type { Metadata } from "next";

import { BriefsIndex } from "@/components/BriefsIndex";

export const metadata: Metadata = { title: "Doctor briefs" };

export default async function BriefsPage({ searchParams }: PageProps<"/briefs">) {
  const { profile } = await searchParams;
  return <BriefsIndex profileId={typeof profile === "string" ? profile : undefined} />;
}
