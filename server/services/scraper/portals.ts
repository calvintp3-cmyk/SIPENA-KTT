// server/services/scraper/portals.ts
import { load, type Cheerio, type CheerioAPI } from 'cheerio';
import { ArticleSourceTypeEnum } from '../../../shared/enums/pdrb';
import { getWitaDateParts, WITA_UTC_OFFSET } from '../../../shared/utils/period';
import { DEFAULT_SCRAPER_CONCURRENCY, runWithConcurrency } from '../../utils/concurrency';
import {
  DEFAULT_BROWSER_HEADERS,
  DEFAULT_BROWSER_USER_AGENT,
  DEFAULT_FETCH_TIMEOUT_MS,
  safeFetchText,
  type SafeFetchOptions,
} from '../../utils/ssrf';
import { hashNormalizedUrl, isSafeHttpUrl } from '../../utils/url-hash';
import { parseIndonesianDateTime } from './extractor';
import type { ScraperPortalErrorEntry } from '../../db/schema';

export const DEFAULT_REGIONAL_MAX_ITEMS = 15;

export interface RegionalPortalConfig {
  id: string;
  label: string;
  sourcePortal: string;
  indexUrl: string;
  allowedHosts: ReadonlyArray<string>;
  itemSelectors: ReadonlyArray<string>;
}

export interface DiscoveredArticleCandidate {
  url: string;
  normalizedUrl: string;
  urlHash: string;
  title: string;
  sourcePortal: string;
  sourceType: ArticleSourceTypeEnum;
  publishedHint: Date | null;
  keywordId: string | null;
  matchedKeyword: string | null;
  fallbackDescription: string | null;
}

export const REGIONAL_PORTALS: ReadonlyArray<RegionalPortalConfig> = [
  {
    id: 'tribun-kaltara',
    label: 'Tribun Kaltara (Tana Tidung)',
    sourcePortal: 'kaltara.tribunnews.com',
    indexUrl: 'https://kaltara.tribunnews.com/kaltara/tanah-tidung',
    allowedHosts: ['kaltara.tribunnews.com'],
    itemSelectors: [
      'div.mr140, div.pos_abs.hlover',
      'ul.lsi li.p1520',
      'li.p1520',
      '.latest-news li',
      'article',
      '.article-list li',
    ],
  },
  {
    id: 'koran-kaltara',
    label: 'Koran Kaltara (Tana Tidung)',
    sourcePortal: 'korankaltara.com',
    indexUrl: 'https://korankaltara.com/category/tana-tidung',
    allowedHosts: ['korankaltara.com', 'www.korankaltara.com'],
    itemSelectors: [
      'article',
      'div.border-b',
      'div.w-10\\/12',
      '.td_module_wrap',
      '.td-block-span6',
      '.post-item',
      '.jeg_post',
    ],
  },
  {
    id: 'benuanta',
    label: 'Benuanta (Pemkab Tana Tidung)',
    sourcePortal: 'benuanta.co.id',
    indexUrl: 'https://benuanta.co.id/category/pemkab-tana-tidung/',
    allowedHosts: ['benuanta.co.id', 'www.benuanta.co.id'],
    itemSelectors: [
      'article',
      '.jeg_post',
      '.post',
      '.td_module_wrap',
      '.entry-item',
    ],
  },
  {
    id: 'radar-tarakan',
    label: 'Radar Tarakan (Tana Tidung)',
    sourcePortal: 'radartarakan.jawapos.com',
    indexUrl: 'https://radartarakan.jawapos.com/tana-tidung',
    allowedHosts: ['radartarakan.jawapos.com'],
    itemSelectors: [
      '.ui-r-fg, .ui-r-display.ui-r-dir',
      '.latest__item',
      '.article__list .article__item',
      'article',
      '.post-item',
      '.news-item',
    ],
  },
];

