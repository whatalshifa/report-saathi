import type { Metadata } from "next";
import { cookies } from "next/headers";

import { Dashboard } from "@/components/Dashboard";
import { SampleDashboard } from "@/components/SampleDashboard";

export const metadata: Metadata = {
  title: "Dashboard",
  description:
    "A sample family's lab reports in ReportSaathi: what needs attention, what's back in range, and each test's trend across labs. No sign-up needed.",
  alternates: { canonical: "/dashboard" },
};

export default async function Home({ searchParams }: PageProps<"/dashboard">) {
  // Signed-out visitors land in the app with the sample family open; signed-in people see their own.
  if (!(await cookies()).has("rs_session")) return <SampleDashboard />;
  const { profile } = await searchParams;
  return <Dashboard profileId={typeof profile === "string" ? profile : undefined} />;
}
