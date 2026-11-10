import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { articles } from "@/db/schema";
import { normalizeAndHashUrl } from "@/lib/url-hash";
import { koranKaltaraScraper } from "./koran-kaltara";
import { radarTarakanScraper } from "./radar-tarakan";
import { tribunKaltaraScraper } from "./tribun-kaltara";
import { benuantaScraper } from "./benuanta";
import { antaraKaltaraScraper } from "./antara-kaltara";
import { nationalMediaScraper } from "./national-media";
import {
  sleepJitter,
  type MediaSource,
  type ScraperSourceModule,
} from "./base-scraper";

const ALL_SCRAPERS: Record<MediaSource, ScraperSourceModule> = {
  koran_kaltara: koranKaltaraScraper,
  radar_tarakan: radarTarakanScraper,
  tribun_kaltara: tribunKaltaraScraper,
  benuanta: benuantaScraper,
  antara_kaltara: antaraKaltaraScraper,
  national_media: nationalMediaScraper,
};

export interface IngestionRunOptions {
  sources?: MediaSource[];
  maxArticlesPerSource?: number;
}

export interface IngestionRunSummary {
  scanned_urls: number;
  skipped_duplicates: number;
  inserted_articles: number;
  filtered_irrelevant: number;
  errors: number;
  by_source: Record<
    string,
    {
      discovered: number;
      inserted: number;
      skipped_duplicates: number;
      error?: string;
    }
  >;
}

export async function runIngestionPipeline(
  options: IngestionRunOptions = {}
): Promise<IngestionRunSummary> {
  const targetSources: MediaSource[] =
    options.sources && options.sources.length > 0
      ? options.sources
      : [
          "koran_kaltara",
          "radar_tarakan",
          "tribun_kaltara",
          "benuanta",
          "antara_kaltara",
          "national_media",
        ];

  const maxPerSource = Math.min(50, Math.max(1, options.maxArticlesPerSource ?? 15));

  const summary: IngestionRunSummary = {
    scanned_urls: 0,
    skipped_duplicates: 0,
    inserted_articles: 0,
    filtered_irrelevant: 0,
    errors: 0,
    by_source: {},
  };

  for (const sourceKey of targetSources) {
    const scraper = ALL_SCRAPERS[sourceKey];
    if (!scraper) continue;

    const sourceMetrics = {
      discovered: 0,
      inserted: 0,
      skipped_duplicates: 0,
    };

    try {
      const discovered = await scraper.discoverLinks(maxPerSource);
      sourceMetrics.discovered = discovered.length;
      summary.scanned_urls += discovered.length;

      if (discovered.length === 0) {
        summary.by_source[sourceKey] = sourceMetrics;
        continue;
      }

      // Compute canonical hashes and perform single bulk DB lookup before scraping bodies
      const withHashes = discovered.map((item) => {
        const { canonicalUrl, urlHash } = normalizeAndHashUrl(item.url);
        return {
          ...item,
          url: canonicalUrl,
          urlHash,
        };
      });

      const hashes = withHashes.map((h) => h.urlHash);
      const existingRows = await db
        .select({ urlHash: articles.urlHash })
        .from(articles)
        .where(inArray(articles.urlHash, hashes));

      const existingSet = new Set(existingRows.map((r) => r.urlHash));

      const unseen = withHashes.filter((item) => !existingSet.has(item.urlHash));
      const duplicatesCount = withHashes.length - unseen.length;
      sourceMetrics.skipped_duplicates = duplicatesCount;
      summary.skipped_duplicates += duplicatesCount;

      const batchToInsert: Array<typeof articles.$inferInsert> = [];

      for (const link of unseen) {
        try {
          await sleepJitter(350, 750);
          const extracted = await scraper.extractArticle(link);
          if (!extracted) {
            summary.filtered_irrelevant += 1;
            continue;
          }

          const { canonicalUrl, urlHash } = normalizeAndHashUrl(extracted.url);
          batchToInsert.push({
            url: canonicalUrl,
            urlHash,
            title: extracted.title.slice(0, 500),
            source: extracted.source,
            publishedDate: extracted.publishedDate,
            author: extracted.author ? extracted.author.slice(0, 255) : null,
            content: extracted.content,
            isScraped: true,
            isProcessed: false,
          });
        } catch (err) {
          summary.errors += 1;
          console.error(
            `[Scraper:${sourceKey}] Gagal mengekstrak URL ${link.url}:`,
            err instanceof Error ? err.message : err
          );
        }
      }

      if (batchToInsert.length > 0) {
        const insertedRows = await db
          .insert(articles)
          .values(batchToInsert)
          .onConflictDoNothing({ target: articles.urlHash })
          .returning({ id: articles.id });

        sourceMetrics.inserted = insertedRows.length;
        summary.inserted_articles += insertedRows.length;
      }

      summary.by_source[sourceKey] = sourceMetrics;
    } catch (err) {
      summary.errors += 1;
      const errMsg = err instanceof Error ? err.message : "Unknown source error";
      console.error(`[Scraper:${sourceKey}] Source pipeline failure:`, errMsg);
      summary.by_source[sourceKey] = {
        ...sourceMetrics,
        error: errMsg,
      };
    }
  }

  return summary;
}

