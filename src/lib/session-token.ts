export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "editor" | "viewer";
  exp: number;
}

export const SESSION_COOKIE_NAME = "sipena_session";
const SESSION_DURATION_SECONDS = 60 * 60 * 12; // 12 hours (1 work shift)

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET environment variable must be configured in production.");
    }
    return "sipena-ktt-dev-fallback-secret-key-change-me";
  }
  return secret;
}

function toBase64Url(bytes: Uint8Array): string {
  const bin = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? "" : "=".repeat(4 - (str.length % 4));
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

async function getHmacKey(): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    enc.encode(getSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signSessionToken(
  user: Omit<SessionUser, "exp">
): Promise<string> {
  const payload: SessionUser = {
    ...user,
    exp: Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS,
  };
  const payloadBytes = new TextEncoder().encode(JSON.stringify(payload));
  const payloadB64 = toBase64Url(payloadBytes);
  const key = await getHmacKey();
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(payloadB64)
  );
  const sigB64 = toBase64Url(new Uint8Array(sigBuffer));
  return `${payloadB64}.${sigB64}`;
}

export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionUser | null> {
  if (!token || !token.includes(".")) return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;

  try {
    const key = await getHmacKey();
    const sigBytes = fromBase64Url(sigB64);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      sigBytes.buffer as ArrayBuffer,
      new TextEncoder().encode(payloadB64)
    );
    if (!valid) return null;

    const payloadJson = new TextDecoder().decode(fromBase64Url(payloadB64));
    const parsed = JSON.parse(payloadJson) as SessionUser;
    if (!parsed.exp || parsed.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function canEditPhenomena(user: SessionUser | null): boolean {
  if (!user) return false;
  return user.role === "admin" || user.role === "editor";
}

