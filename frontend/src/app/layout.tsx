import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";

import { AccountNav } from "@/components/AccountNav";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ReportSaathi",
  description:
    "Keep your family’s lab reports in one place. Every value read, out-of-range ones flagged and explained, and a timeline across labs.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <header className="border-b print:hidden border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-4 py-4">
            <Link href="/" className="text-lg font-bold text-teal-700 dark:text-teal-400">
              ReportSaathi
            </Link>
            <AccountNav />
          </div>
        </header>
        <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 print:py-0">{children}</main>
        <footer className="border-t border-slate-200 px-4 py-6 text-center text-xs text-slate-500 print:hidden dark:border-slate-800">
          Not medical advice. Always check with your doctor.{" "}
          <Link href="/accuracy" className="underline hover:text-slate-700 dark:hover:text-slate-300">
            How accurate is it?
          </Link>
        </footer>
      </body>
    </html>
  );
}
