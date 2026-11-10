import * as cheerio from "cheerio";
import {
  extractArticleTextFromDom,
  fetchWithTimeout,
  matchesRegionalEconomicOrKttFilter,
  parseRssFeed,
  resolveAbsoluteUrl,
  type DiscoveredArticleLink,
  type ScrapedArticleRecord,
  type ScraperSourceModule,
} from "./base-scraper";

const TRIBUN_KALTARA_PAGES = [
  "https://kaltara.tribunnews.com/tag/tana-tidung",
  "https://kaltara.tribunnews.com/tag/kabupaten-tana-tidung",
  "https://kaltara.tribunnews.com/bisnis",
];

export const tribunKaltaraScraper: ScraperSourceModule = {
  source: "tribun_kaltara",
  label: "Tribun Kaltara",

  async discoverLinks(limit: number): Promise<DiscoveredArticleLink[]> {
    const collected = new Map<string, DiscoveredArticleLink>();

    for (const pageUrl of TRIBUN_KALTARA_PAGES) {
      if (collected.size >= limit) break;
      try {
        const html = await fetchWithTimeout(pageUrl);
        const $ = cheerio.load(html);
        $("h3 a[href], .lsi a[href], .txt-oev-2[href], article a[href]").each(
          (_, el) => {
            const href = $(el).attr("href");
            const title = $(el).text().replace(/\s+/g, " ").trim();
            if (!href || title.length < 15) return;
            const abs = resolveAbsoluteUrl(href, "https://kaltara.tribunnews.com");
            if (
              abs &&
              abs.includes("kaltara.tribunnews.com/") &&
              /\/\d{4}\/\d{2}\/\d{2}\//.test(abs) &&
              !collected.has(abs)
            ) {
              // Preserve existing clean URL without forcing ?page=all unless needed
              collected.set(abs, { url: abs, title });
            }
          }
        );
      } catch {
        // Fallback silently to next tag page / RSS
      }
    }

    if (collected.size === 0) {
      try {
        const xml = await fetchWithTimeout("https://kaltara.tribunnews.com/rss", {
          accept: "application/rss+xml, application/xml, text/xml",
        });
        for (const item of parseRssFeed(xml)) {
          if (!collected.has(item.url)) collected.set(item.url, item);
          if (collected.size >= limit) break;
        }
      } catch {
        // Ignore RSS fallback failure
      }
    }

    return Array.from(collected.values()).slice(0, limit);
  },

  async extractArticle(
    link: DiscoveredArticleLink
  ): Promise<ScrapedArticleRecord | null> {
    const urlWithAllPages = link.url.includes("?")
      ? link.url
      : `${link.url}?page=all`;

    const html = await fetchWithTimeout(urlWithAllPages).catch(() =>
      fetchWithTimeout(link.url)
    );
    const parsed = extractArticleTextFromDom(html, [
      ".side-article.txt-article",
      ".txt-article",
      "#article_con",
      "article",
    ]);

    const title = parsed.title || link.title || "";
    if (!title || parsed.content.length < 120) return null;
    if (!matchesRegionalEconomicOrKttFilter(title, parsed.content)) return null;

    return {
      url: link.url,
      title,
      source: "tribun_kaltara",
      publishedDate: parsed.publishedDate ?? link.publishedDate ?? new Date(),
      author: parsed.author ?? link.author ?? "Redaksi Tribun Kaltara",
      content: parsed.content,
    };
  },
};

