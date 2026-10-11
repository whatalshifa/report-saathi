import type { Metadata } from "next";

import { FamilyManager } from "@/components/FamilyManager";

export const metadata: Metadata = { title: "Family" };

export default function FamilyPage() {
  return <FamilyManager />;
}
