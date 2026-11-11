// server/services/scraper/extractor.ts
import { load, type CheerioAPI } from 'cheerio';

export const EXTRACTOR_MIN_WORDS = 150;
export const EXTRACTOR_MAX_WORDS = 250;
export const EXTRACTOR_MAX_CHARS = 1500;
export const EXTRACTOR_MIN_VALID_WORDS = 30;

const INDONESIAN_MONTHS: Record<string, number> = {
  januari: 1,
  jan: 1,
  februari: 2,
  feb: 2,
  pebruari: 2,
  maret: 3,
  mar: 3,
  april: 4,
  apr: 4,
  mei: 5,
  may: 5,
  juni: 6,
  jun: 6,
  juli: 7,
  jul: 7,
  agustus: 8,
  agu: 8,
  ags: 8,
  aug: 8,
  september: 9,
  sep: 9,
  sept: 9,
  oktober: 10,
  okt: 10,
  oct: 10,
  november: 11,
  nov: 11,
  nopember: 11,
  desember: 12,
  des: 12,
  dec: 12,
};

const TZ_OFFSETS: Record<string, string> = {
  WIB: '+07:00',
  WITA: '+08:00',
  WIT: '+09:00',
};

const NOISE_ELEMENT_SELECTORS = [
  'script',
  'style',
  'noscript',
  'iframe',
  'svg',
  'form',
  'nav',
  'aside',
  'footer',
  'header',
  '.baca-juga',
  '.bacajuga',
  '.iklan',
  '.ads',
  '.ad-banner',
  '.advertisement',
  '.related-posts',
  '.related-news',
  '.related',
  '.tags',
  '.tag-list',
  '.share-buttons',
  '.social-share',
  '.author-box',
  '.breadcrumb',
  '.comments',
  '#comments',
  '.caption-photo',
  'figcaption',
  '[aria-hidden="true"]',
].join(', ');

const CONTENT_CONTAINER_SELECTORS = [
  'article .entry-content',
  '.entry-content',
  '.post-content',
  '.read__content',
  '.side-article',
  '.txt-article',
  '.detail__body-text',
  '.article-content',
  '[itemprop="articleBody"]',
  'article',
  'main',
];

const NOISE_PARAGRAPH_PATTERNS: RegExp[] = [
  /^baca\s+juga\s*:/i,
  /^simak\s+juga\s*:/i,
  /^lihat\s+juga\s*:/i,
  /^artikel\s+ini\s+telah\s+tayang/i,
  /^(penulis|editor|reporter|pewarta|foto|ilustrasi|sumber|copyright)\s*:/i,
  /^halaman\s+selanjutnya$/i,
  /^loading\.\.\.$/i,
  /^follow\s+berita\s+/i,
  /^dapatkan\s+informasi\s+/i,
];

function cleanText(text: string): string {
  return text.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
}

export function countWords(text: string): number {
  const cleaned = cleanText(text);
  if (!cleaned) return 0;
  return cleaned.split(/\s+/).length;
}

function isPureDatelineOrNoiseParagraph(text: string): boolean {
  if (!text) return true;
  if (NOISE_PARAGRAPH_PATTERNS.some((re) => re.test(text))) {
    return true;
  }

  // Paragraf pendek yang murni berisi label lokasi/media dateline tanpa kalimat berita
  const words = countWords(text);
  if (words <= 7 && /^[A-Z0-9.,\s/()-]+(?:\s*[-–—]{1,2})?$/.test(text)) {
    return true;
  }

  return false;
}

/**
 * Memangkas teks ke batas maksimal `maxWords` dan `maxChars`, mengutamakan pemotongan rapi
 * pada akhir kalimat jika masih menjaga panjang minimum wajar, atau di batas kata.
 */
