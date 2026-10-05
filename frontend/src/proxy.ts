import { NextResponse, type NextRequest } from "next/server";

// Pages anyone can open. Everything else needs a sign-in cookie.
const PUBLIC = ["/login", "/signup", "/accuracy"];

/**
 * Sends signed-out visitors to the sign-in page before any private page loads.
 * This only checks that a cookie exists; the API checks that it is valid on
 * every request, so a fake cookie gets nothing but an empty page and a redirect.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (PUBLIC.includes(pathname) || request.cookies.has("rs_session")) return NextResponse.next();
  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Not for API calls (FastAPI checks those) or static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico)$).*)"],
};
