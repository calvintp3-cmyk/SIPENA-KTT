import * as cheerio from "cheerio";

export type MediaSource =
  | "koran_kaltara"
  | "radar_tarakan"
  | "tribun_kaltara"
  | "benuanta"
  | "fokus_borneo"
  | "antara_kaltara"
  | "national_media";

export interface DiscoveredArticleLink {
  url: string;
  title?: string;
  publishedDate?: Date;
  author?: string | null;
  preExtractedHtmlContent?: string;
}

export interface ScrapedArticleRecord {
  url: string;
  title: string;
  source: MediaSource;
  publishedDate: Date;
  author: string | null;
  content: string;
}

export interface ScraperSourceModule {
  source: MediaSource;
  label: string;
  discoverLinks: (limit: number) => Promise<DiscoveredArticleLink[]>;
  extractArticle: (link: DiscoveredArticleLink) => Promise<ScrapedArticleRecord | null>;
}

export const CRAWLER_USER_AGENT =
  "SIPENA-KTT-Bot/1.0 (+https://ktt.bps.go.id/sipena; bps6504@bps.go.id)";

const KTT_GEO_KEYWORDS = [
  "tana tidung",
  "tideng pale",
  "sesayap",
  "sesayap hilir",
  "betayau",
  "muruk rian",
  "tana lia",
  "sebawang",
  "sedulun",
];

const ECONOMIC_KEYWORDS = [
  "ekonomi",
  "inflasi",
  "deflasi",
  "sawit",
  "tbs",
  "cpo",
  "batubara",
  "tambang",
  "apbd",
  "anggaran",
  "belanja",
  "pembangunan",
  "infrastruktur",
  "jalan",
  "jembatan",
  "pelabuhan",
  "feri",
  "ferry",
  "speedboat",
  "angkutan",
  "pupuk",
  "gabah",
  "beras",
  "panen",
  "padi",
  "udang",
  "bandeng",
  "tambak",
  "pdrb",
  "investasi",
  "semen",
  "umkm",
  "koperasi",
  "tarif",
  "listrik",
  "pln",
  "fiber optik",
  "harga",
  "pasar",
  "ekspor",
  "kayu",
  "proyek",
  "thr",
  "bansos",
  "rsud",
  "kaltara",
];

export function matchesKttGeography(text: string): boolean {
  const normalized = text.toLowerCase();
  if (KTT_GEO_KEYWORDS.some((kw) => normalized.includes(kw))) {
    return true;
  }
  // Strict word boundary check for "KTT" abbreviation
  return /\bktt\b/i.test(text);
}

export function matchesNationalBooleanFilter(title: string, body: string): boolean {
  const combined = `${title}\n${body}`.toLowerCase();
  const hasGeo = matchesKttGeography(combined);
  if (!hasGeo) return false;
  return ECONOMIC_KEYWORDS.some((kw) => combined.includes(kw));
}

export function matchesRegionalEconomicOrKttFilter(title: string, body: string): boolean {
  const combined = `${title}\n${body}`.toLowerCase();
  return matchesKttGeography(combined) || ECONOMIC_KEYWORDS.some((kw) => combined.includes(kw));
}

export async function sleepJitter(minMs = 450, maxMs = 950): Promise<void> {
  const delay = Math.floor(minMs + Math.random() * (maxMs - minMs));
  await new Promise((resolve) => setTimeout(resolve, delay));
}

const ALLOWED_SCRAPER_DOMAINS = [
  "korankaltara.com",
  "jawapos.com",
  "tribunnews.com",
  "benuanta.co.id",
  "antaranews.com",
  "detik.com",
] as const;

const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

export function isAllowedScraperUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return false;
    }
    if (parsed.username || parsed.password) {
      return false;
    }
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
      host.includes(":")
    ) {
      return false;
    }
    return ALLOWED_SCRAPER_DOMAINS.some(
      (domain) => host === domain || host.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

async function readLimitedText(response: Response, maxBytes: number): Promise<string> {
  const declaredLen = response.headers.get("content-length");
  if (declaredLen && Number(declaredLen) > maxBytes) {
    throw new Error("Response exceeds maximum allowed scraper size.");
  }
  const reader = response.body?.getReader();
  if (!reader) {
    const text = await response.text();
    return text.slice(0, maxBytes);
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => null);
        throw new Error("Response exceeds maximum allowed scraper size.");
      }
      chunks.push(value);
    }
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    merged.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: false }).decode(merged);
}

