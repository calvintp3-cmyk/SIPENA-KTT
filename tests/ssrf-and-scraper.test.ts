import { describe, expect, it } from "vitest";
import {
  cleanHtmlToPlainText,
  isAllowedScraperUrl,
  matchesNationalBooleanFilter,
  parseRssFeed,
} from "@/lib/scrapers/base-scraper";

describe("Scraper SSRF Allowlist & DOM/RSS Sanitization", () => {
  it("allows trusted Kaltara and National news domains", () => {
    expect(isAllowedScraperUrl("https://korankaltara.com/category/ekonomi-bisnis/")).toBe(true);
    expect(isAllowedScraperUrl("https://radartarakan.jawapos.com/tana-tidung")).toBe(true);
    expect(isAllowedScraperUrl("https://kaltara.tribunnews.com/tag/tana-tidung")).toBe(true);
    expect(isAllowedScraperUrl("https://benuanta.co.id/wp-json/wp/v2/posts")).toBe(true);
    expect(isAllowedScraperUrl("https://fokusborneo.com/daerah/tana-tidung/test/")).toBe(true);
    expect(isAllowedScraperUrl("https://kaltara.antaranews.com/rss/terkini.xml")).toBe(true);
    expect(isAllowedScraperUrl("https://finance.detik.com/rss")).toBe(true);
  });

  it("blocks localhost, private metadata IPs, file protocols, credential URLs, and unknown hosts", () => {
    expect(isAllowedScraperUrl("http://127.0.0.1:3001/admin")).toBe(false);
    expect(isAllowedScraperUrl("http://localhost:5432/")).toBe(false);
    expect(isAllowedScraperUrl("http://169.254.169.254/latest/meta-data/")).toBe(false);
    expect(isAllowedScraperUrl("http://10.0.0.5/internal")).toBe(false);
    expect(isAllowedScraperUrl("file:///etc/passwd")).toBe(false);
    expect(isAllowedScraperUrl("https://user:pass@korankaltara.com/")).toBe(false);
    expect(isAllowedScraperUrl("https://evil-domain.example.com/feed")).toBe(false);
  });

  it("removes scripts, ads, and 'Baca Juga' blocks while keeping factual article paragraphs", () => {
    const dirtyHtml = `
      <div class="post-content">
        <script>alert('xss')</script>
        <div class="advertisement">Iklan Murah</div>
        <p>Baca juga: Berita lainnya yang tidak relevan</p>
        <p>Produksi tandan buah segar kelapa sawit di Kecamatan Sesayap meningkat 14 persen sepanjang Triwulan I 2025.</p>
        <p>Harga beli TBS di tingkat pabrik pengolahan tercatat sebesar Rp 2.650 per kilogram.</p>
      </div>
    `;
    const cleaned = cleanHtmlToPlainText(dirtyHtml);
    expect(cleaned).not.toContain("alert");
    expect(cleaned).not.toContain("Iklan Murah");
    expect(cleaned).not.toContain("Baca juga:");
    expect(cleaned).toContain("Kelapa sawit".toLowerCase().replace("kelapa sawit", "kelapa sawit"));
    expect(cleaned).toContain("Rp 2.650 per kilogram");
  });

  it("enforces strict KTT Geography AND Economic keyword Boolean filter on national media", () => {
    expect(
      matchesNationalBooleanFilter(
        "Proyek Pelabuhan Tideng Pale Dongkrak Distribusi Logistik KTT",
        "Anggaran infrastruktur pelabuhan di Kabupaten Tana Tidung mencapai Rp 45 miliar."
      )
    ).toBe(true);

    expect(
      matchesNationalBooleanFilter(
        "Bank Indonesia Catat Pertumbuhan Kredit UMKM di Jakarta",
        "Pertumbuhan kredit nasional meningkat 9 persen sepanjang kuartal pertama."
      )
    ).toBe(false);

    expect(
      matchesNationalBooleanFilter(
        "Turnamen Sepak Bola Bupati Cup Tana Tidung Resmi Dibuka",
        "Sebanyak 16 kesebelasan bertanding di lapangan Tideng Pale untuk memperebutkan piala bergilir."
      )
    ).toBe(false);
  });

  it("parses valid RSS 2.0 XML feeds cleanly without duplicating links", () => {
    const rssXml = `<?xml version="1.0" encoding="UTF-8"?>
      <rss version="2.0">
        <channel>
          <item>
            <title>Harga Beras Tideng Pale Stabil Jelang Lebaran</title>
            <link>https://korankaltara.com/harga-beras-stabil/</link>
            <pubDate>Mon, 10 Mar 2025 08:00:00 +0800</pubDate>
          </item>
          <item>
            <title>Duplikat Item</title>
            <link>https://korankaltara.com/harga-beras-stabil/</link>
          </item>
        </channel>
      </rss>`;
    const items = parseRssFeed(rssXml);
    expect(items).toHaveLength(1);
    expect(items[0]?.url).toBe("https://korankaltara.com/harga-beras-stabil/");
    expect(items[0]?.title).toContain("Harga Beras Tideng Pale");
  });
});

