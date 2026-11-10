import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session-token";

const PUBLIC_PATHS = new Set(["/login", "/favicon.ico", "/robots.txt"]);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/api/") ||
    pathname.startsWith("/_next/")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const user = await verifySessionToken(token);

  if (!user) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

