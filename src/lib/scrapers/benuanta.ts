import {
  cleanHtmlToPlainText,
  extractArticleTextFromDom,
  fetchWithTimeout,
  matchesRegionalEconomicOrKttFilter,
  parseRssFeed,
  safeParseDate,
  type DiscoveredArticleLink,
  type ScrapedArticleRecord,
  type ScraperSourceModule,
} from "./base-scraper";

interface WordPressPost {
  link: string;
  date_gmt?: string;
  date?: string;
  title?: { rendered?: string };
  content?: { rendered?: string };
}

const BENUANTA_WP_ENDPOINTS = [
  "https://benuanta.co.id/wp-json/wp/v2/posts?search=tana+tidung&per_page=15",
  "https://benuanta.co.id/wp-json/wp/v2/posts?search=ekonomi&per_page=15",
];

const BENUANTA_RSS_FALLBACK = "https://benuanta.co.id/feed/";

function decodeHtmlEntitiesMinimal(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const benuantaScraper: ScraperSourceModule = {
  source: "benuanta",
  label: "Benuanta",

  async discoverLinks(limit: number): Promise<DiscoveredArticleLink[]> {
    const collected = new Map<string, DiscoveredArticleLink>();

    for (const apiUrl of BENUANTA_WP_ENDPOINTS) {
      if (collected.size >= limit) break;
      try {
        const jsonRaw = await fetchWithTimeout(apiUrl, {
          accept: "application/json",
        });
        const posts = JSON.parse(jsonRaw) as WordPressPost[];
        if (!Array.isArray(posts)) continue;

        for (const post of posts) {
          if (!post.link || collected.has(post.link)) continue;
          const title = post.title?.rendered
            ? decodeHtmlEntitiesMinimal(post.title.rendered)
            : undefined;
          collected.set(post.link, {
            url: post.link,
            title,
            publishedDate: safeParseDate(post.date_gmt ?? post.date ?? ""),
            author: "Tim Benuanta",
            preExtractedHtmlContent: post.content?.rendered,
          });
          if (collected.size >= limit) break;
        }
      } catch {
        // Fallback to RSS feed below
      }
    }

    if (collected.size === 0) {
      try {
        const xml = await fetchWithTimeout(BENUANTA_RSS_FALLBACK, {
          accept: "application/rss+xml, application/xml, text/xml",
        });
        for (const item of parseRssFeed(xml)) {
          if (!collected.has(item.url)) collected.set(item.url, item);
          if (collected.size >= limit) break;
        }
      } catch {
        // No links found
      }
    }

    return Array.from(collected.values()).slice(0, limit);
  },

  async extractArticle(
    link: DiscoveredArticleLink
  ): Promise<ScrapedArticleRecord | null> {
    if (link.preExtractedHtmlContent) {
      const content = cleanHtmlToPlainText(link.preExtractedHtmlContent);
      const title = link.title ?? "";
      if (title && content.length >= 120) {
        if (!matchesRegionalEconomicOrKttFilter(title, content)) return null;
        return {
          url: link.url,
          title,
          source: "benuanta",
          publishedDate: link.publishedDate ?? new Date(),
          author: link.author ?? "Tim Benuanta",
          content,
        };
      }
    }

    const html = await fetchWithTimeout(link.url);
    const parsed = extractArticleTextFromDom(html, [
      ".entry-content",
      ".td-post-content",
      ".post-content",
      "article",
    ]);

    const title = parsed.title || link.title || "";
    if (!title || parsed.content.length < 120) return null;
    if (!matchesRegionalEconomicOrKttFilter(title, parsed.content)) return null;

    return {
      url: link.url,
      title,
      source: "benuanta",
      publishedDate: parsed.publishedDate ?? link.publishedDate ?? new Date(),
      author: parsed.author ?? link.author ?? "Tim Benuanta",
      content: parsed.content,
    };
  },
};

