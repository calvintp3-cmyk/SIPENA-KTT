// server/services/scraper/national.ts
import { load } from 'cheerio';
import { eq } from 'drizzle-orm';
import {
  ArticleSourceTypeEnum,
  type ExpenditureComponentEnum,
  type KbliCategoryEnum,
} from '../../../shared/enums/pdrb';
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
  DEFAULT_LOOKBACK_DAYS,
  getWitaLookbackCutoff,
  isWithinLookbackWindow,
  type DiscoveredArticleCandidate,
} from './portals';

export const DEFAULT_NATIONAL_MAX_ITEMS_PER_KEYWORD = 6;

export interface ActiveKeywordTarget {
  id: string;
  keyword: string;
  defaultKbliCategory?: KbliCategoryEnum | null;
  defaultExpenditureComponent?: ExpenditureComponentEnum | null;
}

export function buildGoogleNewsRssUrl(keyword: string): string {
  const cleaned = keyword.trim().replace(/\s+/g, ' ');
  const params = new URLSearchParams({
    q: `${cleaned} when:7d`,
    hl: 'id',
    gl: 'ID',
    ceid: 'ID:id',
  });
  return `https://news.google.com/rss/search?${params.toString()}`;
}

export function buildBingNewsRssUrl(keyword: string): string {
  const cleaned = keyword.trim().replace(/\s+/g, ' ');
  const params = new URLSearchParams({
    q: cleaned,
    format: 'rss',
    setmkt: 'id-ID',
    setlang: 'id',
  });
  return `https://www.bing.com/news/search?${params.toString()}`;
}

/**
 * Mengekstrak URL penerbit asli langsung dari parameter `url=` pada tautan pembungkus Bing News RSS
 * (`http://www.bing.com/news/apiclick.aspx?...&url=https%3A%2F%2F...`).
 */
export function extractBingTargetUrl(rawLink: string): string {
  try {
    const parsed = new URL(rawLink);
    const embeddedUrl = parsed.searchParams.get('url')?.trim();
    if (embeddedUrl && isSafeHttpUrl(embeddedUrl)) {
      return embeddedUrl;
    }
  } catch {
    // Abaikan dan kembalikan rawLink
  }
  return rawLink.trim();
}

