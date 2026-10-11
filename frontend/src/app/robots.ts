import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.SITE_URL ?? "https://report-saathi-six.vercel.app";
  // Only the public pages are worth indexing; everything else needs a sign-in. The share image and the
  // icons are allowed too, so link previews and search results can show them.
  return {
    rules: {
      userAgent: "*",
      allow: [
        "/$",
        "/dashboard$",
        "/accuracy",
        "/privacy",
        "/login",
        "/signup",
        "/opengraph-image",
        "/icon",
        "/apple-icon",
        "/manifest.webmanifest",
      ],
      disallow: "/",
    },
    sitemap: `${site}/sitemap.xml`,
  };
}
