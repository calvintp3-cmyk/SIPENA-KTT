import { describe, expect, it } from "vitest";
import { canonicalizeUrl, hashUrl, normalizeAndHashUrl } from "@/lib/url-hash";

describe("URL Canonicalization & SHA-256 Deduplication", () => {
  it("strips tracking query parameters, hash fragments, and trailing slashes", () => {
    const raw =
      "https://korankaltara.com/ekonomi-tana-tidung-2025/?utm_source=facebook&fbclid=abc123&id=42#comment-1";
    const canonical = canonicalizeUrl(raw);
    expect(canonical).toBe("https://korankaltara.com/ekonomi-tana-tidung-2025?id=42");
  });

  it("produces identical SHA-256 hashes for semantically identical URLs with reordered params", () => {
    const u1 = "https://benuanta.co.id/artikel/?b=2&a=1&utm_medium=social";
    const u2 = "https://benuanta.co.id/artikel?a=1&b=2&gclid=xyz";

    const h1 = normalizeAndHashUrl(u1);
    const h2 = normalizeAndHashUrl(u2);

    expect(h1.canonicalUrl).toBe(h2.canonicalUrl);
    expect(h1.urlHash).toBe(h2.urlHash);
    expect(h1.urlHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("keeps root slash untouched while stripping trailing slash on subpaths", () => {
    expect(canonicalizeUrl("https://kaltara.antaranews.com/")).toBe(
      "https://kaltara.antaranews.com/"
    );
    expect(hashUrl("https://kaltara.antaranews.com/berita")).toHaveLength(64);
  });
});

