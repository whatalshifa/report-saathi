import type { Metadata, Viewport } from "next";
import { Inter, Noto_Sans_Devanagari } from "next/font/google";
import { cookies } from "next/headers";

import { ServerWaking } from "@/components/ServerWaking";
import { ServiceWorker } from "@/components/ServiceWorker";
import { AppShell } from "@/components/shell/AppShell";
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
        <AppShell signedIn={signedIn}>{children}</AppShell>
        <ServerWaking />
        <ServiceWorker />
      </body>
    </html>
  );
}
