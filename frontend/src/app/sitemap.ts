import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const site = process.env.SITE_URL ?? "https://report-saathi-six.vercel.app";
  return ["", "/accuracy", "/signup", "/login"].map((path) => ({ url: `${site}${path}` }));
}
