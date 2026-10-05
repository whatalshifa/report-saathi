import { Dashboard } from "@/components/Dashboard";

export default async function Home({ searchParams }: PageProps<"/">) {
  const { profile } = await searchParams;
  return <Dashboard profileId={typeof profile === "string" ? profile : undefined} />;
}
