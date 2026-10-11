import type { MetadataRoute } from "next";

// The public pages, most important first. The rest of the app needs a sign-in, so it isn't listed.
const PAGES: { path: string; priority: number }[] = [
  { path: "", priority: 1 },
  { path: "/dashboard", priority: 0.8 },
  { path: "/accuracy", priority: 0.5 },
  { path: "/privacy", priority: 0.5 },
  { path: "/signup", priority: 0.4 },
  { path: "/login", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.SITE_URL ?? "https://report-saathi-six.vercel.app";
  return PAGES.map(({ path, priority }) => ({ url: `${site}${path}`, priority }));
}