const NON_ARTICLE_PATH_PREFIXES = [
  '/category/',
  '/kategori/',
  '/tag/',
  '/topic/',
  '/topik/',
  '/author/',
  '/penulis/',
  '/page/',
  '/search',
  '/tentang',
  '/redaksi',
  '/pedoman',
  '/kode-etik',
  '/disclaimer',
  '/syarat-ketentuan',
  '/kebijakan',
  '/karir',
  '/about',
  '/kontak',
  '/privacy',
  '/pasang-iklan',
  '/iklan',
  '/advertise',
  '/galeri',
  '/video',
  '/foto',
  '/indeks',
  '/index',
  '/arsip',
  '/archive',
  '/rss',
  '/sitemap',
  '/wp-login',
  '/wp-admin',
  '/feed',
];

const NON_ARTICLE_SLUG_RE =
  /(?:kode-etik|pedoman-media|tentang-kami|hubungi-kami|redaksi|disclaimer|privacy-policy|syarat-ketentuan)/i;

const ANCHOR_PRIORITY_SELECTORS = [
  '.entry-title a[href], .latest__link[href], .ui-heading a[href]',
  'h1 a[href], h2 a[href], h3 a[href], a[href]:has(h1), a[href]:has(h2), a[href]:has(h3)',
  'h4 a[href], a[href]:has(h4)',
  'a[title][href]',
  'a[href]',
] as const;

function cleanInlineText(text: string): string {
  return text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Menghitung batas awal tanggal (00:00:00 WITA) untuk jendela toleransi H-lookbackDays.
 */
export function getWitaLookbackCutoff(
  referenceNow: Date = new Date(),
  lookbackDays: number = 3,
): Date {
  const shifted = new Date(referenceNow.getTime() - lookbackDays * 86_400_000);
  const { year, month, day } = getWitaDateParts(shifted);
  return new Date(`${year}-${pad2(month)}-${pad2(day)}T00:00:00.000${WITA_UTC_OFFSET}`);
}

export function isWithinLookbackWindow(
  publishedDate: Date | null | undefined,
  cutoffDate: Date,
): boolean {
  if (!publishedDate) return true;
  return publishedDate.getTime() >= cutoffDate.getTime();
}

function isLikelyPortalArticleUrl(rawUrl: string, portal: RegionalPortalConfig): boolean {
  if (!isSafeHttpUrl(rawUrl)) return false;

  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase();
    const hostAllowed = portal.allowedHosts.some(
      (allowed) => hostname === allowed || hostname === `www.${allowed}`,
    );
    if (!hostAllowed) return false;

    const pathname = parsed.pathname.toLowerCase();
    if (pathname === '/' || pathname.length < 6) return false;

    const indexPath = new URL(portal.indexUrl).pathname.toLowerCase().replace(/\/+$/, '');
    const normalizedPath = pathname.replace(/\/+$/, '');
    if (normalizedPath === indexPath) return false;

    if (NON_ARTICLE_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
      return false;
    }

    if (NON_ARTICLE_SLUG_RE.test(normalizedPath)) {
      return false;
    }

    if (/\.(jpg|jpeg|png|gif|webp|svg|pdf|mp4|css|js)$/i.test(pathname)) {
      return false;
    }

    // URL artikel berita pada keempat portal umumnya memiliki slug panjang atau ID numerik/tanggal
    const segments = normalizedPath.split('/').filter(Boolean);
    if (segments.length === 0) return false;
    const lastSegment = segments[segments.length - 1] ?? '';
    return lastSegment.length >= 8 || segments.length >= 2;
  } catch {
    return false;
  }
}

function isValidCandidateTitle(title: string): boolean {
  return (
    title.length >= 15 &&
    !/^baca\s+selengkapnya$/i.test(title) &&
    !/^selengkapnya$/i.test(title)
  );
}

