import type { MetadataRoute } from "next";

/**
 * Makes the site installable ("Add to Home screen"). Once installed on Android, ReportSaathi shows
 * up in WhatsApp's "Share to" menu: a shared PDF or photo is posted to /share-target, where
 * public/sw.js keeps it and opens /share to choose whose report it is.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "ReportSaathi",
    short_name: "ReportSaathi",
    description: "Understand your family's lab reports, in English, Hindi or Marathi.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    // --background in globals.css, so the splash screen matches the first page.
    background_color: "#fbf7f2",
    theme_color: "#fbf7f2",
    lang: "en-IN",
    categories: ["health", "medical"],
    icons: [
      { src: "/icons/192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    share_target: {
      action: "/share-target",
      method: "POST",
      enctype: "multipart/form-data",
      params: {
        // The same types the upload box takes; extensions too, for apps that send no type.
        files: [
          {
            name: "file",
            accept: ["application/pdf", "image/jpeg", "image/png", "image/webp", ".pdf", ".jpg", ".jpeg", ".png", ".webp"],
          },
        ],
      },
    },
  };
}
