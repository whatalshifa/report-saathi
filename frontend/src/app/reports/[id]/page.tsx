import type { Metadata } from "next";

import { ReportView } from "@/components/ReportView";

export const metadata: Metadata = { title: "Report" };

export default async function ReportPage({ params }: PageProps<"/reports/[id]">) {
  const { id } = await params;
  return <ReportView id={id} />;
}
