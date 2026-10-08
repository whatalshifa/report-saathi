// Shares are normally caught by the service worker (public/sw.js) before they get here. This answers
// only if it wasn't running yet (just installed, or the browser cleared it): the file can't be kept
// without it, so /share says so kindly instead of the person seeing an error page.

// A relative Location, so it stays on whatever address the person used.
const seeOther = (location: string) => new Response(null, { status: 303, headers: { Location: location } });

export function POST() {
  return seeOther("/share?error=missed");
}

export function GET() {
  return seeOther("/share");
}
