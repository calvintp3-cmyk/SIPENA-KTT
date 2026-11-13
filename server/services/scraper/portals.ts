// server/services/scraper/portals.ts
import { load, type Cheerio, type CheerioAPI } from 'cheerio';
import {
  ArticleSourceTypeEnum,
  type ExpenditureComponentEnum,
  type KbliCategoryEnum,
} from '../../../shared/enums/pdrb';
import { getWitaDateParts, WITA_UTC_OFFSET } from '../../../shared/utils/period';
import type { ScraperPortalErrorEntry } from '../../db/schema';
import { DEFAULT_SCRAPER_CONCURRENCY, runWithConcurrency } from '../../utils/concurrency';
import {
  DEFAULT_BROWSER_HEADERS,
  DEFAULT_BROWSER_USER_AGENT,
  DEFAULT_FETCH_TIMEOUT_MS,
  safeFetchText,
  type SafeFetchOptions,
} from '../../utils/ssrf';
import { hashNormalizedUrl, isSafeHttpUrl } from '../../utils/url-hash';
import {
  accumulateParagraphsToThreshold,
  detectSoftBlockPage,
  parseIndonesianDateTime,
} from './extractor';
import { KTT_ANCHOR_RE } from './geo-filter';

export const DEFAULT_REGIONAL_MAX_ITEMS = 15;
export const DEFAULT_LOOKBACK_DAYS = 7;
export const DEFAULT_MAX_PAGES_PER_PORTAL = 5;

export type PaginationPattern = 'SLASH_PAGE' | 'QUERY_PAGE' | 'QUERY_P' | 'QUERY_PAGED';

export interface RegionalPortalConfig {
  id: string;
  label: string;
  sourcePortal: string;
  indexUrl: string;
  feedUrls?: ReadonlyArray<string>;
  additionalIndexUrls?: ReadonlyArray<string>;
  allowedHosts: ReadonlyArray<string>;
  itemSelectors: ReadonlyArray<string>;
  paginationPattern?: PaginationPattern;
  maxPages?: number;
}

export function buildPaginatedPortalUrl(
  baseUrl: string,
  page: number,
  pattern?: PaginationPattern,
): string {
  if (page <= 1) return baseUrl;
  try {
    const url = new URL(baseUrl);
    if (pattern === 'QUERY_PAGE') {
      url.searchParams.set('page', String(page));
      return url.toString();
    }
    if (pattern === 'QUERY_P') {
      url.searchParams.set('p', String(page));
      return url.toString();
    }
    if (pattern === 'QUERY_PAGED') {
      url.searchParams.set('paged', String(page));
      return url.toString();
    }
    if (pattern === 'SLASH_PAGE') {
      const cleanPath = url.pathname.replace(/\/+$/, '');
      url.pathname = `${cleanPath}/page/${page}/`;
      return url.toString();
    }

    if (url.searchParams.has('s')) {
      url.searchParams.set('paged', String(page));
      return url.toString();
    }
    if (url.search) {
      url.searchParams.set('page', String(page));
      return url.toString();
    }
    const cleanPath = url.pathname.replace(/\/+$/, '');
    url.pathname = `${cleanPath}/page/${page}/`;
    return url.toString();
  } catch {
    return baseUrl;
  }
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
  defaultKbliCategory?: KbliCategoryEnum | null;
  defaultExpenditureComponent?: ExpenditureComponentEnum | null;
  fallbackDescription: string | null;
  prefetchedSnippetText?: string | null;
  prefetchedWordCount?: number;
}

