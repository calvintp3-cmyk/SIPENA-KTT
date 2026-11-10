import crypto from "node:crypto";

const TRACKING_PARAMS = new Set([
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_term",
  "utm_content",
  "fbclid",
  "gclid",
  "ref",
  "source",
  "mc_cid",
  "mc_eid",
]);

/**
 * Normalizes a news URL by removing tracking query params, fragments, and trailing slashes.
 */
export function canonicalizeUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl.trim());
    parsed.hash = "";
    for (const key of Array.from(parsed.searchParams.keys())) {
      if (TRACKING_PARAMS.has(key.toLowerCase()) || key.toLowerCase().startsWith("utm_")) {
        parsed.searchParams.delete(key);
      }
    }
    parsed.searchParams.sort();
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith("/")) {
      parsed.pathname = parsed.pathname.slice(0, -1);
    }
    return parsed.toString();
  } catch {
    return rawUrl.trim();
  }
}

export function hashUrl(canonicalUrl: string): string {
  return crypto.createHash("sha256").update(canonicalUrl).digest("hex");
}

export function normalizeAndHashUrl(rawUrl: string): { canonicalUrl: string; urlHash: string } {
  const canonicalUrl = canonicalizeUrl(rawUrl);
  return { canonicalUrl, urlHash: hashUrl(canonicalUrl) };
}