function resolveAnchorCandidate(
  _$: CheerioAPI,
  item: Cheerio<any>,
  portal: RegionalPortalConfig,
): { resolvedUrl: string; title: string } | null {
  for (const selector of ANCHOR_PRIORITY_SELECTORS) {
    const anchors = item.find(selector);
    for (let i = 0; i < anchors.length; i += 1) {
      const anchor = anchors.eq(i);
      const rawHref = anchor.attr('href');
      if (!rawHref) continue;

      let resolvedUrl: string;
      try {
        resolvedUrl = new URL(rawHref.trim(), portal.indexUrl).toString();
      } catch {
        continue;
      }

      if (!isLikelyPortalArticleUrl(resolvedUrl, portal)) {
        continue;
      }

      const rawAnchorTitle = (anchor.attr('title') ?? '').replace(/^Tautan ke:\s*/i, '');
      const title = cleanInlineText(anchor.text()) || cleanInlineText(rawAnchorTitle);

      if (isValidCandidateTitle(title)) {
        return { resolvedUrl, title };
      }
    }
  }

  return null;
}

/**
 * Mengekstrak daftar kandidat artikel dari dokumen HTML halaman kategori portal regional.
 */
export function parseRegionalPortalIndex(
  html: string,
  portal: RegionalPortalConfig,
  options?: { now?: Date; lookbackDays?: number; maxItems?: number },
): DiscoveredArticleCandidate[] {
  const now = options?.now ?? new Date();
  const cutoff = getWitaLookbackCutoff(now, options?.lookbackDays ?? 3);
  const maxItems = options?.maxItems ?? DEFAULT_REGIONAL_MAX_ITEMS;

  const $ = load(html);
  const results: DiscoveredArticleCandidate[] = [];
  const seenHashes = new Set<string>();
  let sawStructuredArticleLink = false;

  const registerCandidate = (
    resolvedUrl: string | undefined,
    rawTitle: string,
    rawDateStr: string | undefined,
  ): boolean => {
    if (!resolvedUrl) return false;
    if (!isLikelyPortalArticleUrl(resolvedUrl, portal)) return false;

    sawStructuredArticleLink = true;
    if (results.length >= maxItems) return true;

    const title = cleanInlineText(rawTitle);
    if (!isValidCandidateTitle(title)) {
      return false;
    }

    const publishedHint = parseIndonesianDateTime(rawDateStr, now);
    if (!isWithinLookbackWindow(publishedHint, cutoff)) {
      return false;
    }

    const { normalizedUrl, urlHash } = hashNormalizedUrl(resolvedUrl);
    if (seenHashes.has(urlHash)) return false;
    seenHashes.add(urlHash);

    results.push({
      url: normalizedUrl,
      normalizedUrl,
      urlHash,
      title,
      sourcePortal: portal.sourcePortal,
      sourceType: ArticleSourceTypeEnum.REGIONAL,
      publishedHint,
      keywordId: null,
      matchedKeyword: null,
      fallbackDescription: null,
    });

    return true;
  };

  // Strategi 1: Iterasi kontainer item berita terstruktur sesuai pola masing-masing portal
  for (const containerSelector of portal.itemSelectors) {
    const nodes = $(containerSelector);
    if (nodes.length === 0) continue;

    let sawContainerUrls = false;

    nodes.each((_idx, el) => {
      if (results.length >= maxItems) return;
      const item = $(el);

      const resolved = resolveAnchorCandidate($, item, portal);
      if (!resolved) return;

      sawContainerUrls = true;

      const timeEl = item.find('time').first();
      const dateStr =
        timeEl.attr('datetime') ||
        timeEl.attr('title') ||
        cleanInlineText(timeEl.text()) ||
        cleanInlineText(
          item
            .find(
              '.grey, .date, .latest__date, .td-post-date, .entry-date, .meta-date, .post-date, .jeg_meta_date, .ui-text',
            )
            .first()
            .text(),
        );

      registerCandidate(resolved.resolvedUrl, resolved.title, dateStr);
    });

    if (sawContainerUrls) {
      sawStructuredArticleLink = true;
    }

    if (results.length >= 3 || (nodes.length >= 3 && sawContainerUrls)) {
      break;
    }
  }

  // Strategi 2: Fallback heading link scan HANYA jika struktur kontainer portal sama sekali tidak dikenali,
  // dengan tetap mengabaikan area navigasi, header, sidebar, dan footer.
  if (!sawStructuredArticleLink && results.length === 0) {
    $('h1 a[href], h2 a[href], h3 a[href], a[href]:has(h1), a[href]:has(h2), a[href]:has(h3), a[href]').each(
      (_idx, el) => {
        if (results.length >= maxItems) return;
        const anchor = $(el);
        if (
          anchor.closest('nav, footer, header, aside, .sidebar, .widget, #sidebar, .footer, .menu')
            .length > 0
        ) {
          return;
        }
        const href = anchor.attr('href');
        if (!href) return;

        let resolvedUrl: string;
        try {
          resolvedUrl = new URL(href.trim(), portal.indexUrl).toString();
        } catch {
          return;
        }

        const title = cleanInlineText(anchor.text() || anchor.attr('title') || '');
        const parentDate = cleanInlineText(
          anchor.parent().parent().find('time, .date, .grey, .ui-text').first().text(),
        );
        registerCandidate(resolvedUrl, title, parentDate);
      },
    );
  }

  return results;
}

