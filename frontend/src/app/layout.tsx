import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { cookies } from "next/headers";
import Link from "next/link";

import { ServerWaking } from "@/components/ServerWaking";
import { SiteHeader } from "@/components/SiteHeader";
import { THEME_SCRIPT } from "@/components/ThemeToggle";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const DESCRIPTION =
  "Upload a lab report photo or PDF. ReportSaathi reads every value, flags what's out of range, explains it in English, Hindi or Marathi, and tracks your family's results across labs.";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL ?? "https://report-saathi-six.vercel.app"),
  title: { default: "ReportSaathi: understand your lab reports", template: "%s · ReportSaathi" },
  description: DESCRIPTION,
  applicationName: "ReportSaathi",
  openGraph: {
    type: "website",
    siteName: "ReportSaathi",
    title: "ReportSaathi: understand your lab reports",
    description: DESCRIPTION,
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f9fb" },
    { media: "(prefers-color-scheme: dark)", color: "#070b14" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const signedIn = (await cookies()).has("rs_session");
  return (
    <html lang="en" className={`${geistSans.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-lg focus:bg-surface focus:px-3 focus:py-2"
        >
          Skip to content
        </a>
        <SiteHeader signedIn={signedIn} />
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:py-10 print:py-0">
          {children}
        </main>
        <footer className="border-t border-line print:hidden">
          <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-6 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
            <p>ReportSaathi explains lab reports. It is not medical advice; always check with your doctor.</p>
            <nav className="flex gap-4">
              <Link href="/accuracy" className="hover:text-foreground">
                How accurate is it?
              </Link>
              <a href="https://github.com/whatalshifa/report-saathi" className="hover:text-foreground">
                Source code
              </a>
            </nav>
          </div>
        </footer>
        <ServerWaking />
      </body>
    </html>
  );
}
