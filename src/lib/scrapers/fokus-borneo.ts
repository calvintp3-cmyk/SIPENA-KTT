import * as cheerio from "cheerio";
import {
  cleanHtmlToPlainText,
  extractArticleTextFromDom,
  fetchWithTimeout,
  matchesRegionalEconomicOrKttFilter,
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

const FOKUS_BORNEO_API_ENDPOINTS = [
  "https://fokusborneo.com/wp-json/wp/v2/posts?search=tana+tidung&per_page=15",
  "https://fokusborneo.com/wp-json/wp/v2/posts?search=sesayap&per_page=15",
  "https://fokusborneo.com/wp-json/wp/v2/posts?search=ekonomi&per_page=15",
];

const FOKUS_BORNEO_CATEGORY_URL =
  "https://fokusborneo.com/category/advetorial/pemkab-tana-tidung/";

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

export const fokusBorneoScraper: ScraperSourceModule = {
  source: "fokus_borneo",
  label: "Fokus Borneo",

  async discoverLinks(limit: number): Promise<DiscoveredArticleLink[]> {
    const collected = new Map<string, DiscoveredArticleLink>();

    // 1. Coba REST API resmi WordPress
    for (const apiUrl of FOKUS_BORNEO_API_ENDPOINTS) {
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
            preExtractedHtmlContent: post.content?.rendered,
          });
          if (collected.size >= limit) break;
        }
      } catch {
        // Fallback ke kanal kategori
      }
    }

    // 2. Fallback ke halaman HTML kategori jika API kurang
    if (collected.size < 3) {
      try {
        const html = await fetchWithTimeout(FOKUS_BORNEO_CATEGORY_URL);
        const $ = cheerio.load(html);

        $("article a, h2.entry-title a, h3.entry-title a").each((_, el) => {
          if (collected.size >= limit) return false;
          const href = $(el).attr("href");
          const title = $(el).text().trim();
          if (href && href.startsWith("http") && !collected.has(href) && title) {
            collected.set(href, {
              url: href,
              title,
            });
          }
        });
      } catch {
        // Abaikan jika fallback gagal
      }
    }

    return Array.from(collected.values()).slice(0, limit);
  },

  async extractArticle(link: DiscoveredArticleLink): Promise<ScrapedArticleRecord | null> {
    if (link.preExtractedHtmlContent && link.title) {
      const preText = cleanHtmlToPlainText(link.preExtractedHtmlContent);
      if (preText.length >= 120 && matchesRegionalEconomicOrKttFilter(link.title, preText)) {
        return {
          url: link.url,
          title: link.title,
          source: "fokus_borneo",
          publishedDate: link.publishedDate ?? new Date(),
          author: link.author ?? "Redaksi Fokus Borneo",
          content: preText,
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
      source: "fokus_borneo",
      publishedDate: parsed.publishedDate ?? link.publishedDate ?? new Date(),
      author: parsed.author ?? link.author ?? "Redaksi Fokus Borneo",
      content: parsed.content,
    };
  },
};
