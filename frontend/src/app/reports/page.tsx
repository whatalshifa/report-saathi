import type { Metadata } from "next";

import { ReportsIndex } from "@/components/ReportsIndex";

export const metadata: Metadata = { title: "Reports" };

export default function ReportsPage() {
  return <ReportsIndex />;
}
