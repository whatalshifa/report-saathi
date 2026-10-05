import { ReportView } from "@/components/ReportView";

export default async function ReportPage({ params }: PageProps<"/reports/[id]">) {
  const { id } = await params;
  return <ReportView id={id} />;
}
