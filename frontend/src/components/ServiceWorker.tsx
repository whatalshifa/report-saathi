"use client";

import { useEffect } from "react";

/**
 * Registers public/sw.js, which lets the installed app receive reports shared from WhatsApp.
 * Only in a production build (a worker would get in the way of hot reloading) and only where
 * browsers allow workers: https, or this computer while testing.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    const local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (location.protocol !== "https:" && !local) return;
    // updateViaCache "none": always check for a new worker, never use a cached copy of sw.js.
    navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {});
  }, []);
  return null;
}
