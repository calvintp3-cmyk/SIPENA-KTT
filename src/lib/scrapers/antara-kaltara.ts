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

const ANTARA_KALTARA_FEEDS = [
  "https://kaltara.antaranews.com/rss/terkini.xml",
  "https://kaltara.antaranews.com/rss/ekonomi-bisnis.xml",
];

const ANTARA_SEARCH_PAGE = "https://kaltara.antaranews.com/tana-tidung";

export const antaraKaltaraScraper: ScraperSourceModule = {
  source: "antara_kaltara",
  label: "Antara Kaltara",

  async discoverLinks(limit: number): Promise<DiscoveredArticleLink[]> {
    const collected = new Map<string, DiscoveredArticleLink>();

    for (const feedUrl of ANTARA_KALTARA_FEEDS) {
      if (collected.size >= limit) break;
      try {
        const xml = await fetchWithTimeout(feedUrl, {
          accept: "application/rss+xml, application/xml, text/xml",
        });
        for (const item of parseRssFeed(xml)) {
          if (!collected.has(item.url)) {
            collected.set(item.url, item);
          }
          if (collected.size >= limit) break;
        }
      } catch {
        // Fallback to category HTML page below
      }
    }

    if (collected.size < 3) {
      try {
        const html = await fetchWithTimeout(ANTARA_SEARCH_PAGE);
        const $ = cheerio.load(html);
        $("article a[href], h3 a[href], h2 a[href]").each((_, el) => {
          const href = $(el).attr("href");
          const title = $(el).text().replace(/\s+/g, " ").trim();
          if (!href || title.length < 15) return;
          const abs = resolveAbsoluteUrl(href, "https://kaltara.antaranews.com");
          if (
            abs &&
            abs.includes("kaltara.antaranews.com/berita/") &&
            !collected.has(abs)
          ) {
            collected.set(abs, { url: abs, title });
          }
        });
      } catch {
        // Return whatever was gathered
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
          source: "antara_kaltara",
          publishedDate: link.publishedDate ?? new Date(),
          author: link.author ?? "Antara Kaltara",
          content: preText,
        };
      }
    }

    const html = await fetchWithTimeout(link.url);
    const parsed = extractArticleTextFromDom(html, [
      ".post-content",
      ".wrap__article-detail-content",
      "article",
    ]);

    const title = parsed.title || link.title || "";
    if (!title || parsed.content.length < 120) return null;
    if (!matchesRegionalEconomicOrKttFilter(title, parsed.content)) return null;

    return {
      url: link.url,
      title,
      source: "antara_kaltara",
      publishedDate: parsed.publishedDate ?? link.publishedDate ?? new Date(),
      author: parsed.author ?? link.author ?? "Antara Kaltara",
      content: parsed.content,
    };
  },
};