export interface HarvestRegionalResult {
  candidates: DiscoveredArticleCandidate[];
  portalsChecked: number;
  errors: ScraperPortalErrorEntry[];
}

export interface RegionalHarvestOptions {
  portals?: ReadonlyArray<RegionalPortalConfig>;
  fetchFn?: (url: string, options?: SafeFetchOptions) => Promise<{ finalUrl: string; body: string }>;
  now?: Date;
  lookbackDays?: number;
  maxItemsPerPortal?: number;
  timeoutMs?: number;
  concurrency?: number;
  signal?: AbortSignal;
}

/**
 * Mengambil indeks artikel terkini dari seluruh portal regional Kabupaten Tana Tidung secara paralel.
 * Kegagalan/timeout pada satu portal diisolasi agar portal lainnya tetap diproses.
 */
export async function harvestRegionalPortals(
  options: RegionalHarvestOptions = {},
): Promise<HarvestRegionalResult> {
  const portals = options.portals ?? REGIONAL_PORTALS;
  const fetchFn = options.fetchFn ?? safeFetchText;
  const now = options.now ?? new Date();
  const lookbackDays = options.lookbackDays ?? 3;
  const maxItemsPerPortal = options.maxItemsPerPortal ?? DEFAULT_REGIONAL_MAX_ITEMS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const concurrency = options.concurrency ?? DEFAULT_SCRAPER_CONCURRENCY;
  const signal = options.signal;

  const candidates: DiscoveredArticleCandidate[] = [];
  const errors: ScraperPortalErrorEntry[] = [];
  const globalSeenHashes = new Set<string>();
  let portalsChecked = 0;

  await runWithConcurrency(
    portals,
    concurrency,
    async (portal) => {
      if (signal?.aborted) return;
      portalsChecked += 1;

      try {
        const response = await fetchFn(portal.indexUrl, {
          timeoutMs,
          maxBytes: 2 * 1024 * 1024,
          userAgent: DEFAULT_BROWSER_USER_AGENT,
          headers: DEFAULT_BROWSER_HEADERS,
          signal,
        });

        const portalCandidates = parseRegionalPortalIndex(response.body, portal, {
          now,
          lookbackDays,
          maxItems: maxItemsPerPortal,
        });

        for (const candidate of portalCandidates) {
          if (!globalSeenHashes.has(candidate.urlHash)) {
            globalSeenHashes.add(candidate.urlHash);
            candidates.push(candidate);
          }
        }
      } catch (err) {
        errors.push({
          source: portal.sourcePortal,
          stage: 'HARVEST',
          message: err instanceof Error ? err.message : String(err),
          url: portal.indexUrl,
        });
      }
    },
    signal,
  );

  return {
    candidates,
    portalsChecked,
    errors,
  };
}
