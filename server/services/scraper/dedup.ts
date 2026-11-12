// server/services/scraper/dedup.ts
import { ArticleSourceTypeEnum } from '../../../shared/enums/pdrb';
import type { DiscoveredArticleCandidate } from './portals';

export const DEFAULT_TITLE_SIMILARITY_THRESHOLD = 0.72;
export const DEFAULT_SEMANTIC_SIMILARITY_THRESHOLD = 0.85;
export const DEFAULT_DB_DEDUP_LOOKBACK_DAYS = 10;

const CANONICAL_PHRASE_REPLACEMENTS: Array<[RegExp, string]> = [
  [/\btandan\s+buah\s+segar\b/g, 'tbs'],
  [/\bkabupaten\s+tana\s+tidung\b/g, 'ktt'],
  [/\btana\s+tidung\b/g, 'ktt'],
  [/\bpemerintah\s+(?:kabupaten|daerah)\b/g, 'pemkab'],
  [/\bpemda\b/g, 'pemkab'],
  [/\bpabrik\s+kelapa\s+sawit\b/g, 'pks'],
  [/\bharga\s+batubara\s+acuan\b/g, 'hba'],
  [/\bsubsidi\s+ongkos\s+angkut\b/g, 'soa'],
  [/\bproduk\s+domestik\s+regional\s+bruto\b/g, 'pdrb'],
  [/\brumah\s+sakit\s+umum\s+daerah\b/g, 'rsud'],
  [/\bkalimantan\s+utara\b/g, 'kaltara'],
  [/\bkalimantan\s+timur\b/g, 'kaltim'],
];

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

const DISTINCT_NUMBER_RE = /^\d+$/;

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
  let stripped = stripMediaSuffixForDedup(rawTitle).toLowerCase();
  // Satukan pemisah ribuan titik pada angka Indonesia (mis. "2.980" -> "2980")
  stripped = stripped.replace(/(\d)\.(\d{3})(?!\d)/g, '$1$2');
  for (const [pattern, replacement] of CANONICAL_PHRASE_REPLACEMENTS) {
    stripped = stripped.replace(pattern, replacement);
  }

  const rawTokens = stripped
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const tokens = new Set<string>();
  for (const tok of rawTokens) {
    if (tok.length <= 1 && !/^\d$/.test(tok)) continue;
    if (INDONESIAN_DEDUP_STOPWORDS.has(tok)) continue;
    tokens.add(tok);
  }
  return tokens;
}

function isYearToken(tok: string): boolean {
  return /^(?:19|20)\d{2}$/.test(tok);
}

function extractDistinctMagnitudeNumbers(tokens: Set<string>): string[] {
  return Array.from(tokens)
    .filter((t) => DISTINCT_NUMBER_RE.test(t) && !isYearToken(t))
    .sort();
}

function hasSemanticNumericMismatch(titleA: string, titleB: string): boolean {
  const numsA = extractDistinctMagnitudeNumbers(tokenizeTitleForDedup(titleA));
  const numsB = extractDistinctMagnitudeNumbers(tokenizeTitleForDedup(titleB));
  if (numsA.length === 0 && numsB.length === 0) return false;
  if (numsA.length !== numsB.length) return true;
  return numsA.some((val, idx) => numsB[idx] !== val);
}

