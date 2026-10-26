import { NextResponse, type NextRequest } from "next/server";

/**
 * Optimistic auth gate: sends visitors without a session cookie to /login.
 * The real check (is the session valid?) happens in every page and action via requireUser().
 */
export function proxy(request: NextRequest) {
  if (request.cookies.has("lane_session")) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = `?next=${encodeURIComponent(request.nextUrl.pathname + request.nextUrl.search)}`;
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/start/:path*", "/assess/:path*", "/profile/:path*", "/lanes/:path*", "/settings/:path*"],
};
