import { NextResponse, type NextRequest } from "next/server";

// The pages that show a person's own data. Signed out, these go to the sign-in page first.
// Everything else is public: the landing page, the sample dashboard, sign-in, accuracy, privacy,
// a doctor's shared brief (/shared), the icons and the install files, and the 404 page for a mistyped
// address. This is a courtesy, not the lock: the API checks the sign-in on every request, so a private
// page opened without one gets nothing and is sent to sign in by the page itself (lib/api.ts).
const PRIVATE = ["/account", "/family", "/reports", "/profiles", "/briefs", "/share"];

const isPrivate = (pathname: string) => PRIVATE.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (!isPrivate(pathname) || request.cookies.has("rs_session")) return NextResponse.next();
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  // Not for API calls (FastAPI checks those) or static files.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:png|svg|ico)$).*)"],
};
