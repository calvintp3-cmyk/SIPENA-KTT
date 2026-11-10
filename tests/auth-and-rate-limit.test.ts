import { describe, expect, it } from "vitest";
import { checkSlidingRateLimit, resetRateLimitKey } from "@/lib/rate-limit";
import {
  canEditPhenomena,
  signSessionToken,
  verifySessionToken,
} from "@/lib/session-token";
import { safeExternalHref } from "@/lib/utils";

describe("Session HMAC Auth, RBAC, Rate Limiting & Safe Links", () => {
  it("signs and verifies a valid BPS analyst token", async () => {
    const token = await signSessionToken({
      id: "user-123",
      email: "analis@bps6504.go.id",
      name: "Analis Nerwilis",
      role: "editor",
    });

    const decoded = await verifySessionToken(token);
    expect(decoded).not.toBeNull();
    expect(decoded?.email).toBe("analis@bps6504.go.id");
    expect(decoded?.role).toBe("editor");
  });

  it("rejects tampered tokens and malformed payloads", async () => {
    const token = await signSessionToken({
      id: "user-999",
      email: "viewer@bps6504.go.id",
      name: "Pimpinan Viewer",
      role: "viewer",
    });

    const [payloadB64, sigB64] = token.split(".");
    const tamperedSig = `${sigB64?.slice(0, -4)}AAAA`;
    expect(await verifySessionToken(`${payloadB64}.${tamperedSig}`)).toBeNull();
    expect(await verifySessionToken("not-a-valid-token")).toBeNull();
    expect(await verifySessionToken(null)).toBeNull();
  });

  it("enforces role permissions strictly (admin/editor only, viewer read-only)", () => {
    const baseExp = Math.floor(Date.now() / 1000) + 3600;
    expect(
      canEditPhenomena({
        id: "1",
        email: "a@bps6504.go.id",
        name: "Admin",
        role: "admin",
        exp: baseExp,
      })
    ).toBe(true);
    expect(
      canEditPhenomena({
        id: "2",
        email: "e@bps6504.go.id",
        name: "Editor",
        role: "editor",
        exp: baseExp,
      })
    ).toBe(true);
    expect(
      canEditPhenomena({
        id: "3",
        email: "v@bps6504.go.id",
        name: "Viewer",
        role: "viewer",
        exp: baseExp,
      })
    ).toBe(false);
    expect(canEditPhenomena(null)).toBe(false);
  });

  it("blocks brute-force attempts past the sliding window threshold and clears cleanly on reset", () => {
    const key = "test:login:ip:acct";
    resetRateLimitKey(key);

    for (let i = 0; i < 3; i++) {
      const check = checkSlidingRateLimit(key, {
        maxAttempts: 3,
        windowMs: 60_000,
      });
      expect(check.allowed).toBe(true);
    }

    const blocked = checkSlidingRateLimit(key, {
      maxAttempts: 3,
      windowMs: 60_000,
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSeconds).toBeGreaterThanOrEqual(1);

    resetRateLimitKey(key);
    expect(
      checkSlidingRateLimit(key, { maxAttempts: 3, windowMs: 60_000 }).allowed
    ).toBe(true);
  });

  it("neutralizes javascript: or data: URIs while keeping safe external article links", () => {
    expect(safeExternalHref("https://benuanta.co.id/berita-ekonomi")).toBe(
      "https://benuanta.co.id/berita-ekonomi"
    );
    expect(safeExternalHref("javascript:alert(1)")).toBeNull();
    expect(safeExternalHref("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeExternalHref("")).toBeNull();
  });
});

