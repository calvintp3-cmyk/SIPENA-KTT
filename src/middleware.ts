import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/session-token";

const PUBLIC_PATHS = new Set(["/login", "/favicon.ico", "/icon.svg", "/robots.txt"]);

function buildPublicOriginUrl(path: string, request: NextRequest): URL {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const hostHeader = request.headers.get("host");
  const rawHost = (forwardedHost ?? hostHeader ?? "").split(",")[0]?.trim();
  const rawProto = (request.headers.get("x-forwarded-proto") ?? "")
    .split(",")[0]
    ?.trim()
    .toLowerCase();
  const proto = rawProto === "https" || rawProto === "http" ? rawProto : "http";

  if (rawHost && /^[a-z0-9.-]+(:\d+)?$/i.test(rawHost)) {
    return new URL(path, `${proto}://${rawHost}`);
  }
  return new URL(path, request.url);
}

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
    return NextResponse.redirect(buildPublicOriginUrl("/login", request));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
