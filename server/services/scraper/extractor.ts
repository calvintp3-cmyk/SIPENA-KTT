// server/services/scraper/extractor.ts
import { load, type CheerioAPI } from 'cheerio';

export const EXTRACTOR_MIN_WORDS = 300;
export const EXTRACTOR_MAX_WORDS = 25_000;
export const EXTRACTOR_MAX_CHARS = 180_000;
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
  '.baca-inline',
  '.baca-juga-box',
  '.detail-baca-juga',
  '.inline-ads',
  '.iklan',
  '.ads',
  '.ad-banner',
  '.advertisement',
  '.advert',
  '.ad-slot',
  '.ad-wrapper',
  '.in-article-ad',
  '.google-auto-placed',
  '.adsbygoogle',
  '.parallax-ad',
  '.native-ad',
  '.sponsored-content',
  '.outbrain',
  '.taboola',
  '.mgid',
  '.detail__body-tag',
  '.detail__body-partner',
  '.related-posts',
  '.related-news',
  '.related',
  '.tags',
  '.tag-list',
  '.share-buttons',
  '.social-share',
  '.author-box',
  '.author-bio',
  '.penulis-wrapper',
  '.reporter-box',
  '.editor-box',
  '.breadcrumb',
  '.comments',
  '#comments',
  '.caption-photo',
  'figcaption',
  '[aria-hidden="true"]',
  '.ads-holder',
  '.ad-box',
  '.ad-container',
  '.ad-middle',
  '.banner-ad',
  '.floating-ad',
  '.newsletter-box',
  '.newsletter-signup',
  '.subscription-box',
  '.paywall',
  '.membership-prompt',
  '.baca-juga-link',
  '.bacajuga-wrapper',
  '.terkait-wrapper',
  '.berita-terkait-box',
  '.kompas-plus',
  '.baca-cepat',
  '.kompascom-apps',
  '.app-promo',
  '.share-wrapper',
  '.social-share-wrapper',
  '.share-box',
  '.share-bar',
  '.sosmed-share',
  '.video-container',
  '.video-embedded-box',
  '.jwplayer',
  '.video-player',
  '.feed-ad',
  '.native-ad-box',
  '.banner-sticky',
  '.telegram-channel',
  '.whatsapp-channel',
  '.wa-channel',
  '[id*="google_ads"]',
  '[id*="div-gpt-ad"]',
].join(', ');

