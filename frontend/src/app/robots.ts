import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const site = process.env.SITE_URL ?? "https://report-saathi-six.vercel.app";
  // Only the public pages are worth indexing; everything else needs a sign-in. The share image, the
  // icons, the landing pictures and the site's own scripts, styles and images are allowed too, so
  // link previews and search engines see the pages as people do.
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
        "/landing/",
        "/_next/",
      ],
      disallow: "/",
    },
    sitemap: `${site}/sitemap.xml`,
  };
}
