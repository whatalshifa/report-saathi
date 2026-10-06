// A report shared to the installed app from WhatsApp (or any app's "Share to" menu).
// public/sw.js receives it and keeps it in Cache Storage; the /share page reads it from there.
// It waits on this device only, until it is uploaded, discarded, the person signs out, or a day passes.

// Must match public/sw.js.
const SHARE_CACHE = "rs-share-v1";
const SHARE_KEY = "/share-target/file";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface SharedFile {
  file: File;
  sharedAt: number;
}

/** Cache Storage only exists on https (or localhost), and not during server rendering. */
const available = () => typeof caches !== "undefined";

/** The file waiting to be added, or null. A file older than a day is thrown away instead. */
export async function readSharedFile(): Promise<SharedFile | null> {
  if (!available()) return null;
  // Matching by cache name doesn't create the cache when nothing was ever shared.
  const response = await caches.match(SHARE_KEY, { cacheName: SHARE_CACHE });
  if (!response) return null;
  const sharedAt = Number(response.headers.get("X-Shared-At")) || 0;
  if (Date.now() - sharedAt > MAX_AGE_MS) {
    await clearSharedFile();
    return null;
  }
  let name = "report";
  try {
    name = decodeURIComponent(response.headers.get("X-File-Name") ?? name);
  } catch {
    // A garbled name: keep the default.
  }
  const blob = await response.blob();
  const type = response.headers.get("Content-Type") ?? blob.type;
  return { file: new File([blob], name, { type }), sharedAt };
}

export async function clearSharedFile(): Promise<void> {
  if (available()) await caches.delete(SHARE_CACHE);
}
