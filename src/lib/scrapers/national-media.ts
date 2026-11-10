import {
  cleanHtmlToPlainText,
  extractArticleTextFromDom,
  fetchWithTimeout,
  matchesKttGeography,
  matchesNationalBooleanFilter,
  parseRssFeed,
  type DiscoveredArticleLink,
  type ScrapedArticleRecord,
  type ScraperSourceModule,
} from "./base-scraper";

const NATIONAL_RSS_FEEDS = [
  "https://www.antaranews.com/rss/ekonomi.xml",
  "https://www.antaranews.com/rss/terkini.xml",
  "https://finance.detik.com/rss",
];

export const nationalMediaScraper: ScraperSourceModule = {
  source: "national_media",
  label: "Media Nasional (Terfilter KTT)",

  async discoverLinks(limit: number): Promise<DiscoveredArticleLink[]> {
    const collected = new Map<string, DiscoveredArticleLink>();

    for (const feedUrl of NATIONAL_RSS_FEEDS) {
      if (collected.size >= limit) break;
      try {
        const xml = await fetchWithTimeout(feedUrl, {
          accept: "application/rss+xml, application/xml, text/xml",
        });
        const items = parseRssFeed(xml);
        for (const item of items) {
          const previewText = `${item.title ?? ""} ${
            item.preExtractedHtmlContent ?? ""
          }`;
          // Early filter on RSS metadata to avoid hammering national outlets on irrelevant articles
          if (matchesKttGeography(previewText) && !collected.has(item.url)) {
            collected.set(item.url, item);
          }
          if (collected.size >= limit) break;
        }
      } catch {
        // Skip unreachable RSS cleanly
      }
    }

    return Array.from(collected.values()).slice(0, limit);
  },

  async extractArticle(
    link: DiscoveredArticleLink
  ): Promise<ScrapedArticleRecord | null> {
    if (link.preExtractedHtmlContent) {
      const preText = cleanHtmlToPlainText(link.preExtractedHtmlContent);
      const title = link.title ?? "";
      if (preText.length >= 250 && title) {
        if (!matchesNationalBooleanFilter(title, preText)) return null;
        return {
          url: link.url,
          title,
          source: "national_media",
          publishedDate: link.publishedDate ?? new Date(),
          author: link.author ?? "Media Nasional",
          content: preText,
        };
      }
    }

    const html = await fetchWithTimeout(link.url);
    const parsed = extractArticleTextFromDom(html, [
      ".detail__body-text",
      ".post-content",
      ".read__content",
      "article",
    ]);

    const title = parsed.title || link.title || "";
    if (!title || parsed.content.length < 120) return null;
    if (!matchesNationalBooleanFilter(title, parsed.content)) return null;

    return {
      url: link.url,
      title,
      source: "national_media",
      publishedDate: parsed.publishedDate ?? link.publishedDate ?? new Date(),
      author: parsed.author ?? link.author ?? "Media Nasional",
      content: parsed.content,
    };
  },
};

