import { NextResponse, type NextRequest } from "next/server";
import { isValidSessionToken, SESSION_COOKIE } from "@/lib/session";

// The demo is public on the internet but writes real data, so it sits behind
// a shared password, as the back office does.
export function proxy(request: NextRequest) {
  if (isValidSessionToken(request.cookies.get(SESSION_COOKIE)?.value)) {
    return NextResponse.next();
  }
  const login = new URL("/login", request.url);
  const next = request.nextUrl.pathname + request.nextUrl.search;
  if (next !== "/") login.searchParams.set("next", next);
  return NextResponse.redirect(login);
}

export const config = {
  // Everything except the login page and static assets (the plate models included).
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|models/).*)"],
};
