import { cookies } from "next/headers";

import { Dashboard } from "@/components/Dashboard";
import { SampleDashboard } from "@/components/SampleDashboard";

export default async function Home({ searchParams }: PageProps<"/dashboard">) {
  // Signed-out visitors land in the app with the sample family open; signed-in people see their own.
  if (!(await cookies()).has("rs_session")) return <SampleDashboard />;
  const { profile } = await searchParams;
  return <Dashboard profileId={typeof profile === "string" ? profile : undefined} />;
}
