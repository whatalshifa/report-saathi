// ReportSaathi's service worker. It has one job: receive a report shared from another app (the
// "Share to" menu in WhatsApp, offered because the web app manifest has a share_target) and hand it
// to the /share page. It caches nothing else: every page, API answer and file goes straight to the
// network, so no private page or report is ever served from here.
//
// The small functions below are also loaded into a normal page by the browser tests (e2e/app.spec.ts),
// which call handleShare() directly, so keep them free of service-worker-only APIs.

// Must match src/lib/sharedFile.ts.
const SHARE_CACHE = "rs-share-v1";
const SHARE_KEY = "/share-target/file";
// Must match what the API accepts (backend/app/api/reports.py and config.py).
const SHARE_TYPES = { pdf: "application/pdf", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
const SHARE_MAX_BYTES = 20_000_000;

/** True for the POST the phone sends when someone shares a file to the installed app. */
function isShareTarget(request) {
  return request.method === "POST" && new URL(request.url).pathname === "/share-target";
}

/**
 * False for a post another website sent: any page can submit a form to /share-target. A share from
 * the phone's share sheet names no referrer, and the app's own pages are this site. A page can hide
 * its referrer too, so /share also asks the person to add only a file they shared themselves.
 */
function fromThisSite(referrer) {
  if (!referrer || referrer === "about:client") return true;
  try {
    return new URL(referrer).origin === self.location.origin;
  } catch {
    return false;
  }
}

/** The file's type, or one guessed from its name: some apps share files with no type set. */
function sharedType(file) {
  if (Object.values(SHARE_TYPES).includes(file.type)) return file.type;
  const extension = (file.name || "").split(".").pop().toLowerCase();
  return SHARE_TYPES[extension] || null;
}

/** The first shared file the app can read, or null. */
function pickSharedFile(formData) {
  for (const value of formData.getAll("file")) {
    if (typeof value !== "string" && sharedType(value)) return value;
  }
  return null;
}

/** Keeps one shared file for /share to pick up, replacing any earlier one. */
async function storeSharedFile(file) {
  const cache = await caches.open(SHARE_CACHE);
  const headers = {
    "Content-Type": sharedType(file),
    // Header values must be plain ASCII; names from phones are often in Hindi or Marathi.
    "X-File-Name": encodeURIComponent(file.name || "report"),
    "X-Shared-At": String(Date.now()),
  };
  await cache.put(SHARE_KEY, new Response(file, { headers }));
}

/** Stores the shared file, then sends the browser on to /share (303, so it arrives there as a GET). */
async function handleShare(request) {
  let error = null;
  if (!fromThisSite(request.referrer)) {
    error = "elsewhere";
  } else {
    try {
      const file = pickSharedFile(await request.formData());
      if (!file) error = "unsupported";
      else if (file.size > SHARE_MAX_BYTES) error = "too-big";
      else await storeSharedFile(file);
    } catch {
      error = "failed";
    }
  }
  const target = new URL(error ? `/share?error=${error}` : "/share", self.location.origin);
  return Response.redirect(target.href, 303);
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));
self.addEventListener("fetch", (event) => {
  if (isShareTarget(event.request)) event.respondWith(handleShare(event.request));
  // Anything else: no respondWith, so the browser fetches it from the network as if this worker weren't here.
});