function stripHtmlAndDecode(rawHtml: string): string {
  if (!rawHtml) return '';
  const $ = load(`<div>${rawHtml}</div>`);
  return $('div').text().replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function cleanNewsHeadline(rawTitle: string): string {
  const cleaned = rawTitle.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  // Format agregator umumnya "Judul Artikel - Nama Media"; pertahankan judul inti jika suffix singkat
  const idx = cleaned.lastIndexOf(' - ');
  if (idx > 25 && cleaned.length - idx <= 45) {
    return cleaned.slice(0, idx).trim();
  }
  return cleaned;
}

export function normalizeHeadlineKey(title: string): string {
  return cleanNewsHeadline(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .slice(0, 75);
}

export function isGoogleOwnedUrl(rawUrl: string): boolean {
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
 * Membangun teks cuplikan terstruktur minimal >= 35 kata untuk kandidat berita nasional
 * ketika URL pembungkus Google News (`CBMi...`) atau firewall portal menghalangi ekstraksi HTML penuh,
 * sehingga Gemini tetap memiliki konteks faktual yang memadai untuk mengklasifikasikan berita.
 */
export function buildNationalFallbackSnippet(candidate: DiscoveredArticleCandidate): {
  snippetText: string;
  wordCount: number;
} {
  const cleanedDesc = (candidate.fallbackDescription ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  const keywordLabel = candidate.matchedKeyword ?? 'ekonomi daerah Kalimantan Utara dan Kabupaten Tana Tidung';
  const kbliLabel = candidate.defaultKbliCategory
    ? `Indikasi awal kategori lapangan usaha terkait KBLI ${candidate.defaultKbliCategory}`
    : 'Indikasi fenomena ekonomi regional dan sektoral';
  const expLabel = candidate.defaultExpenditureComponent
    ? `serta komponen pengeluaran ${candidate.defaultExpenditureComponent}`
    : 'pada komponen PDRB terkait';

  const parts = [
    `Berita ekonomi dari portal ${candidate.sourcePortal} berjudul "${candidate.title}".`,
    cleanedDesc && cleanedDesc.toLowerCase() !== candidate.title.toLowerCase()
      ? `Ringkasan laporan menyebutkan: ${cleanedDesc}.`
      : '',
    `Artikel ini teridentifikasi melalui pemantauan kata kunci nasional "${keywordLabel}" untuk penyusunan fenomena ekonomi PDRB Kabupaten Tana Tidung dan Provinsi Kalimantan Utara (${kbliLabel} ${expLabel}).`,
  ].filter(Boolean);

  const snippetText = parts.join(' ').replace(/\s+/g, ' ').trim();
  return {
    snippetText,
    wordCount: countWords(snippetText),
  };
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
 * Mem-parsing XML RSS Bing News Indonesia (`xmlMode: true`), membuka langsung URL penerbit asli
 * dari parameter `url=` pada `apiclick.aspx`, serta mengekstrak cuplikan `<description>`.
 */
export function parseBingNewsRss(
  xml: string,
  keywordTarget: ActiveKeywordTarget,
  options?: { now?: Date; lookbackDays?: number; maxItems?: number },
): DiscoveredArticleCandidate[] {
  const now = options?.now ?? new Date();
  const cutoff = getWitaLookbackCutoff(now, options?.lookbackDays ?? DEFAULT_LOOKBACK_DAYS);
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
    const rawDescription = item.find('description').first().text().trim();
    const rawBingSource =
      item.find('News\\:Source, Source, source').first().text().trim();

    const directUrl = extractBingTargetUrl(rawLink);
    if (!isSafeHttpUrl(directUrl)) return;

    const title = cleanNewsHeadline(rawTitle);
    if (title.length < 15) return;

    const publishedHint = parseIndonesianDateTime(rawPubDate, now);
    if (!isWithinLookbackWindow(publishedHint, cutoff)) return;

    const { normalizedUrl, urlHash } = hashNormalizedUrl(directUrl);
    if (seenHashes.has(urlHash)) return;
    seenHashes.add(urlHash);

    const hostLabel = extractHostnameLabel(normalizedUrl);
    const sourcePortal =
      hostLabel && !hostLabel.includes('bing.com')
        ? hostLabel
        : rawBingSource || hostLabel;

    const plainDesc = stripHtmlAndDecode(rawDescription);
    const fallbackDescription = countWords(plainDesc) >= 8 ? plainDesc : null;

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
      defaultKbliCategory: keywordTarget.defaultKbliCategory ?? null,
      defaultExpenditureComponent: keywordTarget.defaultExpenditureComponent ?? null,
      fallbackDescription,
    });
  });

  return candidates;
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
  const cutoff = getWitaLookbackCutoff(now, options?.lookbackDays ?? DEFAULT_LOOKBACK_DAYS);
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

    const title = cleanNewsHeadline(rawTitle);
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
    const fallbackDescription = countWords(plainDesc) >= 8 ? plainDesc : null;

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
      defaultKbliCategory: keywordTarget.defaultKbliCategory ?? null,
      defaultExpenditureComponent: keywordTarget.defaultExpenditureComponent ?? null,
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
 * Mengambil kandidat berita nasional secara paralel dengan workflow Hybrid:
 * 1) Bing News RSS Indonesia (membuka URL penerbit langsung dari parameter `url=` & snippet deskripsi),
 * 2) Google News RSS Indonesia (cakupan luas portal nasional & lokal dengan fallback metadata RSS).
 * Keduanya dideduplikasi berdasarkan `urlHash` dan kesamaan judul dengan memprioritaskan URL penerbit langsung.
 */
