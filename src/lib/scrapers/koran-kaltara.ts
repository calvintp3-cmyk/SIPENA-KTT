import * as cheerio from "cheerio";
import {
  cleanHtmlToPlainText,
  extractArticleTextFromDom,
  fetchWithTimeout,
  matchesRegionalEconomicOrKttFilter,
  parseRssFeed,
  resolveAbsoluteUrl,
  type DiscoveredArticleLink,
  type ScrapedArticleRecord,
  type ScraperSourceModule,
} from "./base-scraper";

const KORAN_KALTARA_FEEDS = [
  "https://korankaltara.com/category/daerah/tana-tidung/feed/",
  "https://korankaltara.com/category/ekonomi-bisnis/feed/",
  "https://korankaltara.com/feed/",
];

const SEARCH_FALLBACK_URL = "https://korankaltara.com/?s=tana+tidung";

export const koranKaltaraScraper: ScraperSourceModule = {
  source: "koran_kaltara",
  label: "Koran Kaltara",

  async discoverLinks(limit: number): Promise<DiscoveredArticleLink[]> {
    const collected = new Map<string, DiscoveredArticleLink>();

    for (const feedUrl of KORAN_KALTARA_FEEDS) {
      if (collected.size >= limit) break;
      try {
        const xml = await fetchWithTimeout(feedUrl, {
          accept: "application/rss+xml, application/xml, text/xml",
        });
        const items = parseRssFeed(xml);
        for (const item of items) {
          if (!collected.has(item.url)) {
            collected.set(item.url, item);
          }
          if (collected.size >= limit) break;
        }
      } catch {
        // Fallback to next feed or HTML search
      }
    }

    if (collected.size < 3) {
      try {
        const html = await fetchWithTimeout(SEARCH_FALLBACK_URL);
        const $ = cheerio.load(html);
        $("article a[href], h2 a[href], h3 a[href]").each((_, el) => {
          const href = $(el).attr("href");
          const title = $(el).text().trim();
          if (!href || title.length < 15) return;
          const abs = resolveAbsoluteUrl(href, "https://korankaltara.com");
          if (
            abs &&
            abs.startsWith("https://korankaltara.com/") &&
            !abs.includes("/category/") &&
            !abs.includes("/tag/") &&
            !collected.has(abs)
          ) {
            collected.set(abs, { url: abs, title });
          }
        });
      } catch {
        // Return whatever was collected
      }
    }

    return Array.from(collected.values()).slice(0, limit);
  },

  async extractArticle(
    link: DiscoveredArticleLink
  ): Promise<ScrapedArticleRecord | null> {
    if (link.preExtractedHtmlContent) {
      const preText = cleanHtmlToPlainText(link.preExtractedHtmlContent);
      if (preText.length >= 250 && link.title) {
        if (!matchesRegionalEconomicOrKttFilter(link.title, preText)) {
          return null;
        }
        return {
          url: link.url,
          title: link.title,
          source: "koran_kaltara",
          publishedDate: link.publishedDate ?? new Date(),
          author: link.author ?? "Redaksi Koran Kaltara",
          content: preText,
        };
      }
    }

    const html = await fetchWithTimeout(link.url);
    const parsed = extractArticleTextFromDom(html, [
      ".td-post-content",
      ".entry-content",
      ".post-content",
      "article",
    ]);

    const title = parsed.title || link.title || "";
    if (!title || parsed.content.length < 120) return null;
    if (!matchesRegionalEconomicOrKttFilter(title, parsed.content)) return null;

    return {
      url: link.url,
      title,
      source: "koran_kaltara",
      publishedDate: parsed.publishedDate ?? link.publishedDate ?? new Date(),
      author: parsed.author ?? link.author ?? "Redaksi Koran Kaltara",
      content: parsed.content,
    };
  },
};

