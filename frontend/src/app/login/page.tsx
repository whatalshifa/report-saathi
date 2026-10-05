import { AuthForm } from "@/components/AuthForm";

export const metadata = { title: "Sign in · ReportSaathi" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next } = await searchParams;
  return <AuthForm mode="login" next={typeof next === "string" ? next : undefined} />;
}