export function trimToWordAndCharBudget(
  text: string,
  maxWords: number = EXTRACTOR_MAX_WORDS,
  maxChars: number = EXTRACTOR_MAX_CHARS,
  minPreferredWords: number = EXTRACTOR_MIN_WORDS,
): string {
  const words = cleanText(text).split(/\s+/).filter(Boolean);
  if (words.length <= maxWords && text.length <= maxChars) {
    return words.join(' ');
  }

  const cappedByWords: string[] = [];
  let charCount = 0;

  for (const word of words) {
    if (cappedByWords.length >= maxWords) break;
    const nextLength = cappedByWords.length === 0 ? word.length : charCount + 1 + word.length;
    if (nextLength > maxChars) break;
    cappedByWords.push(word);
    charCount = nextLength;
  }

  const candidate = cappedByWords.join(' ');

  // Cari titik/akhir kalimat paling dekat ke akhir teks kandidat jika >= minPreferredWords
  const minCutCharIdx = Math.floor(candidate.length * 0.6);
  let lastSentenceBreak = -1;
  for (let i = candidate.length - 1; i >= minCutCharIdx; i -= 1) {
    const ch = candidate[i];
    if (ch === '.' || ch === '!' || ch === '?') {
      const beforeBreak = candidate.slice(0, i + 1);
      if (countWords(beforeBreak) >= minPreferredWords) {
        lastSentenceBreak = i + 1;
        break;
      }
    }
  }

  if (lastSentenceBreak > 0) {
    return candidate.slice(0, lastSentenceBreak).trim();
  }

  return candidate;
}

/**
 * Mengakumulasi teks paragraf bersih hingga ambang batas 150-250 kata (~1.000-1.500 karakter).
 */
