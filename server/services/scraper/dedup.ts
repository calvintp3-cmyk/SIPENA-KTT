// server/services/scraper/dedup.ts
import { ArticleSourceTypeEnum } from '../../../shared/enums/pdrb';
import type { DiscoveredArticleCandidate } from './portals';

export const DEFAULT_TITLE_SIMILARITY_THRESHOLD = 0.72;
export const DEFAULT_DB_DEDUP_LOOKBACK_DAYS = 10;

const INDONESIAN_DEDUP_STOPWORDS = new Set([
  'yang',
  'dan',
  'di',
  'ke',
  'dari',
  'untuk',
  'pada',
  'dengan',
  'ini',
  'itu',
  'akan',
  'dalam',
  'oleh',
  'atau',
  'saat',
  'juga',
  'telah',
  'sudah',
  'sebagai',
  'agar',
  'karena',
  'hingga',
  'sampai',
  'bagi',
  'tahun',
  'bulan',
  'hari',
  'pekan',
  'minggu',
  'persen',
  'juta',
  'miliar',
  'triliun',
  'ribu',
  'rp',
  'pt',
  'cv',
  'kabupaten',
  'kota',
  'provinsi',
  'gelar',
  'lakukan',
  'terjadi',
]);

const DISTINCT_NUMBER_RE = /^\d{2,}$/;

function stripMediaSuffixForDedup(rawTitle: string): string {
  const cleaned = rawTitle.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  const dashIdx = cleaned.lastIndexOf(' - ');
  if (dashIdx > 20 && cleaned.length - dashIdx <= 45) {
    return cleaned.slice(0, dashIdx).trim();
  }
  const pipeIdx = cleaned.lastIndexOf(' | ');
  if (pipeIdx > 20 && cleaned.length - pipeIdx <= 45) {
    return cleaned.slice(0, pipeIdx).trim();
  }
  return cleaned;
}

export function tokenizeTitleForDedup(rawTitle: string): Set<string> {
  const stripped = stripMediaSuffixForDedup(rawTitle).toLowerCase();
  const rawTokens = stripped
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const tokens = new Set<string>();
  for (const tok of rawTokens) {
    if (tok.length <= 1) continue;
    if (INDONESIAN_DEDUP_STOPWORDS.has(tok)) continue;
    tokens.add(tok);
  }
  return tokens;
}

function isYearToken(tok: string): boolean {
  return /^(?:19|20)\d{2}$/.test(tok);
}

/**
 * Mengukur kemiripan semantik permukaan antara dua judul berita (0.0 s.d. 1.0)
 * menggunakan kombinasi Jaccard + Containment pada token inti & entitas angka.
 */
export function computeTitleSimilarity(titleA: string, titleB: string): number {
  const tokensA = tokenizeTitleForDedup(titleA);
  const tokensB = tokenizeTitleForDedup(titleB);

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const tok of tokensA) {
    if (tokensB.has(tok)) {
      intersection += 1;
    }
  }

  if (intersection < 3) return 0;

  // Jika keduanya membawa angka besaran berbeda (bukan angka tahun), jangan gabungkan sebagai duplikat
  const numsA = Array.from(tokensA).filter((t) => DISTINCT_NUMBER_RE.test(t) && !isYearToken(t));
  const numsB = Array.from(tokensB).filter((t) => DISTINCT_NUMBER_RE.test(t) && !isYearToken(t));
  if (numsA.length > 0 && numsB.length > 0) {
    const sharesAnyNumber = numsA.some((n) => numsB.includes(n));
    if (!sharesAnyNumber) return 0;
  }

  const union = tokensA.size + tokensB.size - intersection;
  const jaccard = union > 0 ? intersection / union : 0;
  const minSize = Math.min(tokensA.size, tokensB.size);
  const containment = minSize > 0 ? intersection / minSize : 0;

  return 0.35 * jaccard + 0.65 * containment;
}

function isGoogleWrapperCandidateUrl(rawUrl: string): boolean {
  try {
    const hostname = new URL(rawUrl).hostname.toLowerCase();
    return hostname === 'news.google.com' || hostname.endsWith('.google.com');
  } catch {
    return false;
  }
}

export function getCandidateSourcePriority(candidate: DiscoveredArticleCandidate): number {
  if (candidate.sourceType === ArticleSourceTypeEnum.REGIONAL) return 300;
  if (!isGoogleWrapperCandidateUrl(candidate.url)) return 200;
  return 100;
}

/**
 * Menyaring duplikasi judul peristiwa lintas sumber dan terhadap riwayat DB 10 hari terakhir.
 * Saat dua sumber memberitakan peristiwa yang sama, kandidat bersumber lebih baik (REGIONAL > penerbit langsung > Google wrapper)
 * selalu dipertahankan.
 */
export function deduplicateCandidatesByTitle(
  candidates: ReadonlyArray<DiscoveredArticleCandidate>,
  historicalTitles: ReadonlyArray<string> = [],
  threshold: number = DEFAULT_TITLE_SIMILARITY_THRESHOLD,
): {
  uniqueCandidates: DiscoveredArticleCandidate[];
  deduplicatedCount: number;
} {
  // Urutkan kandidat terbaik terlebih dahulu agar sumber unggulan menang saat kolisi judul
  const ordered = [...candidates].sort((a, b) => {
    const prioDiff = getCandidateSourcePriority(b) - getCandidateSourcePriority(a);
    if (prioDiff !== 0) return prioDiff;
    const timeA = a.publishedHint?.getTime() ?? 0;
    const timeB = b.publishedHint?.getTime() ?? 0;
    return timeB - timeA;
  });

  const kept: DiscoveredArticleCandidate[] = [];
  let deduplicatedCount = 0;

  for (const candidate of ordered) {
    const matchedHistorical = historicalTitles.some(
      (histTitle) => computeTitleSimilarity(candidate.title, histTitle) >= threshold,
    );
    if (matchedHistorical) {
      deduplicatedCount += 1;
      continue;
    }

    const matchedAccepted = kept.some(
      (accepted) => computeTitleSimilarity(candidate.title, accepted.title) >= threshold,
    );
    if (matchedAccepted) {
      deduplicatedCount += 1;
      continue;
    }

    kept.push(candidate);
  }

  return {
    uniqueCandidates: kept,
    deduplicatedCount,
  };
}

