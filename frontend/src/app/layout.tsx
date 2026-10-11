import type { Metadata, Viewport } from "next";
import { Figtree, Noto_Sans_Devanagari } from "next/font/google";
import { cookies } from "next/headers";

import { ServerWaking } from "@/components/ServerWaking";
import { ServiceWorker } from "@/components/ServiceWorker";
import { AppShell } from "@/components/shell/AppShell";
import { THEME_SCRIPT } from "@/components/ThemeToggle";
import "./globals.css";

// Figtree, a warm and rounded sans, for everything. It has no Devanagari, so Hindi and Marathi fall
// through to Noto Sans Devanagari.
const figtree = Figtree({ variable: "--font-figtree", subsets: ["latin"] });
const devanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500", "600", "700"],
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
    { media: "(prefers-color-scheme: light)", color: "#fff7f3" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1118" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const signedIn = (await cookies()).has("rs_session");
  return (
    <html lang="en" className={`${figtree.variable} ${devanagari.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-full focus:bg-surface focus:px-4 focus:py-2 focus:font-semibold focus:shadow-soft"
        >
          Skip to content
        </a>
        <AppShell signedIn={signedIn}>{children}</AppShell>
        <ServerWaking />
        <ServiceWorker />
      </body>
    </html>
  );
}