export async function fetchWithTimeout(
  url: string,
  options: { timeoutMs?: number; retries?: number; accept?: string } = {}
): Promise<string> {
  const timeoutMs = options.timeoutMs ?? 15000;
  const maxRetries = options.retries ?? 2;

  if (!isAllowedScraperUrl(url)) {
    throw new Error(`SSRF Guard: Host not allowlisted for scraper (${url})`);
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      let currentUrl = url;
      let response: Response | null = null;

      for (let hop = 0; hop < 4; hop++) {
        if (!isAllowedScraperUrl(currentUrl)) {
          throw new Error(`SSRF Guard: Redirect host not allowlisted (${currentUrl})`);
        }
        const res = await fetch(currentUrl, {
          method: "GET",
          redirect: "manual",
          signal: controller.signal,
          headers: {
            "User-Agent": CRAWLER_USER_AGENT,
            Accept:
              options.accept ??
              "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          },
        });

        if (res.status >= 300 && res.status < 400) {
          const location = res.headers.get("location");
          if (!location) {
            throw new Error(`HTTP ${res.status} redirect without Location header`);
          }
          currentUrl = new URL(location, currentUrl).toString();
          continue;
        }

        response = res;
        break;
      }

      if (!response) {
        throw new Error(`Too many redirects fetching ${url}`);
      }

      if (!response.ok) {
        if (response.status >= 500 && attempt < maxRetries) {
          throw new Error(`HTTP ${response.status}`);
        }
        throw new Error(`HTTP ${response.status} fetching ${url}`);
      }

      return await readLimitedText(response, MAX_RESPONSE_BYTES);
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await sleepJitter(600 * (attempt + 1), 1200 * (attempt + 1));
        continue;
      }
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(`Failed fetching ${url}`);
}

export function cleanHtmlToPlainText(html: string): string {
  const $ = cheerio.load(html);

  // Strip scripts, styles, ads, related-link noise
  $(
    "script, style, noscript, iframe, svg, aside, nav, header, footer, .ads, .advertisement, .baca-juga, .bacajuga, .related-posts, .share-buttons, .social-share, .tags"
  ).remove();

  const paragraphs: string[] = [];
  $("p").each((_, el) => {
    const text = $(el).text().replace(/\s+/g, " ").trim();
    if (
      text.length >= 25 &&
      !/^(baca juga|simak juga|lihat juga|editor:|pewarta:)/i.test(text)
    ) {
      paragraphs.push(text);
    }
  });

  if (paragraphs.length > 0) {
    return paragraphs.join("\n\n").slice(0, 12000);
  }

  return $.text().replace(/\s+/g, " ").trim().slice(0, 12000);
}

export function extractArticleTextFromDom(
  html: string,
  contentSelectors: string[]
): { title: string; content: string; author: string | null; publishedDate: Date | null } {
  const $ = cheerio.load(html);

  const ogTitle =
    $('meta[property="og:title"]').attr("content")?.trim() ||
    $("h1").first().text().trim() ||
    $("title").text().trim();

  const author =
    $('meta[name="author"]').attr("content")?.trim() ||
    $('[rel="author"], .author-name, .read__credit').first().text().trim() ||
    null;

  const dateStr =
    $('meta[property="article:published_time"]').attr("content") ||
    $("time[datetime]").first().attr("datetime") ||
    $('meta[name="publishdate"]').attr("content") ||
    null;

  const publishedDate = dateStr ? safeParseDate(dateStr) : null;

  let extractedContent = "";
  for (const selector of contentSelectors) {
    const container = $(selector).first();
    if (container.length > 0) {
      const cleaned = cleanHtmlToPlainText(container.html() ?? "");
      if (cleaned.length >= 120) {
        extractedContent = cleaned;
        break;
      }
    }
  }

  if (!extractedContent) {
    extractedContent = cleanHtmlToPlainText($("article").first().html() ?? html);
  }

  return {
    title: ogTitle.replace(/\s+/g, " ").trim(),
    content: extractedContent,
    author: author ? author.slice(0, 200) : null,
    publishedDate,
  };
}

export function parseRssFeed(xml: string): DiscoveredArticleLink[] {
  const $ = cheerio.load(xml, { xmlMode: true });
  const results: DiscoveredArticleLink[] = [];
  const seen = new Set<string>();

  $("item, entry").each((_, node) => {
    const item = $(node);
    const link =
      item.find("link").first().text().trim() ||
      item.find("link").first().attr("href")?.trim() ||
      "";
    if (!link || seen.has(link)) return;
    seen.add(link);

    const title = item.find("title").first().text().replace(/\s+/g, " ").trim();
    const pubDateRaw =
      item.find("pubDate").first().text().trim() ||
      item.find("published").first().text().trim() ||
      item.find("dc\\:date").first().text().trim();
    const author =
      item.find("dc\\:creator").first().text().trim() ||
      item.find("author").first().text().trim() ||
      null;
    const encodedHtml =
      item.find("content\\:encoded").first().text().trim() ||
      item.find("description").first().text().trim() ||
      undefined;

    results.push({
      url: link,
      title,
      publishedDate: pubDateRaw ? safeParseDate(pubDateRaw) : new Date(),
      author,
      preExtractedHtmlContent: encodedHtml,
    });
  });

  return results;
}

export function safeParseDate(raw: string): Date {
  const parsed = new Date(raw.trim());
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }
  return new Date();
}

export function resolveAbsoluteUrl(href: string, baseUrl: string): string | null {
  try {
    const u = new URL(href, baseUrl);
    if (u.protocol !== "http:" && u.protocol !== "https:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

