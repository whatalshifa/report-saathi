import type { Metadata } from "next";

import { ShareView } from "@/components/ShareView";

export const metadata: Metadata = { title: "Add a shared report" };

/** Where a report shared from WhatsApp lands (see public/sw.js). Signed out, sign-in comes first. */
export default async function SharePage({ searchParams }: PageProps<"/share">) {
  const { error } = await searchParams;
  return <ShareView error={typeof error === "string" ? error : undefined} />;
}
