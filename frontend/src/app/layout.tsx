import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import { cookies } from "next/headers";
import Link from "next/link";

import { Logo } from "@/components/Logo";
import { MobileTabs } from "@/components/MobileTabs";
import { ServerWaking } from "@/components/ServerWaking";
import { ServiceWorker } from "@/components/ServiceWorker";
import { SiteHeader } from "@/components/SiteHeader";
import { THEME_SCRIPT } from "@/components/ThemeToggle";
import "./globals.css";

// One calm sans for everything. Inter has no Devanagari, so Hindi and Marathi fall through to
// Noto Sans Devanagari, which is drawn to the same proportions.
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const devanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500", "600"],
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
    <html lang="en" className={`${inter.variable} ${devanagari.variable} h-full antialiased`} suppressHydrationWarning>
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
        <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 pt-8 sm:px-6 sm:pt-10 print:py-0">
          {children}
        </main>
        <footer className="mt-16 border-t border-line print:hidden">
          <div className="mx-auto grid max-w-5xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
            <div className="max-w-xs">
              <Logo size="sm" />
              <p className="mt-3 text-sm text-muted">
                Reads your family&apos;s lab reports, flags what&apos;s out of range and explains it in English, Hindi
                or Marathi.
              </p>
            </div>
            <nav aria-label="Product" className="text-sm">
              <p className="font-medium">Product</p>
              <ul className="mt-3 space-y-2 text-muted">
                <li>
                  <Link href="/accuracy" className="hover:text-foreground">
                    How accurate is it?
                  </Link>
                </li>
                <li>
                  <Link href="/signup" className="hover:text-foreground">
                    Create an account
                  </Link>
                </li>
              </ul>
            </nav>
            <nav aria-label="Trust" className="text-sm">
              <p className="font-medium">Trust</p>
              <ul className="mt-3 space-y-2 text-muted">
                <li>
                  <Link href="/privacy" className="hover:text-foreground">
                    Privacy
                  </Link>
                </li>
                <li>
                  <a href="https://github.com/whatalshifa/report-saathi" className="hover:text-foreground">
                    Source code
                  </a>
                </li>
              </ul>
            </nav>
          </div>
          <div className="border-t border-line">
            <p className="mx-auto max-w-5xl px-4 py-5 text-[13px] text-muted sm:px-6">
              ReportSaathi explains lab reports. It is not medical advice; always check with your doctor.
            </p>
          </div>
        </footer>
        <MobileTabs signedIn={signedIn} />
        <ServerWaking />
        <ServiceWorker />
      </body>
    </html>
  );
}
