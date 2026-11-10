import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { eq, or } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getClientIp } from "@/lib/audit";
import { SESSION_COOKIE_NAME, signSessionToken } from "@/lib/auth";
import { checkSlidingRateLimit, resetRateLimitKey } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().min(3).max(150).trim().toLowerCase(),
  password: z.string().min(3).max(128),
});

const RATE_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    const ipBurstCheck = checkSlidingRateLimit(`login:ip:${clientIp}`, {
      maxAttempts: 30,
      windowMs: RATE_WINDOW_MS,
      increment: false,
    });
    if (!ipBurstCheck.allowed) {
      return NextResponse.json(
        {
          error:
            "Terlalu banyak percobaan login dari jaringan ini. Coba lagi nanti.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(ipBurstCheck.retryAfterSeconds) },
        }
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Email dan kata sandi wajib diisi dengan format yang benar." },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const accountKey = `login:acct:${clientIp}:${email}`;
    const acctCheck = checkSlidingRateLimit(accountKey, {
      maxAttempts: 10,
      windowMs: RATE_WINDOW_MS,
      increment: false,
    });
    if (!acctCheck.allowed) {
      return NextResponse.json(
        {
          error:
            "Akun sementara dikunci karena terlalu banyak kegagalan masuk. Tunggu beberapa menit.",
        },
        {
          status: 429,
          headers: { "Retry-After": String(acctCheck.retryAfterSeconds) },
        }
      );
    }

    // =========================================================================
    // QUICK CREDENTIALS (Admin & Viewer)
    // =========================================================================
    const isQuickAdmin =
      (email === "admin" || email === "admin@bps6504.go.id") && password === "admin";
    const isQuickViewer =
      (email === "viewer" || email === "viewer@bps6504.go.id") && password === "viewer";

    if (isQuickAdmin || isQuickViewer) {
      const role = isQuickAdmin ? ("admin" as const) : ("viewer" as const);
      const name = isQuickAdmin
        ? "Koordinator Nerwilis (Admin)"
        : "Kepala BPS Tana Tidung (Viewer)";
      const userEmail = isQuickAdmin ? "admin@bps6504.go.id" : "viewer@bps6504.go.id";
      const userId = isQuickAdmin
        ? "00000000-0000-0000-0000-000000000001"
        : "00000000-0000-0000-0000-000000000003";

      resetRateLimitKey(accountKey);

      const token = await signSessionToken({
        id: userId,
        email: userEmail,
        name,
        role,
      });

      const response = NextResponse.json({
        success: true,
        user: {
          id: userId,
          email: userEmail,
          name,
          role,
          nip: isQuickAdmin ? "199204152014101001" : "197911032002121003",
        },
      });

      const isHttps =
        request.headers.get("x-forwarded-proto") === "https" ||
        request.url.startsWith("https://");

      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: token,
        httpOnly: true,
        sameSite: "lax",
        secure: isHttps,
        path: "/",
        maxAge: 60 * 60 * 12,
      });

      return response;
    }

    // Support both username alias ("admin", "viewer") and full email
    const emailAliases: string[] = [email];
    if (email === "admin") emailAliases.push("admin@bps6504.go.id");
    if (email === "viewer") emailAliases.push("viewer@bps6504.go.id");

    const matchedUsers = await db
      .select()
      .from(users)
      .where(or(...emailAliases.map((e) => eq(users.email, e))))
      .limit(1);

    const user = matchedUsers[0];

    if (!user) {
      checkSlidingRateLimit(`login:ip:${clientIp}`, {
        maxAttempts: 30,
        windowMs: RATE_WINDOW_MS,
      });
      checkSlidingRateLimit(accountKey, {
        maxAttempts: 10,
        windowMs: RATE_WINDOW_MS,
      });
      return NextResponse.json(
        { error: "Email atau kata sandi tidak valid." },
        { status: 401 }
      );
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) {
      checkSlidingRateLimit(`login:ip:${clientIp}`, {
        maxAttempts: 30,
        windowMs: RATE_WINDOW_MS,
      });
      checkSlidingRateLimit(accountKey, {
        maxAttempts: 10,
        windowMs: RATE_WINDOW_MS,
      });
      return NextResponse.json(
        { error: "Email atau kata sandi tidak valid." },
        { status: 401 }
      );
    }

    resetRateLimitKey(accountKey);

    const token = await signSessionToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        nip: user.nip,
      },
    });

    const isHttps =
      request.headers.get("x-forwarded-proto") === "https" ||
      request.url.startsWith("https://");

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: "lax",
      secure: isHttps,
      path: "/",
      maxAge: 60 * 60 * 12,
    });

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan internal saat proses masuk." },
      { status: 500 }
    );
  }
}

