// server/services/scraper/national.ts
import { load } from 'cheerio';
import { eq } from 'drizzle-orm';
import { ArticleSourceTypeEnum } from '../../../shared/enums/pdrb';
import { db } from '../../db';
import type { ScraperPortalErrorEntry } from '../../db/schema';
import { nationalKeywords } from '../../db/schema';
import { DEFAULT_SCRAPER_CONCURRENCY, runWithConcurrency } from '../../utils/concurrency';
import {
  DEFAULT_BROWSER_HEADERS,
  DEFAULT_BROWSER_USER_AGENT,
  DEFAULT_FETCH_TIMEOUT_MS,
  safeFetchText,
  type SafeFetchOptions,
} from '../../utils/ssrf';
import { extractHostnameLabel, hashNormalizedUrl, isSafeHttpUrl } from '../../utils/url-hash';
import { countWords, parseIndonesianDateTime } from './extractor';
import {
  getWitaLookbackCutoff,
  isWithinLookbackWindow,
  type DiscoveredArticleCandidate,
} from './portals';

export const DEFAULT_NATIONAL_MAX_ITEMS_PER_KEYWORD = 6;

export interface ActiveKeywordTarget {
  id: string;
  keyword: string;
}

export function buildGoogleNewsRssUrl(keyword: string): string {
  const cleaned = keyword.trim().replace(/\s+/g, ' ');
  const params = new URLSearchParams({
    q: `${cleaned} when:2d`,
    hl: 'id',
    gl: 'ID',
    ceid: 'ID:id',
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

function stripHtmlAndDecode(rawHtml: string): string {
  if (!rawHtml) return '';
  const $ = load(`<div>${rawHtml}</div>`);
  return $('div').text().replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanGoogleNewsTitle(rawTitle: string): string {
  const cleaned = rawTitle.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  // Format Google News umumnya "Judul Artikel - Nama Media"; pertahankan judul inti jika suffix singkat
  const idx = cleaned.lastIndexOf(' - ');
  if (idx > 25 && cleaned.length - idx <= 45) {
    return cleaned.slice(0, idx).trim();
  }
  return cleaned;
}

function isGoogleOwnedUrl(rawUrl: string): boolean {
  try {
    const hostname = new URL(rawUrl).hostname.toLowerCase();
    return (
      hostname === 'news.google.com' ||
      hostname === 'google.com' ||
      hostname.endsWith('.google.com')
    );
  } catch {
    return true;
  }
}

/**
 * Mencoba mengekstrak URL tujuan eksternal apabila Google News mengembalikan halaman perantara HTML.
 */
export function extractRedirectTargetFromGoogleHtml(html: string): string | null {
  const $ = load(html);

  const canonical = $('link[rel="canonical"]').attr('href')?.trim();
  if (canonical && isSafeHttpUrl(canonical) && !isGoogleOwnedUrl(canonical)) {
    return canonical;
  }

  const ogUrl = $('meta[property="og:url"]').attr('content')?.trim();
  if (ogUrl && isSafeHttpUrl(ogUrl) && !isGoogleOwnedUrl(ogUrl)) {
    return ogUrl;
  }

  let externalHref: string | null = null;
  $('a[href]').each((_idx, el) => {
    if (externalHref) return;
    const href = $(el).attr('href')?.trim();
    if (href && isSafeHttpUrl(href) && !isGoogleOwnedUrl(href)) {
      externalHref = href;
    }
  });

  return externalHref;
}

/**
 * Mem-parsing XML RSS Google News Indonesia via Cheerio XML mode (`xmlMode: true`).
 */
export function parseGoogleNewsRss(
  xml: string,
  keywordTarget: ActiveKeywordTarget,
  options?: { now?: Date; lookbackDays?: number; maxItems?: number },
): DiscoveredArticleCandidate[] {
  const now = options?.now ?? new Date();
  const cutoff = getWitaLookbackCutoff(now, options?.lookbackDays ?? 3);
  const maxItems = options?.maxItems ?? 10;

  const $ = load(xml, { xmlMode: true });
  const candidates: DiscoveredArticleCandidate[] = [];
  const seenHashes = new Set<string>();

  $('item').each((_idx, el) => {
    if (candidates.length >= maxItems) return;

    const item = $(el);
    const rawLink = item.find('link').first().text().trim();
    const rawTitle = item.find('title').first().text().trim();
    const rawPubDate = item.find('pubDate').first().text().trim();
    const rawSourceUrl = item.find('source').attr('url')?.trim() ?? '';
    const rawSourceName = item.find('source').first().text().trim();
    const rawDescription = item.find('description').first().text().trim();

    if (!isSafeHttpUrl(rawLink)) return;

    const title = cleanGoogleNewsTitle(rawTitle);
    if (title.length < 15) return;

    const publishedHint = parseIndonesianDateTime(rawPubDate, now);
    if (!isWithinLookbackWindow(publishedHint, cutoff)) return;

    const { normalizedUrl, urlHash } = hashNormalizedUrl(rawLink);
    if (seenHashes.has(urlHash)) return;
    seenHashes.add(urlHash);

    const sourcePortal = isSafeHttpUrl(rawSourceUrl)
      ? extractHostnameLabel(rawSourceUrl)
      : rawSourceName || extractHostnameLabel(normalizedUrl);

    const plainDesc = stripHtmlAndDecode(rawDescription);
    const fallbackDescription = countWords(plainDesc) >= 15 ? plainDesc : null;

    candidates.push({
      url: normalizedUrl,
      normalizedUrl,
      urlHash,
      title,
      sourcePortal,
      sourceType: ArticleSourceTypeEnum.NATIONAL,
      publishedHint,
      keywordId: keywordTarget.id,
      matchedKeyword: keywordTarget.keyword,
      fallbackDescription,
    });
  });

  return candidates;
}

export interface HarvestNationalResult {
  candidates: DiscoveredArticleCandidate[];
  keywordsChecked: number;
  errors: ScraperPortalErrorEntry[];
}

export interface NationalHarvestOptions {
  keywords?: ReadonlyArray<ActiveKeywordTarget>;
  fetchFn?: (url: string, options?: SafeFetchOptions) => Promise<{ finalUrl: string; body: string }>;
  now?: Date;
  lookbackDays?: number;
  maxItemsPerKeyword?: number;
  timeoutMs?: number;
  concurrency?: number;
  signal?: AbortSignal;
}

/**
 * Mengambil kandidat berita nasional secara paralel melalui RSS Google News Indonesia untuk seluruh
 * keyword nasional aktif di tabel `national_keywords`.
 */
export async function harvestNationalKeywords(
  options: NationalHarvestOptions = {},
): Promise<HarvestNationalResult> {
  const fetchFn = options.fetchFn ?? safeFetchText;
  const now = options.now ?? new Date();
  const lookbackDays = options.lookbackDays ?? 3;
  const maxItemsPerKeyword =
    options.maxItemsPerKeyword ?? DEFAULT_NATIONAL_MAX_ITEMS_PER_KEYWORD;
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const concurrency = options.concurrency ?? DEFAULT_SCRAPER_CONCURRENCY;
  const signal = options.signal;

  const keywords: ReadonlyArray<ActiveKeywordTarget> =
    options.keywords ??
    (await db
      .select({
        id: nationalKeywords.id,
        keyword: nationalKeywords.keyword,
      })
      .from(nationalKeywords)
      .where(eq(nationalKeywords.isActive, true)));

  const candidates: DiscoveredArticleCandidate[] = [];
  const errors: ScraperPortalErrorEntry[] = [];
  const seenHashes = new Set<string>();
  let keywordsChecked = 0;

  await runWithConcurrency(
    keywords,
    concurrency,
    async (kw) => {
      if (signal?.aborted) return;
      keywordsChecked += 1;
      const rssUrl = buildGoogleNewsRssUrl(kw.keyword);

      try {
        const response = await fetchFn(rssUrl, {
          timeoutMs,
          maxBytes: 1024 * 1024,
          accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5',
          userAgent: DEFAULT_BROWSER_USER_AGENT,
          headers: DEFAULT_BROWSER_HEADERS,
          signal,
        });

        const items = parseGoogleNewsRss(response.body, kw, {
          now,
          lookbackDays,
          maxItems: maxItemsPerKeyword,
        });

        for (const item of items) {
          if (!seenHashes.has(item.urlHash)) {
            seenHashes.add(item.urlHash);
            candidates.push(item);
          }
        }
      } catch (err) {
        errors.push({
          source: `keyword:${kw.keyword}`,
          stage: 'HARVEST',
          message: err instanceof Error ? err.message : String(err),
          url: rssUrl,
        });
      }
    },
    signal,
  );

  return {
    candidates,
    keywordsChecked,
    errors,
  };
}
