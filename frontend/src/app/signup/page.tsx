import type { Metadata } from "next";

import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = {
  title: "Create a free account",
  description: "Create a free ReportSaathi account to keep your family's lab reports, explained in English, Hindi or Marathi and tracked across labs.",
  alternates: { canonical: "/signup" },
};

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const { next } = await searchParams;
  return <AuthForm mode="signup" next={typeof next === "string" ? next : undefined} />;
}