const CONTENT_CONTAINER_SELECTORS = [
  '.news-content',
  'article .entry-content',
  '.entry-content',
  '.post-content',
  '.read__content',
  '.konten',
  '.artikel-lead',
  '.artikel-isi',
  '.jeg_post_content',
  '.td-post-content',
  '.single-post-content',
  '.detail-content',
  '.news-detail',
  '.read__article',
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
  /^baca\s+selengkapnya\b/i,
  /^artikel\s+terkait\s*:/i,
  /^berita\s+terkait\s*:/i,
  /^artikel\s+ini\s+telah\s+tayang/i,
  /^diterbitkan\s+oleh/i,
  /^(penulis|editor|reporter|pewarta|penyunting|redaktur|foto|dok|dokumen|ilustrasi|grafis|sumber|copyright)\s*[:/]/i,
  /^\(?(?:foto|dok|dokumen|ilustrasi|grafis|sumber)\s*[:/]/i,
  /^halaman\s+(?:selanjutnya|\d+)\s*$/i,
  /^loading\.\.\.$/i,
  /^follow\s+berita\s+/i,
  /^dapatkan\s+informasi\s+/i,
  /^\s*\(?(?:tribunkaltara|korankaltara|radartarakan|benuanta|antara|jawapos|kompas|detik|tempo)\.com\)?\s*$/i,
  /^\(\s*(?:\*\/red|\*\/tribun|[a-z0-9\s-]+)\s*\)$/i,
  /^(?:advertisement|scroll\s+to\s+continue\s+with\s+content|iklan)/i,
  /^(?:rekomendasi\s+untuk\s+anda|pilihan\s+editor|trending\s+topic|populer\s+hari\s+ini)/i,
  /^simak\s+berita\s+lainnya\s+di\s+google\s+news/i,
  /^baca\s+artikel\s+detik(?:news|finance)?\s+/i,
  /^baca\s+berita\s+tanpa\s+iklan/i,
  /^gabung\s+kompas(?:\.com)?\s+plus/i,
  /^(?:download|unduh)\s+aplikasi/i,
  /^pilihan\s+editor\s*:/i,
  /^topik\s+terkait\s*:/i,
  /^jangan\s+lewatkan\s*:/i,
  /^ikuti\s+(?:kami|saluran|channel|akun)\b/i,
  /^simak\s+breaking\s+news/i,
  /^ikuti\s+whatsapp\s+channel/i,
  /^bergabung\s+di\s+grup\s+telegram/i,
  /^(?:share|bagikan)\s*:/i,
  /^(?:sumber|source)\s*:\s*(?:antara|tribunkaltara|korankaltara|radartarakan|benuanta|pemkab tana tidung|bps)/i,
  /^video\s+terkait\s*:/i,
  /^baca\s+juga\s+artikel\s+/i,
  /^simak\s+video\b/i,
  /^tonton\s+video\b/i,
  /^klik\s+(?:di\s+sini|tautan|link)\b/i,
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
    const isExclamationOrQuestion = ch === '!' || ch === '?';
    const isSentenceDot =
      ch === '.' &&
      !(i > 0 && /\d/.test(candidate[i - 1] ?? '') && i + 1 < candidate.length && /\d/.test(candidate[i + 1] ?? ''));

    if (isExclamationOrQuestion || isSentenceDot) {
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
 * Mengakumulasi teks naskah artikel utuh yang bersih secara lengkap tanpa memotong paksa di 300 kata,
 * menapis seluruh iklan sampah, paragraf noise, serta menjaga batas aman DoS memori.
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

    const joinedSoFar = accumulated.length > 0 ? `${accumulated.join('\n\n')}\n\n${p}` : p;

    // Batas pengaman DoS ekstrem (25.000 kata / 180.000 karakter)
    if (
      runningWords + pWords > EXTRACTOR_MAX_WORDS ||
      joinedSoFar.length > EXTRACTOR_MAX_CHARS
    ) {
      const trimmed = trimToWordAndCharBudget(
        joinedSoFar,
        EXTRACTOR_MAX_WORDS,
        EXTRACTOR_MAX_CHARS,
        EXTRACTOR_MIN_VALID_WORDS,
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
  const wordCount = countWords(combined);

  return {
    snippetText: combined,
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

/**
 * Menormalkan URL artikel multi-halaman agar langsung meminta halaman utuh (mis. ?page=all untuk Tribun Network).
 */
export function normalizeToFullPageArticleUrl(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.toLowerCase();
    // Tribun Network: ?page=all
    if (host === 'tribunnews.com' || host.endsWith('.tribunnews.com')) {
      if (parsed.searchParams.get('page') !== 'all') {
        parsed.searchParams.set('page', 'all');
        return parsed.toString();
      }
    }
    // Detik Network (detikFinance, detikNews, dll.): ?single=1
    if (host === 'detik.com' || host.endsWith('.detik.com')) {
      if (parsed.searchParams.get('single') !== '1') {
        parsed.searchParams.set('single', '1');
        return parsed.toString();
      }
    }
    // Kompas: ?page=all
    if (host === 'kompas.com' || host.endsWith('.kompas.com')) {
      if (parsed.searchParams.get('page') !== 'all') {
        parsed.searchParams.set('page', 'all');
        return parsed.toString();
      }
    }
    // Tempo: ?page=all
    if (host === 'tempo.co' || host.endsWith('.tempo.co')) {
      if (parsed.searchParams.get('page') !== 'all') {
        parsed.searchParams.set('page', 'all');
        return parsed.toString();
      }
    }
    // Sindonews: ?showpage=all
    if (host === 'sindonews.com' || host.endsWith('.sindonews.com')) {
      if (parsed.searchParams.get('showpage') !== 'all') {
        parsed.searchParams.set('showpage', 'all');
        return parsed.toString();
      }
    }
    // Jawa Pos Network (Radar Tarakan, Pro Kaltara, dll.): ?page=all
    if (host === 'jawapos.com' || host.endsWith('.jawapos.com')) {
      if (parsed.searchParams.get('page') !== 'all') {
        parsed.searchParams.set('page', 'all');
        return parsed.toString();
      }
    }
    return rawUrl;
  } catch {
    return rawUrl;
  }
}

function extractCleanTitle($: CheerioAPI): string {
  const rawTitle =
    $('meta[property="og:title"]').attr('content') ||
    $('h1').first().text() ||
    $('title').first().text() ||
    '';

  return cleanText(rawTitle)
    .replace(
      /\s*[-|–]\s*(?:Tribun\s*Kaltara|Tribunkaltara\.com|Koran\s*Kaltara|Benuanta|Radar\s*Tarakan|Jawa\s*Pos|Antara\s*Kaltara|Antara\s*News|Fokus\s*Borneo|Niaga\.Asia|Pro\s*Kaltara|Pemkab\s*Tana\s*Tidung|Pemprov\s*Kaltara).*$/i,
      '',
    )
    .trim();
}

export interface ExtractedArticleContent {
  title: string;
  publishedAt: Date | null;
  snippetText: string;
  wordCount: number;
  isValidContent: boolean;
  canonicalUrl: string | null;
  isSoftBlocked: boolean;
  nextFullPageUrl: string | null;
}

/**
 * Mendeteksi halaman soft-block anti-bot (HTTP 200 Cloudflare challenge, browser check, captcha, access denied)
 * agar konten sampah tantangan keamanan tidak masuk sebagai teks artikel atau klaim non-ekonomi palsu.
 */
export function detectSoftBlockPage(html: string): { isSoftBlocked: boolean; reason: string | null } {
  const raw = html.trim();
  if (!raw) {
    return { isSoftBlocked: false, reason: null };
  }

  const titleMatch = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(raw);
  const titleText = cleanText(titleMatch?.[1] ?? '');

  if (
    /lsrecaptcha|id=["']lsrecaptcha-form["']|\/\.lsrecap\/recaptcha/i.test(raw)
  ) {
    return { isSoftBlocked: true, reason: 'Terdeteksi gerbang verifikasi bot LiteSpeed / reCAPTCHA.' };
  }

  if (
    /^(?:Just a moment\.\.\.|Attention Required!\s*\|\s*Cloudflare|Access Denied|Security Check|One more step|Bot Verification)$/i.test(
      titleText,
    )
  ) {
    return { isSoftBlocked: true, reason: `Judul halaman tantangan anti-bot: "${titleText}"` };
  }

  if (
    /id=["']cf-browser-verification["']|class=["'][^"']*\bcf-(?:error-details|challenge)\b/i.test(
      raw,
    ) ||
    (/\/cdn-cgi\/challenge-platform/i.test(raw) && raw.length < 35_000)
  ) {
    return { isSoftBlocked: true, reason: 'Terdeteksi halaman verifikasi browser Cloudflare.' };
  }

  const hasCheckingConn = /Checking if the site connection is secure/i.test(raw);
  const hasEnableJs = /Enable JavaScript and cookies to continue/i.test(raw);
  if (hasCheckingConn || (hasEnableJs && raw.length < 25_000)) {
    return {
      isSoftBlocked: true,
      reason: 'Halaman meminta verifikasi keamanan JavaScript & cookie (soft-block HTTP 200).',
    };
  }

  const hasHumanVerify =
    /Verifying you are human|Verifying that you are not a robot|Please turn JavaScript on and reload the page/i.test(raw);
  if (hasHumanVerify) {
    const plainBodyWords = countWords(raw.replace(/<[^>]+>/g, ' '));
    if (plainBodyWords < 160) {
      return {
        isSoftBlocked: true,
        reason: 'Halaman terdeteksi sebagai gerbang verifikasi manusia / anti-bot.',
      };
    }
  }

  return { isSoftBlocked: false, reason: null };
}

function findArticleBodyInJsonLd($: CheerioAPI): string | null {
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
        if (typeof record.articleBody === 'string' && countWords(record.articleBody) >= 20) {
          return record.articleBody;
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

/**
 * Mengekstrak teks lengkap artikel dari variabel inline script `var rawText = "..."`
 * yang disediakan oleh CMS Tribun Network untuk keyword brand safety. Variabel ini memuat
 * SELURUH teks artikel dari halaman 1 sampai halaman terakhir dalam satu string utuh.
 */
function findTribunRawTextInScripts($: CheerioAPI): string | null {
  const scripts = $('script:not([src])');
  for (let i = 0; i < scripts.length; i += 1) {
    const content = scripts.eq(i).html() || '';
    if (!content.includes('var rawText =')) continue;

    const match = /var\s+rawText\s*=\s*"([^"]+)";/s.exec(content);
    if (!match || !match[1]) continue;

    try {
      // Unescape unicode escape sequences seperti \u00a0, \/, dll.
      const unescaped = JSON.parse(`"${match[1]}"`) as string;
      // Bersihkan pengantar ringkasan berita, iklan, dan metadata penulis
      const cleaned = unescaped
        .replace(/^Ringkasan\s+Berita\s*:.*?(?=(?:TRIBUNKALTARA|[A-Z]{3,}\.COM|[A-Z\s,–-]+-))/is, '')
        .replace(/Baca\s+juga\s*:[^\r\n]*/gi, '')
        .replace(/Rekomendasi\s+Untuk\s+Anda|ADVERTISEMENT|SCROLL\s+TO\s+CONTINUE\s+WITH\s+CONTENT/gi, '')
        .replace(/Penulis\s*:[^\r\n]*/gi, '')
        .replace(/Editor\s*:[^\r\n]*/gi, '')
        .replace(/\(\*\)/g, '')
        .replace(/\u00a0/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

      if (countWords(cleaned) >= EXTRACTOR_MIN_VALID_WORDS) {
        return cleaned;
      }
    } catch {
      // Abaikan jika parsing gagal
    }
  }
  return null;
}

/**
 * Memastikan bahwa kandidat link paginasi benar-benar mengarah ke halaman berikutnya
 * dari artikel yang SAMA (bukan navigasi ke postingan/berita lain seperti rel="next" WordPress).
 */
export function isSameArticlePaginationUrl(
  baseUrl: string | null | undefined,
  candidateUrl: string | null | undefined,
): boolean {
  if (!baseUrl || !candidateUrl) return false;
  try {
    const base = new URL(baseUrl);
    const candidate = new URL(candidateUrl);

    // Host domain harus sama persis
    const baseHost = base.hostname.toLowerCase().replace(/^www\./, '');
    const candHost = candidate.hostname.toLowerCase().replace(/^www\./, '');
    if (baseHost !== candHost) return false;

    // Normalisasi pathname
    const basePath = base.pathname.replace(/\/+$/, '').toLowerCase();
    const candPath = candidate.pathname.replace(/\/+$/, '').toLowerCase();

    // 1. Pathname persis sama dan memiliki query param paginasi internal (?page=, ?p=, ?paged=, ?single=, ?show=, dll)
    if (basePath === candPath) {
      const pageQuery =
        candidate.searchParams.get('page') ||
        candidate.searchParams.get('p') ||
        candidate.searchParams.get('paged') ||
        candidate.searchParams.get('single') ||
        candidate.searchParams.get('show') ||
        candidate.searchParams.get('showpage');
      return Boolean(pageQuery);
    }

    // 2. Candidate pathname merupakan ekstensi numerik halaman dari base pathname
    // Contoh: basePath = /2026/03/berita-ktt, candPath = /2026/03/berita-ktt/2 atau /2026/03/berita-ktt/page/2
    if (candPath.startsWith(basePath)) {
      const remainder = candPath.slice(basePath.length);
      if (/^\/(?:page\/|part\/)?\d+$/i.test(remainder)) {
        return true;
      }
    }

    return false;
  } catch {
    return false;
  }
}

export function extractNextFullPageUrl(
  $: CheerioAPI,
  baseUrl?: string | null,
  canonicalUrl?: string | null,
): string | null {
  const referenceBase = baseUrl || canonicalUrl || undefined;

  const resolveAnchorHref = (rawHref: string | undefined): string | null => {
    const trimmed = rawHref?.trim();
    if (!trimmed || trimmed.startsWith('#') || /^javascript:/i.test(trimmed)) return null;
    try {
      const resolved = referenceBase ? new URL(trimmed, referenceBase) : new URL(trimmed);
      if (resolved.protocol !== 'http:' && resolved.protocol !== 'https:') {
        return null;
      }
      if (baseUrl && resolved.toString() === baseUrl) {
        return null;
      }
      const resolvedStr = resolved.toString();
      // Safeguard: Wajib validasi isSameArticlePaginationUrl jika referenceBase tersedia
      if (referenceBase && !isSameArticlePaginationUrl(referenceBase, resolvedStr)) {
        return null;
      }
      return resolvedStr;
    } catch {
      return null;
    }
  };

  const explicitSelectors = [
    'a[href*="page=all"]',
    'a[href*="show=all"]',
    'a[href*="showpage=all"]',
    'a[href*="single=1"]',
    '.paging a[href*="all"]',
    '.pagination a[href*="all"]',
    '.paging a.next',
    '.page-numbers a.next',
    '.pagination a.next',
    'a.page-link[rel="next"]',
  ];
  for (const sel of explicitSelectors) {
    const href = $(sel).first().attr('href');
    const resolved = resolveAnchorHref(href);
    if (resolved) return resolved;
  }

  let matchedByLabel: string | null = null;
  $('a[href]').each((_idx, el) => {
    if (matchedByLabel) return;
    const anchor = $(el);
    const label = cleanText(anchor.text());
    if (
      /^(?:tampilkan\s+semua|baca\s+selengkapnya\s*\(semua\)|lihat\s+semua\s+halaman|halaman\s+selanjutnya|selanjutnya|next(?:\s+page)?)$/i.test(
        label,
      )
    ) {
      const resolved = resolveAnchorHref(anchor.attr('href'));
      if (resolved) {
        matchedByLabel = resolved;
      }
    }
  });

  return matchedByLabel;
}

/**
 * Mengekstrak judul, tanggal rilis, dan 150-250 kata pertama yang bersih dari dokumen HTML portal berita,
 * memprioritaskan JSON-LD `articleBody`, mendeteksi soft-block anti-bot, serta mengekstrak link `?page=all`.
 */
export function extractArticleContent(
  html: string,
  fallbackPublishedAt?: Date | null,
  baseUrl?: string | null,
): ExtractedArticleContent {
  const $ = load(html);

  // Ambil metadata tanggal, judul, & canonical sebelum membersihkan DOM
  const title = extractCleanTitle($);
  const publishedAt = extractPublishedDate($) ?? fallbackPublishedAt ?? null;
  const canonicalUrl = $('link[rel="canonical"]').attr('href')?.trim() ?? null;

  const softBlock = detectSoftBlockPage(html);
  if (softBlock.isSoftBlocked) {
    return {
      title,
      publishedAt,
      snippetText: '',
      wordCount: 0,
      isValidContent: false,
      canonicalUrl,
      isSoftBlocked: true,
      nextFullPageUrl: null,
    };
  }

  const nextFullPageUrl = extractNextFullPageUrl($, baseUrl, canonicalUrl);
  const rawScriptBody = findTribunRawTextInScripts($);
  const rawScriptResult = rawScriptBody
    ? accumulateParagraphsToThreshold(rawScriptBody.split(/\r?\n+/))
    : null;

  const jsonLdArticleBody = findArticleBodyInJsonLd($);
  const jsonLdResult = jsonLdArticleBody
    ? accumulateParagraphsToThreshold(jsonLdArticleBody.split(/\r?\n+/))
    : null;

  // Bersihkan seluruh elemen pengganggu
  $(NOISE_ELEMENT_SELECTORS).remove();

  // Scrapling Pattern Layer 2 & 3: Adaptive Container Scoring dengan penalti kepadatan link
  let bestContainer = $('body' as string);
  let bestScore = -1;

  for (const selector of CONTENT_CONTAINER_SELECTORS) {
    const candidates = $(selector);
    for (let i = 0; i < Math.min(candidates.length, 3); i += 1) {
      const candidate = candidates.eq(i);
      const rawCandidateText = candidate.text();
      const words = countWords(rawCandidateText);
      if (words < EXTRACTOR_MIN_VALID_WORDS) continue;

      let linkChars = 0;
      candidate.find('a').each((_aIdx, aEl) => {
        linkChars += $(aEl).text().trim().length;
      });
      const totalChars = Math.max(1, rawCandidateText.trim().length);
      const linkDensity = Math.min(1, linkChars / totalChars);
      const pCount = candidate.find('p').length;

      // Skor tinggi untuk teks padat non-link dan memiliki struktur paragraf <p>
      const score = words * (1 - linkDensity) + (pCount * 12);
      if (score > bestScore) {
        bestScore = score;
        bestContainer = candidate;
      }
    }
  }

  // Adaptive Paragraph Parent Clustering Fallback bila selector CSS tema standar gagal
  if (bestScore <= 0) {
    let topParent: ReturnType<typeof $> | null = null;
    let topParentPCount = 0;
    $('article, main, div').each((_dIdx, dEl) => {
      const el = $(dEl);
      const directOrNearP = el.find('p').length;
      if (directOrNearP >= 3 && directOrNearP > topParentPCount) {
        const words = countWords(el.text());
        if (words >= EXTRACTOR_MIN_VALID_WORDS) {
          topParentPCount = directOrNearP;
          topParent = el;
        }
      }
    });
    if (topParent) {
      bestContainer = topParent;
    }
  }

  const container = bestContainer;

  // Konversi tag <br> menjadi pemisah baris ganda agar konten berbasis div / br (misal Radar Tarakan / Pemkab KTT)
  // dapat diekstrak menjadi beberapa baris kalimat terpisah
  container.find('br').replaceWith('\n\n');

  const paragraphs: string[] = [];
  container.find('p').each((_idx, el) => {
    const text = cleanText($(el).text());
    if (text) {
      paragraphs.push(text);
    }
  });

  // Fallback jika portal jarang memakai <p> (mis. memisahkan baris dengan <br> atau <div>)
  let domResult = accumulateParagraphsToThreshold(paragraphs);
  if (!domResult.isValidContent) {
    const fallbackLines = container
      .text()
      .split(/\r?\n+/)
      .map(cleanText)
      .filter((line) => line.length >= 20 && !isPureDatelineOrNoiseParagraph(line));
    const fallbackResult = accumulateParagraphsToThreshold(fallbackLines);
    if (fallbackResult.wordCount > domResult.wordCount) {
      domResult = fallbackResult;
    }
  }

  // Prioritaskan hasil yang memiliki kelengkapan kata paling utuh dan bersih.
  // 1. Script inline rawText Tribun (multi-page utuh) bila tersedia dan valid
  // 2. JSON-LD bila valid dan lebih kaya dari DOM
  // 3. DOM paragraf artikel
  let finalResult = domResult;
  if (jsonLdResult && jsonLdResult.isValidContent && (!finalResult.isValidContent || jsonLdResult.wordCount > finalResult.wordCount)) {
    finalResult = jsonLdResult;
  }
  if (rawScriptResult && rawScriptResult.isValidContent && (!finalResult.isValidContent || rawScriptResult.wordCount > finalResult.wordCount)) {
    finalResult = rawScriptResult;
  }

  return {
    title,
    publishedAt,
    snippetText: finalResult.snippetText,
    wordCount: finalResult.wordCount,
    isValidContent: finalResult.isValidContent,
    canonicalUrl,
    isSoftBlocked: false,
    nextFullPageUrl,
  };
}

