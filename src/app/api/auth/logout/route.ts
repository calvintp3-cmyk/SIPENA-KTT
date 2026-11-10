import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export async function POST(request: Request) {
  const isHttps =
    request.headers.get("x-forwarded-proto") === "https" ||
    request.url.startsWith("https://");

  const response = NextResponse.json({ success: true });
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: isHttps,
    path: "/",
    maxAge: 0,
  });
  return response;
}