export function accumulateParagraphsToThreshold(paragraphs: string[]): {
  snippetText: string;
  wordCount: number;
  isValidContent: boolean;
} {
  const cleanParagraphs = paragraphs
    .map(cleanText)
    .filter((p) => p.length > 0 && !isPureDatelineOrNoiseParagraph(p));

  const accumulated: string[] = [];
  let runningWords = 0;

  for (const p of cleanParagraphs) {
    const pWords = countWords(p);

    if (runningWords >= EXTRACTOR_MIN_WORDS) {
      break;
    }

    const joinedSoFar = accumulated.length > 0 ? `${accumulated.join('\n\n')}\n\n${p}` : p;

    if (
      runningWords + pWords > EXTRACTOR_MAX_WORDS ||
      joinedSoFar.length > EXTRACTOR_MAX_CHARS
    ) {
      const trimmed = trimToWordAndCharBudget(
        joinedSoFar,
        EXTRACTOR_MAX_WORDS,
        EXTRACTOR_MAX_CHARS,
        EXTRACTOR_MIN_WORDS,
      );
      const finalWordCount = countWords(trimmed);
      return {
        snippetText: trimmed,
        wordCount: finalWordCount,
        isValidContent: finalWordCount >= EXTRACTOR_MIN_VALID_WORDS,
      };
    }

    accumulated.push(p);
    runningWords += pWords;
  }

  const combined = accumulated.join('\n\n');
  const trimmed = trimToWordAndCharBudget(
    combined,
    EXTRACTOR_MAX_WORDS,
    EXTRACTOR_MAX_CHARS,
    EXTRACTOR_MIN_VALID_WORDS,
  );
  const wordCount = countWords(trimmed);

  return {
    snippetText: trimmed,
    wordCount,
    isValidContent: wordCount >= EXTRACTOR_MIN_VALID_WORDS,
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Mengonversi berbagai format string tanggal Indonesia & ISO ke objek Date UTC yang akurat.
 */
export function parseIndonesianDateTime(
  rawInput: string | undefined | null,
  referenceNow: Date = new Date(),
): Date | null {
  if (!rawInput) return null;
  const raw = cleanText(rawInput);
  if (!raw) return null;

  // 1. Tanggal relatif (mis. "2 jam yang lalu", "45 menit lalu", "kemarin")
  const relHour = /(\d+)\s*jam\s*(?:yang\s*)?lalu/i.exec(raw);
  if (relHour?.[1]) {
    return new Date(referenceNow.getTime() - Number(relHour[1]) * 3_600_000);
  }
  const relMinute = /(\d+)\s*menit\s*(?:yang\s*)?lalu/i.exec(raw);
  if (relMinute?.[1]) {
    return new Date(referenceNow.getTime() - Number(relMinute[1]) * 60_000);
  }
  const relDay = /(\d+)\s*hari\s*(?:yang\s*)?lalu/i.exec(raw);
  if (relDay?.[1]) {
    return new Date(referenceNow.getTime() - Number(relDay[1]) * 86_400_000);
  }
  if (/^kemarin\b/i.test(raw)) {
    return new Date(referenceNow.getTime() - 86_400_000);
  }

  // 2. ISO-like timestamp (dengan atau tanpa zona waktu)
  if (/^\d{4}-\d{2}-\d{2}(?:[T\s]\d{2}:\d{2}(?::\d{2})?(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?$/.test(raw)) {
    const hasTz = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(raw);
    const isoCandidate = raw.includes('T') ? raw : raw.replace(' ', 'T');
    const normalizedIso = hasTz
      ? isoCandidate
      : isoCandidate.length === 10
        ? `${isoCandidate}T08:00:00+08:00`
        : `${isoCandidate}+08:00`;
    const parsed = new Date(normalizedIso);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // 3. RFC 2822 / PubDate RSS (mis. "Wed, 14 Oct 2026 01:15:00 GMT")
  if (/^[A-Za-z]{3},\s+\d{1,2}\s+[A-Za-z]{3}\s+\d{4}\s+\d{2}:\d{2}/.test(raw)) {
    const parsed = new Date(raw);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  // 4. Format Indonesia bernama bulan: "(Senin, )14 Oktober 2026 (|, - pukul) 09:15 (WIB|WITA|WIT)"
  const idNamedMatch =
    /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:[\s,|\-]+(?:pukul\s+)?(\d{1,2})[:.](\d{2})(?::(\d{2}))?)?(?:\s*(WITA|WIB|WIT))?/i.exec(
      raw,
    );
  if (idNamedMatch) {
    const day = Number(idNamedMatch[1]);
    const monthName = (idNamedMatch[2] ?? '').toLowerCase();
    const year = Number(idNamedMatch[3]);
    const month = INDONESIAN_MONTHS[monthName];
    if (month && day >= 1 && day <= 31 && year >= 2000 && year <= 2100) {
      const hour = idNamedMatch[4] !== undefined ? Number(idNamedMatch[4]) : 8;
      const minute = idNamedMatch[5] !== undefined ? Number(idNamedMatch[5]) : 0;
      const second = idNamedMatch[6] !== undefined ? Number(idNamedMatch[6]) : 0;
      const tzKey = (idNamedMatch[7] ?? 'WITA').toUpperCase();
      const offset = TZ_OFFSETS[tzKey] ?? '+08:00';
      const iso = `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}:${pad2(second)}${offset}`;
      const d = new Date(iso);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }

  // 5. Format numerik Indonesia: "14/10/2026 09:15 WITA" atau "14-10-2026"
  const numericIdMatch =
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:[\s,|]+(\d{1,2})[:.](\d{2}))?(?:\s*(WITA|WIB|WIT))?/i.exec(
      raw,
    );
  if (numericIdMatch) {
    const day = Number(numericIdMatch[1]);
    const month = Number(numericIdMatch[2]);
    const year = Number(numericIdMatch[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31 && year >= 2000 && year <= 2100) {
      const hour = numericIdMatch[4] !== undefined ? Number(numericIdMatch[4]) : 8;
      const minute = numericIdMatch[5] !== undefined ? Number(numericIdMatch[5]) : 0;
      const tzKey = (numericIdMatch[6] ?? 'WITA').toUpperCase();
      const offset = TZ_OFFSETS[tzKey] ?? '+08:00';
      const iso = `${year}-${pad2(month)}-${pad2(day)}T${pad2(hour)}:${pad2(minute)}:00${offset}`;
      const d = new Date(iso);
      if (!Number.isNaN(d.getTime())) return d;
    }
  }

  return null;
}

function findDateInJsonLd($: CheerioAPI): Date | null {
  const scripts = $('script[type="application/ld+json"]');
  for (let i = 0; i < scripts.length; i += 1) {
    const rawJson = scripts.eq(i).html();
    if (!rawJson) continue;
    try {
      const parsed = JSON.parse(rawJson) as unknown;
      const stack: unknown[] = Array.isArray(parsed) ? [...parsed] : [parsed];
      while (stack.length > 0) {
        const node = stack.shift();
        if (!node || typeof node !== 'object') continue;
        const record = node as Record<string, unknown>;
        if (typeof record.datePublished === 'string') {
          const dt = parseIndonesianDateTime(record.datePublished);
          if (dt) return dt;
        }
        if (Array.isArray(record['@graph'])) {
          stack.push(...record['@graph']);
        }
      }
    } catch {
      // Abaikan JSON-LD tidak valid pada halaman portal pihak ketiga
    }
  }
  return null;
}

function extractPublishedDate($: CheerioAPI): Date | null {
  const jsonLdDate = findDateInJsonLd($);
  if (jsonLdDate) return jsonLdDate;

  const metaCandidates = [
    $('meta[property="article:published_time"]').attr('content'),
    $('meta[name="article:published_time"]').attr('content'),
    $('meta[name="publish-date"]').attr('content'),
    $('meta[name="pubdate"]').attr('content'),
    $('meta[name="publishdate"]').attr('content'),
    $('meta[itemprop="datePublished"]').attr('content'),
    $('time[datetime]').first().attr('datetime'),
  ];

  for (const candidate of metaCandidates) {
    const dt = parseIndonesianDateTime(candidate);
    if (dt) return dt;
  }

  const domDateSelectors = [
    'time',
    '.read__time',
    '.detail__date',
    '.entry-date',
    '.post-date',
    '.published',
    '.meta-date',
    '.date',
    '.grey',
  ];

  for (const selector of domDateSelectors) {
    const el = $(selector).first();
    if (el.length > 0) {
      const dt = parseIndonesianDateTime(el.attr('datetime') || el.text());
      if (dt) return dt;
    }
  }

  return null;
}

function extractCleanTitle($: CheerioAPI): string {
  const rawTitle =
    $('meta[property="og:title"]').attr('content') ||
    $('h1').first().text() ||
    $('title').first().text() ||
    '';

  return cleanText(rawTitle)
    .replace(/\s*[-|–]\s*(?:Tribun\s*Kaltara|Tribunkaltara\.com|Koran\s*Kaltara|Benuanta|Radar\s*Tarakan|Jawa\s*Pos).*$/i, '')
    .trim();
}

export interface ExtractedArticleContent {
  title: string;
  publishedAt: Date | null;
  snippetText: string;
  wordCount: number;
  isValidContent: boolean;
  canonicalUrl: string | null;
}

/**
 * Mengekstrak judul, tanggal rilis, dan 150-250 kata pertama yang bersih dari dokumen HTML portal berita.
 */
export function extractArticleContent(
  html: string,
  fallbackPublishedAt?: Date | null,
): ExtractedArticleContent {
  const $ = load(html);

  // Ambil metadata tanggal, judul, & canonical sebelum membersihkan DOM
  const title = extractCleanTitle($);
  const publishedAt = extractPublishedDate($) ?? fallbackPublishedAt ?? null;
  const canonicalUrl = $('link[rel="canonical"]').attr('href')?.trim() ?? null;

  // Bersihkan seluruh elemen pengganggu
  $(NOISE_ELEMENT_SELECTORS).remove();

  let container = $('body' as string);
  for (const selector of CONTENT_CONTAINER_SELECTORS) {
    const candidate = $(selector).first();
    if (candidate.length > 0 && countWords(candidate.text()) >= EXTRACTOR_MIN_VALID_WORDS) {
      container = candidate;
      break;
    }
  }

  const paragraphs: string[] = [];
  container.find('p').each((_idx, el) => {
    const text = cleanText($(el).text());
    if (text) {
      paragraphs.push(text);
    }
  });

  // Fallback jika portal jarang memakai <p> (mis. memisahkan baris dengan <br> atau <div>)
  let result = accumulateParagraphsToThreshold(paragraphs);
  if (!result.isValidContent) {
    const fallbackLines = container
      .text()
      .split(/\n+/)
      .map(cleanText)
      .filter((line) => line.length >= 25);
    const fallbackResult = accumulateParagraphsToThreshold(fallbackLines);
    if (fallbackResult.wordCount > result.wordCount) {
      result = fallbackResult;
    }
  }

  return {
    title,
    publishedAt,
    snippetText: result.snippetText,
    wordCount: result.wordCount,
    isValidContent: result.isValidContent,
    canonicalUrl,
  };
}