/**
 * Menghitung cosine similarity antara dua vektor embedding [0..1 / -1..1].
 */
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i += 1) {
    const va = a[i] ?? 0;
    const vb = b[i] ?? 0;
    dot += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  if (normA <= 0 || normB <= 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export interface SemanticHistoricalTitleItem {
  title: string;
  titleEmbedding?: number[] | null;
}

export interface SemanticDedupOptions {
  historicalItems?: ReadonlyArray<SemanticHistoricalTitleItem>;
  lexicalThreshold?: number;
  semanticThreshold?: number;
  embedFn?: (texts: string[]) => Promise<Array<number[] | null>>;
}

export interface SemanticDedupResult {
  uniqueCandidates: DiscoveredArticleCandidate[];
  deduplicatedCount: number;
  semanticDeduplicatedCount: number;
  embeddingsByUrlHash: Map<string, number[]>;
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

  // Jika keduanya membawa angka besaran/tahapan berbeda (bukan angka tahun), jangan gabungkan sebagai duplikat
  const numsA = extractDistinctMagnitudeNumbers(tokensA);
  const numsB = extractDistinctMagnitudeNumbers(tokensB);
  if (numsA.length > 0 && numsB.length > 0) {
    const identicalNumbers =
      numsA.length === numsB.length && numsA.every((n, i) => numsB[i] === n);
    if (!identicalNumbers) return 0;
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

/**
 * Deduplikasi dua tahap:
 * 1) Stage-1 Lexical Jaccard/Containment dengan kanonisasi akronim/sinonim ekonomi KTT + numeric guard.
 * 2) Stage-2 Semantic Embedding Tie-Breaker (`cosine >= 0.85`) untuk judul parafrase lintas portal,
 *    tetap tunduk pada numeric discrepancy guard agar angka anggaran/harga berbeda tidak tergencet.
 */
export async function deduplicateCandidatesWithSemantics(
  candidates: ReadonlyArray<DiscoveredArticleCandidate>,
  options: SemanticDedupOptions = {},
): Promise<SemanticDedupResult> {
  const historicalItems = options.historicalItems ?? [];
  const lexicalThreshold = options.lexicalThreshold ?? DEFAULT_TITLE_SIMILARITY_THRESHOLD;
  const semanticThreshold = options.semanticThreshold ?? DEFAULT_SEMANTIC_SIMILARITY_THRESHOLD;

  const lexicalStage = deduplicateCandidatesByTitle(
    candidates,
    historicalItems.map((h) => h.title),
    lexicalThreshold,
  );

  const embeddingsByUrlHash = new Map<string, number[]>();
  const embedFn = options.embedFn;

  if (!embedFn || lexicalStage.uniqueCandidates.length === 0) {
    return {
      uniqueCandidates: lexicalStage.uniqueCandidates,
      deduplicatedCount: lexicalStage.deduplicatedCount,
      semanticDeduplicatedCount: 0,
      embeddingsByUrlHash,
    };
  }

  let candidateVectors: Array<number[] | null> = [];
  try {
    candidateVectors = await embedFn(lexicalStage.uniqueCandidates.map((c) => c.title));
  } catch {
    return {
      uniqueCandidates: lexicalStage.uniqueCandidates,
      deduplicatedCount: lexicalStage.deduplicatedCount,
      semanticDeduplicatedCount: 0,
      embeddingsByUrlHash,
    };
  }

  const historicalWithVec = historicalItems.filter(
    (h): h is { title: string; titleEmbedding: number[] } =>
      Array.isArray(h.titleEmbedding) && h.titleEmbedding.length > 0,
  );

  const kept: DiscoveredArticleCandidate[] = [];
  const keptVectors: Array<{ candidate: DiscoveredArticleCandidate; vec: number[] | null }> = [];
  let semanticDeduplicatedCount = 0;

  for (let i = 0; i < lexicalStage.uniqueCandidates.length; i += 1) {
    const candidate = lexicalStage.uniqueCandidates[i]!;
    const rawVec = candidateVectors[i];
    const vec = Array.isArray(rawVec) && rawVec.length > 0 ? rawVec : null;

    let isSemanticDup = false;
    if (vec) {
      isSemanticDup = historicalWithVec.some(
        (hist) =>
          !hasSemanticNumericMismatch(candidate.title, hist.title) &&
          cosineSimilarity(vec, hist.titleEmbedding) >= semanticThreshold,
      );

      if (!isSemanticDup) {
        isSemanticDup = keptVectors.some(
          (prev) =>
            prev.vec !== null &&
            !hasSemanticNumericMismatch(candidate.title, prev.candidate.title) &&
            cosineSimilarity(vec, prev.vec) >= semanticThreshold,
        );
      }
    }

    if (isSemanticDup) {
      semanticDeduplicatedCount += 1;
      continue;
    }

    if (vec) {
      embeddingsByUrlHash.set(candidate.urlHash, vec);
    }
    kept.push(candidate);
    keptVectors.push({ candidate, vec });
  }

  return {
    uniqueCandidates: kept,
    deduplicatedCount: lexicalStage.deduplicatedCount + semanticDeduplicatedCount,
    semanticDeduplicatedCount,
    embeddingsByUrlHash,
  };
}

