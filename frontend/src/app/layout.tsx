import type { Metadata, Viewport } from "next";
import { Baloo_2, Mukta } from "next/font/google";
import { cookies } from "next/headers";
import Link from "next/link";

import { MobileTabs } from "@/components/MobileTabs";
import { ServerWaking } from "@/components/ServerWaking";
import { ServiceWorker } from "@/components/ServiceWorker";
import { SiteHeader } from "@/components/SiteHeader";
import { THEME_SCRIPT } from "@/components/ThemeToggle";
import "./globals.css";

// Both have Devanagari, so explanations in Hindi and Marathi match the English ones.
const mukta = Mukta({
  variable: "--font-mukta",
  subsets: ["latin", "devanagari"],
  weight: ["400", "500", "600", "700"],
});
const baloo = Baloo_2({
  variable: "--font-baloo",
  subsets: ["latin", "devanagari"],
  weight: ["500", "600", "700", "800"],
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
    { media: "(prefers-color-scheme: light)", color: "#fbf7f2" },
    { media: "(prefers-color-scheme: dark)", color: "#141015" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const signedIn = (await cookies()).has("rs_session");
  return (
    <html lang="en" className={`${mukta.variable} ${baloo.variable} h-full antialiased`} suppressHydrationWarning>
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
              <Link href="/privacy" className="hover:text-foreground">
                Privacy
              </Link>
              <a href="https://github.com/whatalshifa/report-saathi" className="hover:text-foreground">
                Source code
              </a>
            </nav>
          </div>
        </footer>
        <MobileTabs signedIn={signedIn} />
        <ServerWaking />
        <ServiceWorker />
      </body>
    </html>
  );
}
