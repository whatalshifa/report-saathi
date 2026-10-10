import { NextResponse, type NextRequest } from "next/server";

// Pages anyone can open. Everything else needs a sign-in cookie.
const PUBLIC = new Set([
  "/",
  "/login",
  "/signup",
  "/about",
  "/accuracy",
  "/privacy",
  // A brief shared with a doctor: the token after "#" is the permission, and the API checks it.
  "/shared",
  "/robots.txt",
  "/sitemap.xml",
  // What a phone fetches to install the app, signed in or not. /share-target is only reached when
  // the service worker isn't running; /share itself stays private, so a signed-out share goes via sign-in.
  "/manifest.webmanifest",
  "/sw.js",
  "/share-target",
]);
// Generated images (the share preview, the favicon and the app icons under /icons/) are public too.
const PUBLIC_PREFIXES = ["/opengraph-image", "/twitter-image", "/icon", "/apple-icon"];

/**
 * Sends signed-out visitors to the sign-in page before any private page loads.
 * This only checks that a cookie exists; the API checks that it is valid on
 * every request, so a fake cookie gets nothing but an empty page and a redirect.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isPublic = PUBLIC.has(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isPublic || request.cookies.has("rs_session")) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Not for API calls (FastAPI checks those) or static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico)$).*)"],
};
