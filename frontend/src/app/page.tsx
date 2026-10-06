import { cookies } from "next/headers";

import { Dashboard } from "@/components/Dashboard";
import { Landing } from "@/components/Landing";

export default async function Home({ searchParams }: PageProps<"/">) {
  // Signed-out visitors see what the product does; signed-in people go straight to their reports.
  if (!(await cookies()).has("rs_session")) return <Landing />;
  const { profile } = await searchParams;
  return <Dashboard profileId={typeof profile === "string" ? profile : undefined} />;
}
