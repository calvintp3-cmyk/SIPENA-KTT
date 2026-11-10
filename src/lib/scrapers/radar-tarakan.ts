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

const RADAR_TARAKAN_SECTIONS = [
  "https://radartarakan.jawapos.com/tana-tidung",
  "https://radartarakan.jawapos.com/ekonomi-bisnis",
  "https://radartarakan.jawapos.com/kaltara",
];

export const radarTarakanScraper: ScraperSourceModule = {
  source: "radar_tarakan",
  label: "Radar Tarakan",

  async discoverLinks(limit: number): Promise<DiscoveredArticleLink[]> {
    const collected = new Map<string, DiscoveredArticleLink>();

    for (const sectionUrl of RADAR_TARAKAN_SECTIONS) {
      if (collected.size >= limit) break;
      try {
        const html = await fetchWithTimeout(sectionUrl);
        const $ = cheerio.load(html);
        $(
          "a.latest__link[href], a.article__link[href], h2 a[href], h3 a[href], article a[href]"
        ).each((_, el) => {
          const href = $(el).attr("href");
          const title = $(el).text().replace(/\s+/g, " ").trim();
          if (!href || title.length < 15) return;
          const abs = resolveAbsoluteUrl(href, "https://radartarakan.jawapos.com");
          if (
            abs &&
            abs.includes("radartarakan.jawapos.com/") &&
            /\/\d{4}\//.test(abs) &&
            !collected.has(abs)
          ) {
            collected.set(abs, { url: abs, title });
          }
        });
      } catch {
        // Ignore single section error and try next section/RSS
      }
    }

    if (collected.size === 0) {
      try {
        const rssXml = await fetchWithTimeout(
          "https://radartarakan.jawapos.com/rss",
          { accept: "application/rss+xml, application/xml, text/xml" }
        );
        for (const item of parseRssFeed(rssXml)) {
          if (!collected.has(item.url)) {
            collected.set(item.url, item);
          }
          if (collected.size >= limit) break;
        }
      } catch {
        // Ignore fallback failure
      }
    }

    return Array.from(collected.values()).slice(0, limit);
  },

  async extractArticle(
    link: DiscoveredArticleLink
  ): Promise<ScrapedArticleRecord | null> {
    const html = await fetchWithTimeout(link.url);
    const parsed = extractArticleTextFromDom(html, [
      ".read__content",
      ".article__content",
      ".read-article",
      "article",
    ]);

    const title = parsed.title || link.title || "";
    if (!title || parsed.content.length < 120) return null;
    if (!matchesRegionalEconomicOrKttFilter(title, parsed.content)) return null;

    return {
      url: link.url,
      title,
      source: "radar_tarakan",
      publishedDate: parsed.publishedDate ?? link.publishedDate ?? new Date(),
      author: parsed.author ?? link.author ?? "Redaksi Radar Tarakan",
      content: parsed.content,
    };
  },
};

