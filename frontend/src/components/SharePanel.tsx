"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

import { ErrorNote } from "@/components/Skeleton";
import {
  createShareLink,
  getMe,
  getShareQr,
  listShareLinks,
  revokeShareLink,
  shareUrl,
  type CreatedShareLink,
  type ShareLink,
} from "@/lib/api";
import { formatDate } from "@/lib/format";

// The phone's own share sheet (WhatsApp, SMS, email...). Most phones have it; many computers don't.
const noSubscribe = () => () => {};
const hasNativeShare = () => typeof navigator.share === "function";

/** Make a link a doctor can open without an account, and see or turn off the links already made. */
export function SharePanel({
  briefId,
  profileId,
  personName,
}: {
  briefId: string;
  profileId: string;
  personName: string;
}) {
  const [links, setLinks] = useState<ShareLink[] | null>(null);
  const [created, setCreated] = useState<CreatedShareLink | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // A demo account's links end with the account, within a day, not after 7 days.
  const [guest, setGuest] = useState(false);
  const canShare = useSyncExternalStore(noSubscribe, hasNativeShare, () => false);

  const reload = useCallback(
    () =>
      listShareLinks(profileId)
        .then(setLinks)
        .catch((err) => setError(err instanceof Error ? err.message : "Could not load your links")),
    [profileId],
  );

  useEffect(() => {
    reload();
    getMe()
      .then((me) => setGuest(Boolean(me?.is_guest)))
      .catch(() => {});
  }, [reload]);

  async function create() {
    setBusy(true);
    setError(null);
    setCopied(false);
    setQrOpen(false);
    try {
      setCreated(await createShareLink(briefId));
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not make a link");
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    setError(null);
    try {
      await revokeShareLink(id);
      if (created?.id === id) setCreated(null);
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not turn the link off");
    }
  }

  const url = created ? shareUrl(created.token) : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      // Some browsers block the clipboard; selecting the text lets people copy it themselves.
      (document.getElementById("share-url") as HTMLInputElement | null)?.select();
    }
  }

  async function sendWithPhone() {
    try {
      await navigator.share({
        title: `Lab summary for ${personName}`,
        text: `Lab summary for ${personName}, from ReportSaathi. Read-only, works until ${formatDate(created!.expires_at)}.`,
        url,
      });
    } catch {
      // Closing the share sheet without picking an app lands here; nothing to do.
    }
  }

  return (
    <section aria-labelledby="share-heading" className="card p-5 sm:p-6 print:hidden">
      <h2 id="share-heading" className="text-lg font-semibold">
        Share with your doctor
      </h2>
      <p className="mt-1 text-sm text-muted">
        Make a private link to this summary. Your doctor can open it on their phone without an account, and can only
        read it. The link stops working{" "}
        {guest ? "when this demo account is deleted" : "after 7 days"}, or as soon as you revoke it.
      </p>

      {created && (
        <div className="mt-4 rounded-xl border border-teal-200 bg-teal-50/60 p-4 dark:border-teal-900 dark:bg-teal-950/40">
          <label htmlFor="share-url" className="text-sm font-medium">
            Your link, works until {formatDate(created.expires_at)}
          </label>
          <input
            id="share-url"
            readOnly
            value={url}
            onFocus={(e) => e.currentTarget.select()}
            className="input font-mono text-sm"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={copy} className="btn btn-primary btn-sm">
              {copied ? "Copied" : "Copy link"}
            </button>
            {canShare && (
              <button onClick={sendWithPhone} className="btn btn-secondary btn-sm">
                Send on WhatsApp or another app
              </button>
            )}
            <button
              onClick={() => setQrOpen((open) => !open)}
              aria-expanded={qrOpen}
              aria-controls="share-qr"
              className="btn btn-secondary btn-sm"
            >
              {qrOpen ? "Hide QR code" : "Show QR code"}
            </button>
          </div>
          {/* Keyed by link, so a new link never shows the last one's code. */}
          {qrOpen && <ShareQr key={created.id} url={url} />}
          <p className="mt-2 text-xs text-muted">
            Send it now: for your privacy we show each link only once. You can always make a new one.
          </p>
          <p aria-live="polite" className="sr-only">
            {copied ? "Link copied" : ""}
          </p>
        </div>
      )}

      <button onClick={create} disabled={busy} className={`btn mt-4 ${created ? "btn-secondary" : "btn-primary"}`}>
        {busy ? "Making a link…" : created ? "Make another link" : "Create a link"}
      </button>

      {error && (
        <div className="mt-4">
          <ErrorNote message={error} />
        </div>
      )}

      {links && links.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold">Links you’ve made</h3>
          <ul className="mt-1 divide-y divide-line">
            {links.map((link) => (
              <ShareRow key={link.id} link={link} current={link.brief_id === briefId} onRevoke={revoke} />
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** The link as a QR code a doctor can scan off this screen, and the same code to save. */
function ShareQr({ url }: { url: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getShareQr(url)
      .then((qr) => setSvg(qr.svg))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not make the QR code"));
  }, [url]);

  const image = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : "";

  function save(href: string, name: string) {
    const a = document.createElement("a");
    a.href = href;
    a.download = name;
    a.click();
  }

  // Phones' galleries and WhatsApp don't take SVGs, so the main download is a PNG drawn from it.
  function savePng() {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 600;
      const draw = canvas.getContext("2d");
      if (!draw) return;
      draw.imageSmoothingEnabled = false; // crisp squares scan best
      draw.drawImage(img, 0, 0, canvas.width, canvas.height);
      save(canvas.toDataURL("image/png"), "reportsaathi-doctor-link.png");
    };
    img.src = image;
  }

  return (
    <div id="share-qr" className="mt-4 flex flex-col items-center gap-3 sm:flex-row sm:items-start">
      {error ? (
        <ErrorNote message={error} />
      ) : (
        <>
          {/* Always black on a white tile: scanners need the contrast, in dark mode too. */}
          <div className="h-48 w-48 shrink-0 rounded-xl border border-line bg-white p-1 shadow-sm">
            {svg ? (
              // A data URL made here, not a remote image, so not one for Next's image optimiser.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="QR code for your link" className="h-full w-full [image-rendering:pixelated]" />
            ) : (
              <div role="status" className="h-full w-full animate-pulse rounded-lg bg-slate-100">
                <span className="sr-only">Making the QR code…</span>
              </div>
            )}
          </div>
          <div className="text-sm text-muted sm:pt-1">
            <p>Your doctor can scan this with their phone&apos;s camera to open the summary.</p>
            <p className="mt-1">Anyone who scans it can read the summary, so show it only to your doctor.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={savePng} disabled={!svg} className="btn btn-secondary btn-sm">
                Download image
              </button>
              <button
                onClick={() => save(image, "reportsaathi-doctor-link.svg")}
                disabled={!svg}
                className="btn btn-secondary btn-sm"
              >
                Download SVG
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function ShareRow({
  link,
  current,
  onRevoke,
}: {
  link: ShareLink;
  current: boolean;
  onRevoke: (id: string) => void;
}) {
  const made = formatDate(link.created_at);
  const when =
    link.state === "active"
      ? `works until ${formatDate(link.expires_at)}`
      : link.state === "revoked"
        ? `revoked ${formatDate(link.revoked_at)}`
        : `expired ${formatDate(link.expires_at)}`;
  const opened =
    link.view_count === 0
      ? "Not opened yet"
      : `Opened ${link.view_count} ${link.view_count === 1 ? "time" : "times"}, last on ${formatDate(link.last_viewed_at)}`;

  return (
    <li aria-label={`Link made ${made}`} className="flex flex-wrap items-center justify-between gap-3 py-3">
      <div className="min-w-0 text-sm">
        <p className={link.state === "active" ? "font-medium" : "font-medium text-muted"}>
          Made {made}, {when}
        </p>
        <p className="text-muted">
          {opened}
          {!current && " · for an earlier summary"}
        </p>
      </div>
      {link.state === "active" ? (
        <button onClick={() => onRevoke(link.id)} className="btn btn-danger btn-sm" title="Turn this link off now">
          Revoke
        </button>
      ) : (
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {link.state === "revoked" ? "Revoked" : "Expired"}
        </span>
      )}
    </li>
  );
}
