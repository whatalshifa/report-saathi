import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.SITE_URL ?? "https://report-saathi-six.vercel.app";
  // Only the public pages are worth indexing; everything else needs a sign-in.
  return {
    rules: { userAgent: "*", allow: ["/$", "/dashboard$", "/accuracy", "/login", "/signup"], disallow: "/" },
    sitemap: `${site}/sitemap.xml`,
  };
}