export const REGIONAL_PORTALS: ReadonlyArray<RegionalPortalConfig> = [
  {
    id: 'tribun-kaltara',
    label: 'Tribun Kaltara (Tana Tidung)',
    sourcePortal: 'kaltara.tribunnews.com',
    indexUrl: 'https://kaltara.tribunnews.com/tag/tana-tidung',
    additionalIndexUrls: ['https://kaltara.tribunnews.com/kaltara/tanah-tidung'],
    allowedHosts: ['kaltara.tribunnews.com'],
    paginationPattern: 'QUERY_PAGE',
    maxPages: 5,
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
    paginationPattern: 'SLASH_PAGE',
    maxPages: 5,
    itemSelectors: [
      'a[href^="/"]:not([href="/"]):not([href="/epaper"]):not([href*="/category/"]):not([href*="/redaksi"]):not([href*="/kode-etik"]):not([href*="/disclaimer"]):not([href*="/privacy-policy"]):not([href*="/kontak"])',
      'div.max-w-\\[1240px\\] a[href]',
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
    label: 'Benuanta (Tana Tidung)',
    sourcePortal: 'benuanta.co.id',
    indexUrl: 'https://benuanta.co.id/?s=tana+tidung',
    feedUrls: [
      'https://benuanta.co.id/topic/berita-ktt/feed/',
      'https://benuanta.co.id/category/tana-tidung/feed/',
      'https://benuanta.co.id/category/pemkab-tana-tidung/feed/',
      'https://benuanta.co.id/feed/?s=tana+tidung',
    ],
    additionalIndexUrls: [
      'https://benuanta.co.id/topic/berita-ktt/',
      'https://benuanta.co.id/category/pemkab-tana-tidung/',
    ],
    allowedHosts: ['benuanta.co.id', 'www.benuanta.co.id'],
    paginationPattern: 'QUERY_PAGED',
    maxPages: 5,
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
    paginationPattern: 'QUERY_PAGE',
    maxPages: 5,
    itemSelectors: [
      'div.ui-card a[href]',
      'a[href*="/tana-tidung/"]',
      '.ui-card',
      '.ui-r-fg, .ui-r-display.ui-r-dir',
      '.latest__item',
      '.article__list .article__item',
      'article',
      '.post-item',
      '.news-item',
    ],
  },
  {
    id: 'pemkab-tana-tidung',
    label: 'Pemkab Tana Tidung (Portal Resmi)',
    sourcePortal: 'tanatidungkab.go.id',
    indexUrl: 'https://tanatidungkab.go.id/berita',
    allowedHosts: ['tanatidungkab.go.id', 'www.tanatidungkab.go.id'],
    paginationPattern: 'QUERY_PAGE',
    maxPages: 5,
    itemSelectors: [
      '.news-item',
      'article',
      '.post',
      '.card',
      '.blog-item',
      '.content-item',
    ],
  },
  {
    id: 'pemprov-kaltara',
    label: 'Pemprov Kaltara (Diskominfo)',
    sourcePortal: 'kaltaraprov.go.id',
    indexUrl: 'https://kaltaraprov.go.id/berita',
    additionalIndexUrls: ['https://kaltaraprov.go.id/'],
    allowedHosts: ['kaltaraprov.go.id', 'www.kaltaraprov.go.id'],
    paginationPattern: 'SLASH_PAGE',
    maxPages: 5,
    itemSelectors: [
      'article',
      '.post',
      '.news-item',
      '.card',
      '.jeg_post',
    ],
  },
  {
    id: 'disbun-kaltara',
    label: 'Disbun Kaltara (Harga TBS & Sawit)',
    sourcePortal: 'disbun.kaltaraprov.go.id',
    indexUrl: 'https://disbun.kaltaraprov.go.id/berita',
    allowedHosts: ['disbun.kaltaraprov.go.id'],
    paginationPattern: 'SLASH_PAGE',
    maxPages: 5,
    itemSelectors: [
      'article',
      '.post',
      '.news-item',
      '.card',
    ],
  },
  {
    id: 'antara-kaltara',
    label: 'Antara News Kaltara',
    sourcePortal: 'kaltara.antaranews.com',
    indexUrl: 'https://kaltara.antaranews.com/kaltara',
    additionalIndexUrls: ['https://kaltara.antaranews.com/biro-kaltara'],
    allowedHosts: ['kaltara.antaranews.com'],
    paginationPattern: 'QUERY_PAGE',
    maxPages: 5,
    itemSelectors: [
      'article',
      '.simple-post',
      '.post-item',
      '.list-news li',
    ],
  },
  {
    id: 'focus-borneo',
    label: 'Fokus Borneo',
    sourcePortal: 'focusborneo.com',
    indexUrl: 'https://focusborneo.com/category/kaltara/tana-tidung/',
    additionalIndexUrls: ['https://focusborneo.com/category/kaltara/'],
    allowedHosts: ['focusborneo.com', 'www.focusborneo.com'],
    paginationPattern: 'SLASH_PAGE',
    maxPages: 5,
    itemSelectors: [
      'article',
      '.jeg_post',
      '.post-item',
      '.td_module_wrap',
    ],
  },
  {
    id: 'niaga-asia',
    label: 'Niaga.Asia (Kaltara)',
    sourcePortal: 'niaga.asia',
    indexUrl: 'https://www.niaga.asia/category/kaltara/',
    allowedHosts: ['niaga.asia', 'www.niaga.asia'],
    paginationPattern: 'SLASH_PAGE',
    maxPages: 5,
    itemSelectors: [
      'article',
      '.jeg_post',
      '.post-item',
      '.td_module_wrap',
    ],
  },
  {
    id: 'pro-kaltara',
    label: 'Pro Kaltara (Jawa Pos)',
    sourcePortal: 'prokaltara.jawapos.com',
    indexUrl: 'https://prokaltara.jawapos.com/tana-tidung',
    additionalIndexUrls: ['https://prokaltara.jawapos.com/kaltara'],
    allowedHosts: ['prokaltara.jawapos.com'],
    paginationPattern: 'QUERY_PAGE',
    maxPages: 5,
    itemSelectors: [
      'article',
      '.latest__item',
      '.post-item',
      '.ui-r-fg',
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

const OTHER_REGENCY_URL_SEGMENTS_RE =
  /\/(?:nunukan|tarakan|bulungan|malinau|krayan|sebatik|berau|samarinda|balikpapan|kaltim)\//i;

const SIDEBAR_WIDGET_CONTAINER_SELECTORS = [
  'nav',
  'footer',
  'aside',
  '.sidebar',
  '#sidebar',
  '.widget',
  '.related',
  '.related-posts',
  '.related-news',
  '.popular',
  '.terpopuler',
  '.berita-terkait',
  '.w300',
  '.menu',
  '.site-header',
  '.jeg_header',
  '.td-header-wrap',
].join(', ');

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
  lookbackDays: number = DEFAULT_LOOKBACK_DAYS,
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

    const allIndexUrls = [
      portal.indexUrl,
      ...(portal.feedUrls ?? []),
      ...(portal.additionalIndexUrls ?? []),
    ];
    const normalizedPath = pathname.replace(/\/+$/, '');
    for (const idxUrl of allIndexUrls) {
      try {
        const indexPath = new URL(idxUrl).pathname.toLowerCase().replace(/\/+$/, '');
        if (indexPath && normalizedPath === indexPath) return false;
      } catch {
        // ignore invalid index url
      }
    }

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

function isOtherRegencyArticleWithoutKtt(resolvedUrl: string, title: string): boolean {
  try {
    const pathname = new URL(resolvedUrl).pathname.toLowerCase();
    return OTHER_REGENCY_URL_SEGMENTS_RE.test(pathname) && !KTT_ANCHOR_RE.test(title);
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
  baseUrl: string,
): { resolvedUrl: string; title: string } | null {
  for (const selector of ANCHOR_PRIORITY_SELECTORS) {
    const anchors = item.find(selector);
    for (let i = 0; i < anchors.length; i += 1) {
      const anchor = anchors.eq(i);
      const rawHref = anchor.attr('href');
      if (!rawHref) continue;

      let resolvedUrl: string;
      try {
        resolvedUrl = new URL(rawHref.trim(), baseUrl).toString();
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
 * Mengekstrak daftar kandidat artikel dari dokumen RSS XML portal regional WordPress (`benuanta.co.id`).
 * Bila tag `<content:encoded>` atau `<description>` memuat teks lengkap >= 30 kata, kandidat menyimpan
 * `prefetchedSnippetText` sehingga Phase C tidak perlu fetch HTML ulang.
 */
export function parseRegionalRssFeed(
  xml: string,
  portal: RegionalPortalConfig,
  options?: { now?: Date; lookbackDays?: number; maxItems?: number; feedUrl?: string },
): DiscoveredArticleCandidate[] {
  const now = options?.now ?? new Date();
  const cutoff = getWitaLookbackCutoff(now, options?.lookbackDays ?? DEFAULT_LOOKBACK_DAYS);
  const maxItems = options?.maxItems ?? DEFAULT_REGIONAL_MAX_ITEMS;
  const isSearchFeed = Boolean(options?.feedUrl && /[?&]s=/i.test(options.feedUrl));

  const $ = load(xml, { xmlMode: true });
  const results: DiscoveredArticleCandidate[] = [];
  const seenHashes = new Set<string>();

  $('item').each((_idx, el) => {
    if (results.length >= maxItems) return;

    const item = $(el);
    const rawTitle = item.find('title').first().text().trim();
    const rawLink = item.find('link').first().text().trim();
    const rawPubDate =
      item.find('pubDate').first().text().trim() ||
      item.find('dc\\:date, date').first().text().trim();
    const rawEncoded = item.find('content\\:encoded, encoded').first().text().trim();
    const rawDesc = item.find('description').first().text().trim();

    if (!isLikelyPortalArticleUrl(rawLink, portal)) return;

    const title = cleanInlineText(rawTitle);
    if (!isValidCandidateTitle(title)) return;
    if (isOtherRegencyArticleWithoutKtt(rawLink, title)) return;

    const publishedHint = parseIndonesianDateTime(rawPubDate, now);
    if (!isWithinLookbackWindow(publishedHint, cutoff)) return;

    // Ekstrak paragraf dari HTML CDATA `<content:encoded>` atau `<description>`
    const htmlPayload = rawEncoded || rawDesc;
    const contentDoc = load(`<div>${htmlPayload}</div>`);
    const paragraphs: string[] = [];
    contentDoc('p').each((_pIdx, pEl) => {
      const txt = cleanInlineText(contentDoc(pEl).text());
      if (txt) paragraphs.push(txt);
    });
    if (paragraphs.length === 0) {
      const flatText = cleanInlineText(contentDoc('div').text());
      if (flatText) paragraphs.push(flatText);
    }

    const accumulated = accumulateParagraphsToThreshold(paragraphs);

    if (isSearchFeed && !KTT_ANCHOR_RE.test(`${title}\n${accumulated.snippetText}`)) {
      return;
    }

    const { normalizedUrl, urlHash } = hashNormalizedUrl(rawLink);
    if (seenHashes.has(urlHash)) return;
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
      defaultKbliCategory: null,
      defaultExpenditureComponent: null,
      fallbackDescription: null,
      prefetchedSnippetText: accumulated.isValidContent ? accumulated.snippetText : null,
      prefetchedWordCount: accumulated.isValidContent ? accumulated.wordCount : 0,
    });
  });

  return results;
}

/**
 * Mengekstrak daftar kandidat artikel dari dokumen HTML halaman kategori/tag/pencarian portal regional.
 * Memblokir seluruh blok sidebar, widget terpopuler, related news, dan subkanal kabupaten tetangga.
 */
export function parseRegionalPortalIndex(
  html: string,
  portal: RegionalPortalConfig,
  options?: {
    now?: Date;
    lookbackDays?: number;
    maxItems?: number;
    baseUrl?: string;
    onCutoffReached?: () => void;
  },
): DiscoveredArticleCandidate[] {
  const now = options?.now ?? new Date();
  const cutoff = getWitaLookbackCutoff(now, options?.lookbackDays ?? DEFAULT_LOOKBACK_DAYS);
  const maxItems = options?.maxItems ?? DEFAULT_REGIONAL_MAX_ITEMS;
  const baseUrl = options?.baseUrl ?? portal.indexUrl;

  const $ = load(html);
  // Sterilkan widget/sidebar/terpopuler sebelum mencari kandidat artikel utama
  $(SIDEBAR_WIDGET_CONTAINER_SELECTORS).remove();

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

    const title = cleanInlineText(rawTitle);
    if (isOtherRegencyArticleWithoutKtt(resolvedUrl, title)) return false;

    sawStructuredArticleLink = true;
    if (results.length >= maxItems) return true;

    if (!isValidCandidateTitle(title)) {
      return false;
    }

    const publishedHint = parseIndonesianDateTime(rawDateStr, now);
    if (!isWithinLookbackWindow(publishedHint, cutoff)) {
      options?.onCutoffReached?.();
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
      defaultKbliCategory: null,
      defaultExpenditureComponent: null,
      fallbackDescription: null,
      prefetchedSnippetText: null,
      prefetchedWordCount: 0,
    });

    return true;
  };

  // Strategi 0: Ekstraksi tautan berita dari JSON-LD ItemList / CollectionPage jika tersedia
  $('script[type="application/ld+json"]').each((_idx, el) => {
    if (results.length >= maxItems) return;
    const rawJson = $(el).html();
    if (!rawJson) return;
    try {
      const parsed = JSON.parse(rawJson) as unknown;
      const stack: unknown[] = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (stack.length > 0 && results.length < maxItems) {
        const node = stack.shift();
        if (!node || typeof node !== 'object') continue;
        const rec = node as Record<string, unknown>;
        if (Array.isArray(rec['@graph'])) {
          stack.push(...rec['@graph']);
        }
        if (Array.isArray(rec.itemListElement)) {
          for (const item of rec.itemListElement) {
            if (item && typeof item === 'object') {
              const itemRec = item as Record<string, unknown>;
              const itemUrl = (itemRec.url || (typeof itemRec.item === 'string' ? itemRec.item : (itemRec.item as Record<string, unknown>)?.['@id'])) as string | undefined;
              const itemTitle = (itemRec.name || (itemRec.item as Record<string, unknown>)?.name || '') as string;
              if (itemUrl && itemTitle) {
                registerCandidate(itemUrl, itemTitle, undefined);
              }
            }
          }
        }
      }
    } catch {
      // Abaikan JSON-LD tidak valid
    }
  });

  // Strategi 1: Iterasi kontainer item berita terstruktur sesuai pola masing-masing portal
  for (const containerSelector of portal.itemSelectors) {
    const nodes = $(containerSelector);
    if (nodes.length === 0) continue;

    let sawContainerUrls = false;

    nodes.each((_idx, el) => {
      if (results.length >= maxItems) return;
      const item = $(el);
      if (item.closest(SIDEBAR_WIDGET_CONTAINER_SELECTORS).length > 0) return;

      const resolved = resolveAnchorCandidate($, item, portal, baseUrl);
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
        if (anchor.closest(`header, ${SIDEBAR_WIDGET_CONTAINER_SELECTORS}`).length > 0) {
          return;
        }
        const href = anchor.attr('href');
        if (!href) return;

        let resolvedUrl: string;
        try {
          resolvedUrl = new URL(href.trim(), baseUrl).toString();
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
  maxPagesPerPortal?: number;
  timeoutMs?: number;
  concurrency?: number;
  signal?: AbortSignal;
}

/**
 * Mengambil indeks artikel terkini dari seluruh portal regional Kabupaten Tana Tidung secara paralel.
 * Portal dengan `feedUrls` WordPress RSS memprioritaskan jalur cepat RSS terstruktur sebelum HTML index.
 * Mendukung adaptif deep-pagination dengan early-exit saat mencapai batas cutoff tanggal atau artikel usang.
 */
export async function harvestRegionalPortals(
  options: RegionalHarvestOptions = {},
): Promise<HarvestRegionalResult> {
  const portals = options.portals ?? REGIONAL_PORTALS;
  const fetchFn = options.fetchFn ?? safeFetchText;
  const now = options.now ?? new Date();
  const lookbackDays = options.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
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

      let portalFoundCount = 0;
      const portalErrors: ScraperPortalErrorEntry[] = [];

      // 1. Jalur cepat RSS XML WordPress (jika tersedia, mis. benuanta.co.id)
      for (const feedUrl of portal.feedUrls ?? []) {
        if (signal?.aborted) break;
        if (portalFoundCount >= maxItemsPerPortal) break;

        try {
          const response = await fetchFn(feedUrl, {
            timeoutMs,
            maxBytes: 1024 * 1024,
            accept: 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5',
            userAgent: DEFAULT_BROWSER_USER_AGENT,
            headers: DEFAULT_BROWSER_HEADERS,
            signal,
            politeHostPacing: !options.fetchFn,
          });

          const feedCandidates = parseRegionalRssFeed(response.body, portal, {
            now,
            lookbackDays,
            maxItems: maxItemsPerPortal - portalFoundCount,
            feedUrl,
          });

          for (const candidate of feedCandidates) {
            if (!globalSeenHashes.has(candidate.urlHash)) {
              globalSeenHashes.add(candidate.urlHash);
              candidates.push(candidate);
              portalFoundCount += 1;
            }
          }
        } catch (err) {
          portalErrors.push({
            source: portal.sourcePortal,
            stage: 'HARVEST',
            message: err instanceof Error ? err.message : String(err),
            url: feedUrl,
          });
        }
      }

      // 2. HTML index & additionalIndexUrls dengan deep-pagination adaptif
      const htmlUrlsToCheck = [portal.indexUrl, ...(portal.additionalIndexUrls ?? [])];
      for (const targetIndexUrl of htmlUrlsToCheck) {
        if (signal?.aborted) break;
        if (portalFoundCount >= maxItemsPerPortal) break;

        const maxPages = portal.maxPages ?? options.maxPagesPerPortal ?? 1;
        for (let page = 1; page <= maxPages; page++) {
          if (signal?.aborted) break;
          if (portalFoundCount >= maxItemsPerPortal) break;

          const currentUrl = buildPaginatedPortalUrl(targetIndexUrl, page, portal.paginationPattern);

          if (page > 1) {
            await new Promise((r) => setTimeout(r, options.fetchFn ? 0 : 300));
          }

          try {
            const response = await fetchFn(currentUrl, {
              timeoutMs,
              maxBytes: 2 * 1024 * 1024,
              userAgent: DEFAULT_BROWSER_USER_AGENT,
              headers: DEFAULT_BROWSER_HEADERS,
              signal,
              politeHostPacing: !options.fetchFn,
            });

            const softBlock = detectSoftBlockPage(response.body);
            if (softBlock.isSoftBlocked) {
              portalErrors.push({
                source: portal.sourcePortal,
                stage: 'HARVEST',
                message: softBlock.reason ?? 'Halaman indeks terblokir soft-block anti-bot.',
                url: currentUrl,
              });
              break;
            }

            let reachedCutoff = false;
            const portalCandidates = parseRegionalPortalIndex(response.body, portal, {
              now,
              lookbackDays,
              maxItems: maxItemsPerPortal - portalFoundCount,
              baseUrl: currentUrl,
              onCutoffReached: () => {
                reachedCutoff = true;
              },
            });

            if (portalCandidates.length === 0) {
              break;
            }

            let newFoundOnPage = 0;
            for (const candidate of portalCandidates) {
              if (!globalSeenHashes.has(candidate.urlHash)) {
                globalSeenHashes.add(candidate.urlHash);
                candidates.push(candidate);
                portalFoundCount += 1;
                newFoundOnPage += 1;
              }
            }

            if (reachedCutoff || newFoundOnPage === 0 || portalFoundCount >= maxItemsPerPortal) {
              break;
            }
          } catch (err) {
            portalErrors.push({
              source: portal.sourcePortal,
              stage: 'HARVEST',
              message: err instanceof Error ? err.message : String(err),
              url: currentUrl,
            });
            break;
          }
        }
      }

      // Catat error HARVEST hanya bila seluruh upaya HTML/RSS gagal menemukan satu pun artikel
      // atau jika portal tidak memakai RSS (menjaga isolasi error portal).
      if (portalFoundCount === 0 && portalErrors.length > 0) {
        errors.push(...portalErrors);
      } else if (!(portal.feedUrls && portal.feedUrls.length > 0) && portalErrors.length > 0) {
        errors.push(...portalErrors);
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