export async function harvestNationalKeywords(
  options: NationalHarvestOptions = {},
): Promise<HarvestNationalResult> {
  const fetchFn = options.fetchFn ?? safeFetchText;
  const now = options.now ?? new Date();
  const lookbackDays = options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
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
        defaultKbliCategory: nationalKeywords.defaultKbliCategory,
        defaultExpenditureComponent: nationalKeywords.defaultExpenditureComponent,
      })
      .from(nationalKeywords)
      .where(eq(nationalKeywords.isActive, true)));

  const candidates: DiscoveredArticleCandidate[] = [];
  const errors: ScraperPortalErrorEntry[] = [];
  const seenHashes = new Set<string>();
  const seenHeadlineIndex = new Map<string, number>();
  let keywordsChecked = 0;

  const upsertCandidate = (item: DiscoveredArticleCandidate) => {
    if (seenHashes.has(item.urlHash)) return;

    const headlineKey = normalizeHeadlineKey(item.title);
    if (headlineKey.length >= 20 && seenHeadlineIndex.has(headlineKey)) {
      const existingIdx = seenHeadlineIndex.get(headlineKey)!;
      const existing = candidates[existingIdx];
      // Jika kandidat lama adalah wrapper Google News dan kandidat baru adalah URL penerbit langsung, ganti!
      if (existing && isGoogleOwnedUrl(existing.url) && !isGoogleOwnedUrl(item.url)) {
        seenHashes.add(item.urlHash);
        candidates[existingIdx] = item;
      }
      return;
    }

    seenHashes.add(item.urlHash);
    const newIndex = candidates.length;
    candidates.push(item);
    if (headlineKey.length >= 20) {
      seenHeadlineIndex.set(headlineKey, newIndex);
    }
  };

  await runWithConcurrency(
    keywords,
    concurrency,
    async (kw) => {
      if (signal?.aborted) return;
      keywordsChecked += 1;

      const bingRssUrl = buildBingNewsRssUrl(kw.keyword);
      const googleRssUrl = buildGoogleNewsRssUrl(kw.keyword);
      const requestOpts: SafeFetchOptions = {
        timeoutMs,
        maxBytes: 1024 * 1024,
        accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5',
        userAgent: DEFAULT_BROWSER_USER_AGENT,
        headers: DEFAULT_BROWSER_HEADERS,
        signal,
      };

      const [bingOutcome, googleOutcome] = await Promise.allSettled([
        fetchFn(bingRssUrl, requestOpts),
        fetchFn(googleRssUrl, requestOpts),
      ]);

      // 1. Proses hasil Bing News RSS terlebih dahulu karena URL-nya adalah URL penerbit langsung
      if (bingOutcome.status === 'fulfilled') {
        const bingItems = parseBingNewsRss(bingOutcome.value.body, kw, {
          now,
          lookbackDays,
          maxItems: maxItemsPerKeyword,
        });
        for (const item of bingItems) {
          upsertCandidate(item);
        }
      }

      // 2. Proses hasil Google News RSS untuk melengkapi berita unik yang belum tertangkap Bing
      if (googleOutcome.status === 'fulfilled') {
        const googleItems = parseGoogleNewsRss(googleOutcome.value.body, kw, {
          now,
          lookbackDays,
          maxItems: maxItemsPerKeyword,
        });
        for (const item of googleItems) {
          upsertCandidate(item);
        }
      }

      // Catat error HARVEST hanya jika kedua sumber RSS sama-sama gagal untuk keyword tersebut
      if (bingOutcome.status === 'rejected' && googleOutcome.status === 'rejected') {
        const reason = googleOutcome.reason ?? bingOutcome.reason;
        errors.push({
          source: `keyword:${kw.keyword}`,
          stage: 'HARVEST',
          message: reason instanceof Error ? reason.message : String(reason),
          url: googleRssUrl,
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
