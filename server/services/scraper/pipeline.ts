// server/services/scraper/pipeline.ts
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import {
  ArticleSourceTypeEnum,
  LlmStatusEnum,
  ScraperRunStatusEnum,
  ScraperRunTypeEnum,
  VerificationStatusEnum,
} from '../../../shared/enums/pdrb';
import { formatDateTimeWita, getQuarterFromDateWita } from '../../../shared/utils/period';
import { db, pool } from '../../db';
import {
  articles,
  scraperLogs,
  type ScraperPortalErrorEntry,
  type ScraperProviderStatEntry,
} from '../../db/schema';
import { DEFAULT_SCRAPER_CONCURRENCY, runWithConcurrency } from '../../utils/concurrency';
import {
  DEFAULT_BROWSER_HEADERS,
  DEFAULT_BROWSER_USER_AGENT,
  DEFAULT_FETCH_TIMEOUT_MS,
  safeFetchText,
  type SafeFetchOptions,
} from '../../utils/ssrf';
import { extractHostnameLabel, hashNormalizedUrl, isSafeHttpUrl } from '../../utils/url-hash';
import { mapClassificationToPersistence } from '../llm/classifier';
import { GeminiClassificationWorker, type GeminiWorkerOptions } from '../llm/gemini-client';
import { embedTextsWithGemini, MultiLlmRouter, type MultiLlmRouterOptions } from '../llm/router';
import {
  DEFAULT_DB_DEDUP_LOOKBACK_DAYS,
  deduplicateCandidatesWithSemantics,
  getCandidateSourcePriority,
  type SemanticHistoricalTitleItem,
} from './dedup';
import { extractArticleContent } from './extractor';
import { evaluateGeographicRelevance } from './geo-filter';
import {
  DEFAULT_GOOGLE_NEWS_DECODE_CAP_PER_RUN,
  DEFAULT_GOOGLE_NEWS_DECODE_DELAY_MS,
  decodeGoogleNewsUrlFromHtml,
  extractGoogleNewsDecodeParams,
} from './google-news-decoder';
import {
  buildNationalFallbackSnippet,
  extractRedirectTargetFromGoogleHtml,
  harvestNationalKeywords,
  type ActiveKeywordTarget,
} from './national';
import {
  DEFAULT_LOOKBACK_DAYS,
  getWitaLookbackCutoff,
  harvestRegionalPortals,
  isWithinLookbackWindow,
  type DiscoveredArticleCandidate,
  type RegionalPortalConfig,
} from './portals';
import { isHardNoiseTitleForNational } from './title-filter';

export const SCRAPER_ADVISORY_LOCK_KEY = 982451;
export const DEFAULT_MAX_RUN_DURATION_MS = 3 * 60 * 1000;
export const STALE_RUN_TIMEOUT_MS = 5 * 60 * 1000;
export const DEFAULT_FETCH_CONCURRENCY = DEFAULT_SCRAPER_CONCURRENCY;
export const DEFAULT_MAX_ARTICLES_PER_RUN = 35;
const CIRCUIT_BREAKER_CONSECUTIVE_429_THRESHOLD = 5;

export class ScrapeConflictError extends Error {
  readonly statusCode = 409;
  constructor(message = 'Proses crawling/klasifikasi lain masih berjalan. Harap tunggu hingga selesai.') {
    super(message);
    this.name = 'ScrapeConflictError';
  }
}

export type ScrapeRunMode = 'ALL' | 'REGIONAL_ONLY' | 'NATIONAL_ONLY';

export interface RunScrapePipelineParams {
  runType: ScraperRunTypeEnum;
  mode?: ScrapeRunMode;
  triggeredBy?: string | null;
  now?: Date;
  lookbackDays?: number;
  maxDurationMs?: number;
  maxArticlesPerRun?: number;
  fetchTimeoutMs?: number;
  fetchConcurrency?: number;
  enableGdeltMacro?: boolean;
  enableSemanticDedup?: boolean;
  embedFn?: (texts: string[]) => Promise<Array<number[] | null>>;
  portals?: ReadonlyArray<RegionalPortalConfig>;
  keywords?: ReadonlyArray<ActiveKeywordTarget>;
  fetchFn?: (url: string, options?: SafeFetchOptions) => Promise<{ finalUrl: string; body: string }>;
  workerOptions?: GeminiWorkerOptions;
  routerOptions?: MultiLlmRouterOptions;
}

export interface ScrapeRunSummary {
  logId: string;
  runType: ScraperRunTypeEnum;
  status: ScraperRunStatusEnum;
  portalsChecked: number;
  keywordsChecked: number;
  articlesFetched: number;
  articlesDeduplicated: number;
  articlesInserted: number;
  economicCount: number;
  nonEconomicCount: number;
  llmFailedCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  avgResponseTimeMs: number;
  durationMs: number;
  providerStats: Record<string, ScraperProviderStatEntry>;
  errors: ScraperPortalErrorEntry[];
}

export interface RetryLlmSummary {
  logId: string;
  status: ScraperRunStatusEnum;
  processedCount: number;
  succeededCount: number;
  economicCount: number;
  nonEconomicCount: number;
  failedCount: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  durationMs: number;
  providerStats: Record<string, ScraperProviderStatEntry>;
  errors: ScraperPortalErrorEntry[];
}

interface ExtractedReadyArticle {
  candidate: DiscoveredArticleCandidate;
  finalUrl: string;
  normalizedUrl: string;
  urlHash: string;
  sourcePortal: string;
  title: string;
  snippetText: string;
  wordCount: number;
  publishedAt: Date;
  titleEmbedding?: number[] | null;
}

function isSameDomainHost(urlA: string, urlB: string): boolean {
  try {
    const hostA = new URL(urlA).hostname.toLowerCase().replace(/^www\./, '');
    const hostB = new URL(urlB).hostname.toLowerCase().replace(/^www\./, '');
    return Boolean(hostA && hostA === hostB);
  } catch {
    return false;
  }
}

function resolveSameHostCanonicalUrl(canonicalRaw: string | null, currentFinalUrl: string): string {
  if (!canonicalRaw) return currentFinalUrl;
  try {
    const resolved = new URL(canonicalRaw, currentFinalUrl);
    const resolvedStr = resolved.toString();
    if (!isSafeHttpUrl(resolvedStr)) return currentFinalUrl;
    if (!isSameDomainHost(resolvedStr, currentFinalUrl)) return currentFinalUrl;
    if (resolved.pathname.length <= 1 && new URL(currentFinalUrl).pathname.length > 1) {
      return currentFinalUrl;
    }
    return resolvedStr;
  } catch {
    return currentFinalUrl;
  }
}

function isGoogleWrapperHost(rawUrl: string): boolean {
  try {
    const hostname = new URL(rawUrl).hostname.toLowerCase();
    return hostname === 'news.google.com' || hostname.endsWith('.google.com');
  } catch {
    return false;
  }
}

async function queryExistingHashes(hashes: string[]): Promise<Set<string>> {
  const existing = new Set<string>();
  if (hashes.length === 0) return existing;

  const CHUNK_SIZE = 200;
  for (let i = 0; i < hashes.length; i += CHUNK_SIZE) {
    const slice = hashes.slice(i, i + CHUNK_SIZE);
    const rows = await db
      .select({ urlHash: articles.urlHash })
      .from(articles)
      .where(inArray(articles.urlHash, slice));

    for (const row of rows) {
      existing.add(row.urlHash);
    }
  }

  return existing;
}

async function queryRecentArticleTitles(
  now: Date,
  lookbackDays: number = DEFAULT_DB_DEDUP_LOOKBACK_DAYS,
): Promise<SemanticHistoricalTitleItem[]> {
  try {
    const cutoff = getWitaLookbackCutoff(now, lookbackDays);
    const rows = await db
      .select({
        title: articles.title,
        titleEmbedding: articles.titleEmbedding,
      })
      .from(articles)
      .where(gte(articles.publishedAt, cutoff))
      .orderBy(desc(articles.publishedAt))
      .limit(1000);
    return rows.filter((r) => Boolean(r.title));
  } catch {
    return [];
  }
}

/**
 * Memulihkan baris log RUNNING yang tertinggal apabila advisory lock sudah tidak dipegang
 * (mis. akibat server restart, OOM kill, atau deployment ulang).
 */
async function recoverOrphanedRunningLogsInternal(
  reasonMessage: string,
  onlyOlderThanMs?: number,
): Promise<number> {
  const condition =
    onlyOlderThanMs !== undefined
      ? and(
          eq(scraperLogs.status, ScraperRunStatusEnum.RUNNING),
          lte(scraperLogs.startedAt, new Date(Date.now() - onlyOlderThanMs)),
        )
      : eq(scraperLogs.status, ScraperRunStatusEnum.RUNNING);

  const staleRows = await db.select().from(scraperLogs).where(condition);
  if (staleRows.length === 0) return 0;

  let recoveredCount = 0;
  for (const row of staleRows) {
    const [articleStats] = await db
      .select({
        insertedTotal: sql<number>`count(*)::int`,
        economicTotal: sql<number>`count(*) filter (where ${articles.isEconomicPhenomenon} = true)::int`,
        nonEconomicTotal: sql<number>`count(*) filter (where ${articles.isEconomicPhenomenon} = false)::int`,
        failedTotal: sql<number>`count(*) filter (where ${articles.llmStatus} = 'FAILED')::int`,
      })
      .from(articles)
      .where(eq(articles.scraperLogId, row.id));

    const insertedTotal = Math.max(row.articlesInserted, Number(articleStats?.insertedTotal ?? 0));
    const economicTotal = Math.max(row.economicCount, Number(articleStats?.economicTotal ?? 0));
    const nonEconomicTotal = Math.max(
      row.nonEconomicCount,
      Number(articleStats?.nonEconomicTotal ?? 0),
    );
    const failedTotal = Math.max(row.llmFailedCount, Number(articleStats?.failedTotal ?? 0));
    const resolvedStatus =
      insertedTotal > 0 || economicTotal > 0 || nonEconomicTotal > 0
        ? ScraperRunStatusEnum.PARTIAL
        : ScraperRunStatusEnum.FAILED;

    const existingErrors = Array.isArray(row.errorSummary) ? row.errorSummary : [];
    const nextErrors: ScraperPortalErrorEntry[] = [
      ...existingErrors.slice(0, 99),
      {
        source: 'system',
        stage: 'SYSTEM',
        message: reasonMessage,
      },
    ];

    const finishedAt = new Date();
    const durationMs = Math.max(0, finishedAt.getTime() - row.startedAt.getTime());

    await db
      .update(scraperLogs)
      .set({
        status: resolvedStatus,
        articlesInserted: insertedTotal,
        economicCount: economicTotal,
        nonEconomicCount: nonEconomicTotal,
        llmFailedCount: failedTotal,
        durationMs,
        errorSummary: nextErrors,
        finishedAt,
      })
      .where(and(eq(scraperLogs.id, row.id), eq(scraperLogs.status, ScraperRunStatusEnum.RUNNING)));

    recoveredCount += 1;
  }

  return recoveredCount;
}

/**
 * Membersihkan log RUNNING yatim secara aman menggunakan PostgreSQL Advisory Lock
 * (mis. dipanggil oleh Nitro plugin saat server startup).
 */
export async function recoverOrphanedRunningLogs(
  reasonMessage = 'Proses server dimulai ulang sebelum sesi crawler sebelumnya selesai.',
): Promise<number> {
  const lockClient = await pool.connect();
  let acquired = false;

  try {
    const lockRes = await lockClient.query<{ acquired: boolean }>(
      'SELECT pg_try_advisory_lock($1) AS acquired',
      [SCRAPER_ADVISORY_LOCK_KEY],
    );
    acquired = Boolean(lockRes.rows[0]?.acquired);
    if (!acquired) {
      return 0;
    }

    return await recoverOrphanedRunningLogsInternal(reasonMessage);
  } finally {
    if (acquired) {
      await lockClient
        .query('SELECT pg_advisory_unlock($1)', [SCRAPER_ADVISORY_LOCK_KEY])
        .catch(() => {});
    }
    lockClient.release();
  }
}

interface AcquiredScrapeLock {
  logId: string;
  releaseLock: () => Promise<void>;
}

async function acquireScrapeExecutionLock(
  runType: ScraperRunTypeEnum,
  triggeredBy: string | null = null,
): Promise<AcquiredScrapeLock> {
  const lockClient = await pool.connect();

  const unlockAndRelease = async () => {
    await lockClient
      .query('SELECT pg_advisory_unlock($1)', [SCRAPER_ADVISORY_LOCK_KEY])
      .catch(() => {});
    lockClient.release();
  };

  try {
    const lockRes = await lockClient.query<{ acquired: boolean }>(
      'SELECT pg_try_advisory_lock($1) AS acquired',
      [SCRAPER_ADVISORY_LOCK_KEY],
    );

    if (!lockRes.rows[0]?.acquired) {
      lockClient.release();
      throw new ScrapeConflictError();
    }

    await recoverOrphanedRunningLogsInternal(
      'Eksekusi sebelumnya berhenti tidak normal (restart/crash proses) dan dipulihkan otomatis.',
    );

    const [createdLog] = await db
      .insert(scraperLogs)
      .values({
        runType,
        status: ScraperRunStatusEnum.RUNNING,
        triggeredBy,
      })
      .returning({ id: scraperLogs.id });

    if (!createdLog) {
      throw new Error('[Scraper] Gagal membuat baris log awal di tabel scraper_logs.');
    }

    return {
      logId: createdLog.id,
      releaseLock: unlockAndRelease,
    };
  } catch (err) {
    await unlockAndRelease();
    throw err;
  }
}

function getEffectiveMaxArticlesPerRun(explicit?: number): number {
  if (explicit !== undefined && Number.isFinite(explicit) && explicit > 0) {
    return Math.floor(explicit);
  }
  const envVal = Number(process.env.SCRAPER_MAX_ARTICLES_PER_RUN);
  if (Number.isFinite(envVal) && envVal > 0) {
    return Math.floor(envVal);
  }
  return DEFAULT_MAX_ARTICLES_PER_RUN;
}

async function executeLockedScrapePipeline(
  logId: string,
  params: RunScrapePipelineParams,
): Promise<ScrapeRunSummary> {
  const startedAtMs = Date.now();
  const mode: ScrapeRunMode = params.mode ?? 'ALL';
  const now = params.now ?? new Date();
  const lookbackDays = params.lookbackDays ?? DEFAULT_LOOKBACK_DAYS;
  const fetchFn = params.fetchFn ?? safeFetchText;
  const fetchTimeoutMs = params.fetchTimeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const fetchConcurrency = params.fetchConcurrency ?? DEFAULT_FETCH_CONCURRENCY;
  const maxDurationMs = Math.max(50, params.maxDurationMs ?? DEFAULT_MAX_RUN_DURATION_MS);
  const maxArticlesPerRun = getEffectiveMaxArticlesPerRun(params.maxArticlesPerRun);
  const deadlineAtMs = startedAtMs + maxDurationMs;
  const cutoffDate = getWitaLookbackCutoff(now, lookbackDays);

  const pipelineController = new AbortController();
  let timedOut = false;
  const deadlineTimer = setTimeout(() => {
    timedOut = true;
    pipelineController.abort(
      new Error(`Batas waktu maksimal eksekusi (${Math.round(maxDurationMs / 1000)} detik) tercapai.`),
    );
  }, maxDurationMs);

  const hasRemainingBudget = (minMs: number = 0): boolean =>
    !timedOut && !pipelineController.signal.aborted && Date.now() + minMs < deadlineAtMs;

  let portalsChecked = 0;
  let keywordsChecked = 0;
  let articlesFetched = 0;
  let articlesDeduplicated = 0;
  let articlesInserted = 0;
  let economicCount = 0;
  let nonEconomicCount = 0;
  let llmFailedCount = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalTokens = 0;
  let totalResponseTimeMs = 0;
  let timedLlmCalls = 0;
  let finalized = false;

  const errors: ScraperPortalErrorEntry[] = [];

  const legacyWorker = params.workerOptions?.invokeFn
    ? new GeminiClassificationWorker(params.workerOptions)
    : null;
  const llmRouter = legacyWorker
    ? null
    : new MultiLlmRouter({
        task: 'classify',
        ...(params.routerOptions ?? {}),
      });

  const getCurrentProviderStats = (): Record<string, ScraperProviderStatEntry> =>
    llmRouter ? llmRouter.getProviderStats() : {};

  const persistLogSnapshot = async (status: ScraperRunStatusEnum, isFinal: boolean) => {
    const durationMs = Date.now() - startedAtMs;
    const avgResponseTimeMs = timedLlmCalls > 0 ? Math.round(totalResponseTimeMs / timedLlmCalls) : 0;

    await db
      .update(scraperLogs)
      .set({
        status,
        portalsChecked,
        keywordsChecked,
        articlesFetched,
        articlesDeduplicated,
        articlesInserted,
        economicCount,
        nonEconomicCount,
        llmFailedCount,
        totalInputTokens,
        totalOutputTokens,
        totalTokens,
        avgResponseTimeMs,
        durationMs,
        providerStats: getCurrentProviderStats(),
        errorSummary: errors.slice(0, 100),
        finishedAt: isFinal ? new Date() : null,
      })
      .where(eq(scraperLogs.id, logId));

    if (isFinal) {
      finalized = true;
    }
  };

  try {
    // -------------------------------------------------------------------------
    // Phase A: Link Discovery Paralel (RSS + HTML Regional + Keyword Nasional)
    // -------------------------------------------------------------------------
    const rawCandidates: DiscoveredArticleCandidate[] = [];

    const regionalPromise =
      mode === 'ALL' || mode === 'REGIONAL_ONLY'
        ? harvestRegionalPortals({
            portals: params.portals,
            fetchFn,
            now,
            lookbackDays,
            timeoutMs: fetchTimeoutMs,
            concurrency: fetchConcurrency,
            signal: pipelineController.signal,
          })
        : Promise.resolve(null);

    const nationalPromise =
      mode === 'ALL' || mode === 'NATIONAL_ONLY'
        ? harvestNationalKeywords({
            keywords: params.keywords,
            fetchFn,
            now,
            lookbackDays,
            timeoutMs: fetchTimeoutMs,
            concurrency: fetchConcurrency,
            signal: pipelineController.signal,
            enableGdeltMacro: params.enableGdeltMacro,
          })
        : Promise.resolve(null);

    const [regResult, natResult] = await Promise.all([regionalPromise, nationalPromise]);

    if (regResult) {
      portalsChecked = regResult.portalsChecked;
      rawCandidates.push(...regResult.candidates);
      errors.push(...regResult.errors);
    }

    if (natResult) {
      keywordsChecked = natResult.keywordsChecked;
      rawCandidates.push(...natResult.candidates);
      errors.push(...natResult.errors);
    }

    // Deduplikasi kandidat in-memory berdasarkan urlHash
    const uniqueUrlCandidates: DiscoveredArticleCandidate[] = [];
    const seenCandidateHashes = new Set<string>();
    for (const item of rawCandidates) {
      if (!seenCandidateHashes.has(item.urlHash)) {
        seenCandidateHashes.add(item.urlHash);
        uniqueUrlCandidates.push(item);
      }
    }

    articlesFetched = uniqueUrlCandidates.length;

    // -------------------------------------------------------------------------
    // Phase B: Hard-Noise Filter, DB URL Hash Dedup & Dedup 2-Tahap Lintas Sumber
    // -------------------------------------------------------------------------
    const noiseFilteredCandidates: DiscoveredArticleCandidate[] = [];
    for (const candidate of uniqueUrlCandidates) {
      if (
        candidate.sourceType === ArticleSourceTypeEnum.NATIONAL &&
        isHardNoiseTitleForNational(candidate.title)
      ) {
        articlesDeduplicated += 1;
        continue;
      }
      noiseFilteredCandidates.push(candidate);
    }

    const existingUrlHashes = await queryExistingHashes(
      noiseFilteredCandidates.map((c) => c.urlHash),
    );

    const hashFilteredCandidates: DiscoveredArticleCandidate[] = [];
    for (const candidate of noiseFilteredCandidates) {
      if (existingUrlHashes.has(candidate.urlHash)) {
        articlesDeduplicated += 1;
        continue;
      }
      hashFilteredCandidates.push(candidate);
    }

    const recentHistoricalItems = await queryRecentArticleTitles(
      now,
      DEFAULT_DB_DEDUP_LOOKBACK_DAYS,
    );
    const shouldUseLiveSemanticDedup =
      params.enableSemanticDedup ??
      (!params.fetchFn && !params.routerOptions?.invokeSlotFn && !legacyWorker);
    const effectiveEmbedFn =
      params.embedFn ??
      (shouldUseLiveSemanticDedup && hasRemainingBudget(3_000)
        ? (texts: string[]) =>
            embedTextsWithGemini(texts, {
              env: params.routerOptions?.env,
              abortSignal: pipelineController.signal,
            })
        : undefined);

    const titleDedupResult = await deduplicateCandidatesWithSemantics(hashFilteredCandidates, {
      historicalItems: recentHistoricalItems,
      embedFn: effectiveEmbedFn,
    });
    articlesDeduplicated += titleDedupResult.deduplicatedCount;
    const semanticEmbeddingMap = titleDedupResult.embeddingsByUrlHash;
    const newCandidates = titleDedupResult.uniqueCandidates;

    await persistLogSnapshot(ScraperRunStatusEnum.RUNNING, false).catch(() => {});

    // -------------------------------------------------------------------------
    // Phase C: Parallel HTML Fetch / RSS Fast Path, Soft-Block Guard & ?page=all
    // -------------------------------------------------------------------------
    const extractedReady: ExtractedReadyArticle[] = [];
    const extractedSeenHashes = new Set<string>();
    let googleDecodeAttempts = 0;

    const pushNationalMetadataFallback = (
      candidate: DiscoveredArticleCandidate,
      finalUrlOverride?: string,
    ) => {
      const targetUrl =
        finalUrlOverride && isSafeHttpUrl(finalUrlOverride) ? finalUrlOverride : candidate.url;
      const { normalizedUrl, urlHash } = hashNormalizedUrl(targetUrl);
      if (extractedSeenHashes.has(urlHash)) {
        articlesDeduplicated += 1;
        return;
      }
      const fallback = buildNationalFallbackSnippet(candidate);
      extractedSeenHashes.add(urlHash);
      extractedReady.push({
        candidate,
        finalUrl: targetUrl,
        normalizedUrl,
        urlHash,
        sourcePortal: candidate.sourcePortal,
        title: candidate.title,
        snippetText: fallback.snippetText,
        wordCount: fallback.wordCount,
        publishedAt: candidate.publishedHint ?? now,
        titleEmbedding: semanticEmbeddingMap.get(candidate.urlHash) ?? null,
      });
    };

    if (hasRemainingBudget(20)) {
      await runWithConcurrency(
        newCandidates,
        fetchConcurrency,
        async (candidate) => {
          if (!hasRemainingBudget(20)) return;

          // Jalur cepat RSS WordPress (sudah membawa teks bersih >= 30 kata)
          if (candidate.prefetchedSnippetText && (candidate.prefetchedWordCount ?? 0) >= 30) {
            if (extractedSeenHashes.has(candidate.urlHash)) {
              articlesDeduplicated += 1;
              return;
            }
            const publishedAt = candidate.publishedHint ?? now;
            if (!isWithinLookbackWindow(publishedAt, cutoffDate)) {
              articlesDeduplicated += 1;
              return;
            }
            extractedSeenHashes.add(candidate.urlHash);
            extractedReady.push({
              candidate,
              finalUrl: candidate.url,
              normalizedUrl: candidate.normalizedUrl,
              urlHash: candidate.urlHash,
              sourcePortal: candidate.sourcePortal,
              title: candidate.title,
              snippetText: candidate.prefetchedSnippetText,
              wordCount: candidate.prefetchedWordCount ?? 0,
              publishedAt,
              titleEmbedding: semanticEmbeddingMap.get(candidate.urlHash) ?? null,
            });
            return;
          }

          try {
            let fetched = await fetchFn(candidate.url, {
              timeoutMs: fetchTimeoutMs,
              maxBytes: 2 * 1024 * 1024,
              userAgent: DEFAULT_BROWSER_USER_AGENT,
              headers: DEFAULT_BROWSER_HEADERS,
              signal: pipelineController.signal,
              politeHostPacing: !params.fetchFn,
            });

            if (isGoogleWrapperHost(fetched.finalUrl)) {
              let externalTarget = extractRedirectTargetFromGoogleHtml(fetched.body);

              if (
                !externalTarget &&
                extractGoogleNewsDecodeParams(fetched.body) &&
                googleDecodeAttempts < DEFAULT_GOOGLE_NEWS_DECODE_CAP_PER_RUN &&
                hasRemainingBudget(600)
              ) {
                const attemptIdx = googleDecodeAttempts;
                googleDecodeAttempts += 1;
                if (attemptIdx > 0) {
                  await new Promise((r) => setTimeout(r, DEFAULT_GOOGLE_NEWS_DECODE_DELAY_MS));
                }
                if (hasRemainingBudget(300)) {
                  externalTarget = await decodeGoogleNewsUrlFromHtml(fetched.body, {
                    timeoutMs: fetchTimeoutMs,
                    signal: pipelineController.signal,
                  });
                }
              }

              if (externalTarget && hasRemainingBudget(20)) {
                try {
                  fetched = await fetchFn(externalTarget, {
                    timeoutMs: fetchTimeoutMs,
                    maxBytes: 2 * 1024 * 1024,
                    userAgent: DEFAULT_BROWSER_USER_AGENT,
                    headers: DEFAULT_BROWSER_HEADERS,
                    signal: pipelineController.signal,
                    politeHostPacing: !params.fetchFn,
                  });
                } catch {
                  pushNationalMetadataFallback(candidate, externalTarget);
                  return;
                }
              } else {
                pushNationalMetadataFallback(candidate);
                return;
              }
            }

            const rawFinalUrl = isSafeHttpUrl(fetched.finalUrl) ? fetched.finalUrl : candidate.url;
            let extracted = extractArticleContent(
              fetched.body,
              candidate.publishedHint,
              rawFinalUrl,
            );

            if (extracted.isSoftBlocked) {
              if (
                candidate.sourceType === ArticleSourceTypeEnum.NATIONAL &&
                candidate.fallbackDescription
              ) {
                pushNationalMetadataFallback(candidate, rawFinalUrl);
                return;
              }
              errors.push({
                source: candidate.sourcePortal,
                stage: 'EXTRACT',
                message: 'Halaman terblokir proteksi anti-bot (soft-block HTTP 200).',
                url: rawFinalUrl,
              });
              return;
            }

            if (
              extracted.nextFullPageUrl &&
              isSameDomainHost(extracted.nextFullPageUrl, rawFinalUrl) &&
              hasRemainingBudget(400)
            ) {
              try {
                const fullResp = await fetchFn(extracted.nextFullPageUrl, {
                  timeoutMs: fetchTimeoutMs,
                  maxBytes: 2 * 1024 * 1024,
                  userAgent: DEFAULT_BROWSER_USER_AGENT,
                  headers: DEFAULT_BROWSER_HEADERS,
                  signal: pipelineController.signal,
                  politeHostPacing: !params.fetchFn,
                });
                const fullExtracted = extractArticleContent(
                  fullResp.body,
                  candidate.publishedHint,
                  fullResp.finalUrl,
                );
                if (
                  !fullExtracted.isSoftBlocked &&
                  fullExtracted.isValidContent &&
                  fullExtracted.wordCount >= extracted.wordCount
                ) {
                  extracted = fullExtracted;
                }
              } catch {
                // Abaikan kegagalan ?page=all; gunakan hasil halaman utama
              }
            }

            const effectiveFinalUrl = resolveSameHostCanonicalUrl(extracted.canonicalUrl, rawFinalUrl);
            const { normalizedUrl, urlHash } = hashNormalizedUrl(effectiveFinalUrl);

            if (extractedSeenHashes.has(urlHash)) {
              articlesDeduplicated += 1;
              return;
            }

            const publishedAt = extracted.publishedAt ?? candidate.publishedHint ?? now;

            if (extracted.publishedAt && !isWithinLookbackWindow(extracted.publishedAt, cutoffDate)) {
              articlesDeduplicated += 1;
              return;
            }

            if (!extracted.isValidContent) {
              if (
                candidate.sourceType === ArticleSourceTypeEnum.NATIONAL &&
                candidate.fallbackDescription
              ) {
                pushNationalMetadataFallback(candidate, effectiveFinalUrl);
                return;
              }

              errors.push({
                source: candidate.sourcePortal,
                stage: 'EXTRACT',
                message: `Konten teks terlalu pendek (${extracted.wordCount} kata bersih).`,
                url: effectiveFinalUrl,
              });
              return;
            }

            extractedSeenHashes.add(urlHash);
            const resolvedPortal =
              candidate.sourceType === ArticleSourceTypeEnum.NATIONAL && !isGoogleWrapperHost(effectiveFinalUrl)
                ? extractHostnameLabel(effectiveFinalUrl)
                : candidate.sourcePortal;

            extractedReady.push({
              candidate,
              finalUrl: effectiveFinalUrl,
              normalizedUrl,
              urlHash,
              sourcePortal: resolvedPortal,
              title: extracted.title.length >= 8 ? extracted.title : candidate.title,
              snippetText: extracted.snippetText,
              wordCount: extracted.wordCount,
              publishedAt,
              titleEmbedding: semanticEmbeddingMap.get(candidate.urlHash) ?? null,
            });
          } catch (err) {
            if (
              candidate.sourceType === ArticleSourceTypeEnum.NATIONAL &&
              (candidate.fallbackDescription || isGoogleWrapperHost(candidate.url))
            ) {
              pushNationalMetadataFallback(candidate);
              return;
            }

            errors.push({
              source: candidate.sourcePortal,
              stage: 'FETCH',
              message: err instanceof Error ? err.message : String(err),
              url: candidate.url,
            });
          }
        },
        pipelineController.signal,
      );
    }

    // Cek ulang hash URL final hasil redirect/dekode Google News & canonical terhadap DB
    const existingFinalHashes = await queryExistingHashes(
      extractedReady.map((item) => item.urlHash),
    );
    const dedupedExtracted: ExtractedReadyArticle[] = [];
    for (const item of extractedReady) {
      if (existingFinalHashes.has(item.urlHash)) {
        articlesDeduplicated += 1;
        continue;
      }
      dedupedExtracted.push(item);
    }

    // -------------------------------------------------------------------------
    // Phase C.5: Gerbang Geografis Deterministik KTT & Prioritas Antrean LLM
    // -------------------------------------------------------------------------
    const llmEligible: ExtractedReadyArticle[] = [];
    for (const item of dedupedExtracted) {
      const geo = evaluateGeographicRelevance({
        title: item.title,
        snippetText: item.snippetText,
        url: item.normalizedUrl,
        sourceType: item.candidate.sourceType,
        matchedKeyword: item.candidate.matchedKeyword,
      });

      if (geo.decision === 'DROP_OTHER_REGENCY_LOCAL' || geo.decision === 'DROP_STATIC_NOISE') {
        const defaultPeriod = getQuarterFromDateWita(item.publishedAt);
        const [ignoredInserted] = await db
          .insert(articles)
          .values({
            url: item.normalizedUrl,
            urlHash: item.urlHash,
            sourceType: item.candidate.sourceType,
            sourcePortal: item.sourcePortal,
            title: item.title,
            snippetText: item.snippetText,
            wordCount: item.wordCount,
            publishedAt: item.publishedAt,
            quarter: defaultPeriod.quarter,
            year: defaultPeriod.year,
            geographicScope: 'OTHER_REGION_IRRELEVANT',
            titleEmbedding: item.titleEmbedding ?? null,
            isEconomicPhenomenon: false,
            summary: null,
            kbliCategory: null,
            kbliImpact: null,
            expenditureComponent: null,
            expenditureImpact: null,
            llmModel: geo.decision === 'DROP_STATIC_NOISE' ? 'title-geo-filter' : 'geo-filter',
            llmStatus: LlmStatusEnum.SUCCESS,
            llmError: geo.reason,
            llmConfidence: 1,
            verificationStatus: VerificationStatusEnum.IGNORED,
            keywordId: item.candidate.keywordId,
            scraperLogId: logId,
          })
          .onConflictDoNothing({ target: articles.urlHash })
          .returning({ id: articles.id });

        if (ignoredInserted) {
          articlesInserted += 1;
          nonEconomicCount += 1;
        } else {
          articlesDeduplicated += 1;
        }
        continue;
      }

      llmEligible.push(item);
    }

    // Urutkan kandidat lolos: REGIONAL -> NATIONAL langsung -> NATIONAL fallback, lalu tanggal terbaru
    llmEligible.sort((a, b) => {
      const prioDiff =
        getCandidateSourcePriority(b.candidate) - getCandidateSourcePriority(a.candidate);
      if (prioDiff !== 0) return prioDiff;
      return b.publishedAt.getTime() - a.publishedAt.getTime();
    });

    const readyForLlm = llmEligible.slice(0, maxArticlesPerRun);
    const overflowForLater = llmEligible.slice(maxArticlesPerRun);
    if (overflowForLater.length > 0) {
      errors.push({
        source: 'pipeline',
        stage: 'SYSTEM',
        message: `Antrean dibatasi ke ${maxArticlesPerRun} artikel prioritas per sesi (${overflowForLater.length} artikel sisanya disimpan untuk sapuan otomatis berikutnya).`,
      });
      for (const item of overflowForLater) {
        const defaultPeriod = getQuarterFromDateWita(item.publishedAt);
        const [deferredInserted] = await db
          .insert(articles)
          .values({
            url: item.normalizedUrl,
            urlHash: item.urlHash,
            sourceType: item.candidate.sourceType,
            sourcePortal: item.sourcePortal,
            title: item.title,
            snippetText: item.snippetText,
            wordCount: item.wordCount,
            publishedAt: item.publishedAt,
            quarter: defaultPeriod.quarter,
            year: defaultPeriod.year,
            geographicScope: null,
            titleEmbedding: item.titleEmbedding ?? null,
            isEconomicPhenomenon: null,
            summary: null,
            kbliCategory: null,
            kbliImpact: null,
            expenditureComponent: null,
            expenditureImpact: null,
            llmModel: null,
            llmStatus: LlmStatusEnum.FAILED,
            llmError: 'DEFERRED_BATCH_CAP',
            llmConfidence: null,
            verificationStatus: VerificationStatusEnum.PENDING,
            keywordId: item.candidate.keywordId,
            scraperLogId: logId,
          })
          .onConflictDoNothing({ target: articles.urlHash })
          .returning({ id: articles.id });

        if (deferredInserted) {
          articlesInserted += 1;
          llmFailedCount += 1;
        } else {
          articlesDeduplicated += 1;
        }
      }
    }

    await persistLogSnapshot(ScraperRunStatusEnum.RUNNING, false).catch(() => {});

    // -------------------------------------------------------------------------
    // Phase D: Multi-Provider LLM Classification Worker (Paralel Terkontrol & 0ms Failover)
    // -------------------------------------------------------------------------
    let consecutiveRateLimitErrors = 0;
    let circuitBreakerOpen = false;
    let deadlineWarningRecorded = false;
    let completedInPhaseD = 0;

    const phaseDConcurrency = legacyWorker
      ? 1
      : Math.min(3, Math.max(1, llmRouter?.configuredProviderCount ?? 1));

    await runWithConcurrency(
      readyForLlm,
      phaseDConcurrency,
      async (item, idx) => {
        const defaultPeriod = getQuarterFromDateWita(item.publishedAt);
        const publishedAtWita = formatDateTimeWita(item.publishedAt);
        const budgetExhausted = !hasRemainingBudget(20);

        if (budgetExhausted && !deadlineWarningRecorded) {
          deadlineWarningRecorded = true;
          timedOut = true;
          errors.push({
            source: 'pipeline',
            stage: 'SYSTEM',
            message: `Batas waktu maksimal ${Math.round(maxDurationMs / 1000)} detik tercapai; sisa antrean (${readyForLlm.length - idx} artikel) disimpan sebagai LLM FAILED untuk retry berikutnya.`,
          });
        }

        let persistenceFields: {
          isEconomicPhenomenon: boolean | null;
          geographicScope: string | null;
          summary: string | null;
          kbliCategory: typeof articles.$inferInsert['kbliCategory'];
          kbliImpact: typeof articles.$inferInsert['kbliImpact'];
          expenditureComponent: typeof articles.$inferInsert['expenditureComponent'];
          expenditureImpact: typeof articles.$inferInsert['expenditureImpact'];
          quarter: number;
          year: number;
          llmModel: string | null;
          llmStatus: LlmStatusEnum;
          llmError: string | null;
          llmConfidence: number | null;
          verificationStatus: VerificationStatusEnum;
        };

        if (circuitBreakerOpen || budgetExhausted) {
          llmFailedCount += 1;
          persistenceFields = {
            isEconomicPhenomenon: null,
            geographicScope: null,
            summary: null,
            kbliCategory: null,
            kbliImpact: null,
            expenditureComponent: null,
            expenditureImpact: null,
            quarter: defaultPeriod.quarter,
            year: defaultPeriod.year,
            llmModel: null,
            llmStatus: LlmStatusEnum.FAILED,
            llmError: budgetExhausted ? 'PIPELINE_TIMEOUT_BUDGET' : 'CIRCUIT_BREAKER_QUOTA',
            llmConfidence: null,
            verificationStatus: VerificationStatusEnum.PENDING,
          };
        } else {
          const classificationInput = {
            title: item.title,
            sourcePortal: item.sourcePortal,
            sourceType: item.candidate.sourceType,
            matchedKeyword: item.candidate.matchedKeyword,
            defaultKbliHint: item.candidate.defaultKbliCategory,
            defaultExpenditureHint: item.candidate.defaultExpenditureComponent,
            publishedAtWita,
            defaultQuarter: defaultPeriod.quarter,
            defaultYear: defaultPeriod.year,
            snippetText: item.snippetText,
          };

          const aiResult = legacyWorker
            ? await legacyWorker.classifyArticle(classificationInput, {
                signal: pipelineController.signal,
                deadlineAtMs,
              })
            : await llmRouter!.classifyArticle(classificationInput, {
                signal: pipelineController.signal,
                deadlineAtMs,
              });

          totalInputTokens += aiResult.usage.inputTokens;
          totalOutputTokens += aiResult.usage.outputTokens;
          totalTokens += aiResult.usage.totalTokens;
          if (aiResult.responseTimeMs > 0) {
            totalResponseTimeMs += aiResult.responseTimeMs;
            timedLlmCalls += 1;
          }

          if (aiResult.ok) {
            consecutiveRateLimitErrors = 0;
            const mapped = mapClassificationToPersistence(
              aiResult.classification,
              aiResult.modelUsed,
            );
            persistenceFields = { ...mapped };
            if (mapped.isEconomicPhenomenon) {
              economicCount += 1;
            } else {
              nonEconomicCount += 1;
            }
          } else {
            llmFailedCount += 1;
            errors.push({
              source: item.sourcePortal,
              stage: 'LLM',
              message: `[${aiResult.errorCode}] ${aiResult.errorMessage}`,
              url: item.normalizedUrl,
            });

            if (aiResult.errorCode === 'TIMEOUT_BUDGET_EXCEEDED') {
              timedOut = true;
            }

            if (aiResult.isRateLimit) {
              consecutiveRateLimitErrors += 1;
              if (consecutiveRateLimitErrors >= CIRCUIT_BREAKER_CONSECUTIVE_429_THRESHOLD) {
                circuitBreakerOpen = true;
                errors.push({
                  source: 'llm-router',
                  stage: 'LLM',
                  message: `Circuit breaker aktif setelah ${CIRCUIT_BREAKER_CONSECUTIVE_429_THRESHOLD}x kegagalan 429 beruntun di seluruh slot; sisa antrean disimpan untuk retry.`,
                });
              }
            } else {
              consecutiveRateLimitErrors = 0;
            }

            persistenceFields = {
              isEconomicPhenomenon: null,
              geographicScope: null,
              summary: null,
              kbliCategory: null,
              kbliImpact: null,
              expenditureComponent: null,
              expenditureImpact: null,
              quarter: defaultPeriod.quarter,
              year: defaultPeriod.year,
              llmModel: aiResult.modelUsed,
              llmStatus: LlmStatusEnum.FAILED,
              llmError:
                aiResult.errorCode === 'RATE_LIMIT_EXCEEDED'
                  ? 'RATE_LIMIT_EXCEEDED'
                  : aiResult.errorMessage.slice(0, 500),
              llmConfidence: null,
              verificationStatus: VerificationStatusEnum.PENDING,
            };
          }
        }

        const [inserted] = await db
          .insert(articles)
          .values({
            url: item.normalizedUrl,
            urlHash: item.urlHash,
            sourceType: item.candidate.sourceType,
            sourcePortal: item.sourcePortal,
            title: item.title,
            snippetText: item.snippetText,
            wordCount: item.wordCount,
            publishedAt: item.publishedAt,
            quarter: persistenceFields.quarter,
            year: persistenceFields.year,
            geographicScope: persistenceFields.geographicScope,
            titleEmbedding: item.titleEmbedding ?? null,
            isEconomicPhenomenon: persistenceFields.isEconomicPhenomenon,
            summary: persistenceFields.summary,
            kbliCategory: persistenceFields.kbliCategory,
            kbliImpact: persistenceFields.kbliImpact,
            expenditureComponent: persistenceFields.expenditureComponent,
            expenditureImpact: persistenceFields.expenditureImpact,
            llmModel: persistenceFields.llmModel,
            llmStatus: persistenceFields.llmStatus,
            llmError: persistenceFields.llmError,
            llmConfidence: persistenceFields.llmConfidence,
            verificationStatus: persistenceFields.verificationStatus,
            keywordId: item.candidate.keywordId,
            scraperLogId: logId,
          })
          .onConflictDoNothing({ target: articles.urlHash })
          .returning({ id: articles.id });

        if (inserted) {
          articlesInserted += 1;
        } else {
          articlesDeduplicated += 1;
        }

        completedInPhaseD += 1;
        if (completedInPhaseD % 3 === 0 || completedInPhaseD === readyForLlm.length) {
          await persistLogSnapshot(ScraperRunStatusEnum.RUNNING, false).catch(() => {});
        }
      },
    );

    if (timedOut && !deadlineWarningRecorded) {
      errors.push({
        source: 'pipeline',
        stage: 'SYSTEM',
        message: `Batas waktu maksimal eksekusi (${Math.round(maxDurationMs / 1000)} detik) tercapai; hasil yang terkumpul telah disimpan.`,
      });
    }

    const durationMs = Date.now() - startedAtMs;
    const avgResponseTimeMs = timedLlmCalls > 0 ? Math.round(totalResponseTimeMs / timedLlmCalls) : 0;

    const harvestErrors = errors.filter((e) => e.stage === 'HARVEST').length;
    const totalSourcesChecked = portalsChecked + keywordsChecked;

    let finalStatus: ScraperRunStatusEnum;
    if (timedOut) {
      finalStatus =
        articlesInserted > 0 || economicCount > 0 || nonEconomicCount > 0
          ? ScraperRunStatusEnum.PARTIAL
          : ScraperRunStatusEnum.FAILED;
    } else if (totalSourcesChecked > 0 && harvestErrors >= totalSourcesChecked && articlesInserted === 0) {
      finalStatus = ScraperRunStatusEnum.FAILED;
    } else if (
      readyForLlm.length > 0 &&
      llmFailedCount >= readyForLlm.length &&
      errors.some((e) => e.stage === 'LLM')
    ) {
      finalStatus = ScraperRunStatusEnum.PARTIAL;
    } else if (errors.length > 0 || llmFailedCount > 0) {
      finalStatus = ScraperRunStatusEnum.PARTIAL;
    } else {
      finalStatus = ScraperRunStatusEnum.SUCCESS;
    }

    await persistLogSnapshot(finalStatus, true);

    return {
      logId,
      runType: params.runType,
      status: finalStatus,
      portalsChecked,
      keywordsChecked,
      articlesFetched,
      articlesDeduplicated,
      articlesInserted,
      economicCount,
      nonEconomicCount,
      llmFailedCount,
      totalInputTokens,
      totalOutputTokens,
      totalTokens,
      avgResponseTimeMs,
      durationMs,
      providerStats: getCurrentProviderStats(),
      errors,
    };
  } catch (fatalErr) {
    errors.push({
      source: 'pipeline',
      stage: 'SYSTEM',
      message: fatalErr instanceof Error ? fatalErr.message : String(fatalErr),
    });

    const fallbackStatus =
      articlesInserted > 0 || economicCount > 0 || nonEconomicCount > 0
        ? ScraperRunStatusEnum.PARTIAL
        : ScraperRunStatusEnum.FAILED;

    await persistLogSnapshot(fallbackStatus, true).catch(() => {});
    throw fatalErr;
  } finally {
    clearTimeout(deadlineTimer);
    if (!finalized) {
      const safeStatus =
        articlesInserted > 0 || economicCount > 0 || nonEconomicCount > 0
          ? ScraperRunStatusEnum.PARTIAL
          : ScraperRunStatusEnum.FAILED;
      await persistLogSnapshot(safeStatus, true).catch((err) => {
        console.error(`[Scraper ${logId}] Gagal melepas status RUNNING di blok finally:`, err);
      });
    }
  }
}

/**
 * Menjalankan pipeline scraper secara penuh (blocking/awaitable) dengan PostgreSQL Advisory Lock.
 */
export async function runScrapePipeline(
  params: RunScrapePipelineParams,
): Promise<ScrapeRunSummary> {
  const { logId, releaseLock } = await acquireScrapeExecutionLock(
    params.runType,
    params.triggeredBy ?? null,
  );

  try {
    return await executeLockedScrapePipeline(logId, params);
  } finally {
    await releaseLock();
  }
}

/**
 * Mengambil lock terlebih dahulu lalu melepaskan proses pipeline ke background secara aman.
 */
export async function startScrapeJobInBackground(
  params: RunScrapePipelineParams,
): Promise<{ logId: string; status: ScraperRunStatusEnum.RUNNING }> {
  const { logId, releaseLock } = await acquireScrapeExecutionLock(
    params.runType,
    params.triggeredBy ?? null,
  );

  void executeLockedScrapePipeline(logId, params)
    .catch((err) => {
      console.error(`[Scraper Background Job ${logId}] Failed:`, err);
    })
    .finally(async () => {
      await releaseLock();
    });

  return {
    logId,
    status: ScraperRunStatusEnum.RUNNING,
  };
}

async function executeLockedRetryLlmBatch(
  logId: string,
  params: {
    limit?: number;
    maxDurationMs?: number;
    workerOptions?: GeminiWorkerOptions;
    routerOptions?: MultiLlmRouterOptions;
  } = {},
): Promise<RetryLlmSummary> {
  const startedAtMs = Date.now();
  const limit = params.limit ?? 50;
  const maxDurationMs = Math.max(50, params.maxDurationMs ?? DEFAULT_MAX_RUN_DURATION_MS);
  const deadlineAtMs = startedAtMs + maxDurationMs;

  const pipelineController = new AbortController();
  let timedOut = false;
  const deadlineTimer = setTimeout(() => {
    timedOut = true;
    pipelineController.abort(
      new Error(`Batas waktu retry LLM (${Math.round(maxDurationMs / 1000)} detik) tercapai.`),
    );
  }, maxDurationMs);

  const legacyWorker = params.workerOptions?.invokeFn
    ? new GeminiClassificationWorker(params.workerOptions)
    : null;
  const llmRouter = legacyWorker
    ? null
    : new MultiLlmRouter({
        task: 'classify',
        ...(params.routerOptions ?? {}),
      });

  let fetchedTotal = 0;
  let processedCount = 0;
  let succeededCount = 0;
  let economicCount = 0;
  let nonEconomicCount = 0;
  let failedCount = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalTokens = 0;
  let totalResponseTimeMs = 0;
  let timedLlmCalls = 0;
  let consecutiveRateLimitErrors = 0;
  let circuitBreakerOpen = false;
  let finalized = false;
  const errors: ScraperPortalErrorEntry[] = [];

  const getCurrentProviderStats = (): Record<string, ScraperProviderStatEntry> =>
    llmRouter ? llmRouter.getProviderStats() : {};

  const persistRetrySnapshot = async (status: ScraperRunStatusEnum, isFinal: boolean) => {
    const durationMs = Date.now() - startedAtMs;
    const avgResponseTimeMs = timedLlmCalls > 0 ? Math.round(totalResponseTimeMs / timedLlmCalls) : 0;

    await db
      .update(scraperLogs)
      .set({
        status,
        articlesFetched: fetchedTotal,
        economicCount,
        nonEconomicCount,
        llmFailedCount: failedCount,
        totalInputTokens,
        totalOutputTokens,
        totalTokens,
        avgResponseTimeMs,
        durationMs,
        providerStats: getCurrentProviderStats(),
        errorSummary: errors.slice(0, 100),
        finishedAt: isFinal ? new Date() : null,
      })
      .where(eq(scraperLogs.id, logId));

    if (isFinal) {
      finalized = true;
    }
  };

  try {
    const pendingFailedArticles = await db
      .select()
      .from(articles)
      .where(
        and(
          eq(articles.llmStatus, LlmStatusEnum.FAILED),
          eq(articles.verificationStatus, VerificationStatusEnum.PENDING),
        ),
      )
      .orderBy(desc(articles.publishedAt))
      .limit(limit);

    fetchedTotal = pendingFailedArticles.length;
    await persistRetrySnapshot(ScraperRunStatusEnum.RUNNING, false).catch(() => {});

    for (let idx = 0; idx < pendingFailedArticles.length; idx += 1) {
      const article = pendingFailedArticles[idx];
      if (!article) continue;

      if (circuitBreakerOpen) {
        failedCount += 1;
        continue;
      }

      if (timedOut || pipelineController.signal.aborted || Date.now() + 500 >= deadlineAtMs) {
        timedOut = true;
        failedCount += pendingFailedArticles.length - idx;
        errors.push({
          source: 'retry-llm',
          stage: 'SYSTEM',
          message: `Batas waktu retry (${Math.round(maxDurationMs / 1000)} detik) tercapai; ${pendingFailedArticles.length - idx} artikel tersisa menunggu sesi berikutnya.`,
        });
        break;
      }

      processedCount += 1;

      // Saring artikel non-KTT/noise statis sebelum menghabiskan token retry
      const geo = evaluateGeographicRelevance({
        title: article.title,
        snippetText: article.snippetText,
        url: article.url,
        sourceType: article.sourceType,
      });

      if (geo.decision === 'DROP_OTHER_REGENCY_LOCAL' || geo.decision === 'DROP_STATIC_NOISE') {
        succeededCount += 1;
        nonEconomicCount += 1;
        await db
          .update(articles)
          .set({
            geographicScope: 'OTHER_REGION_IRRELEVANT',
            isEconomicPhenomenon: false,
            summary: null,
            kbliCategory: null,
            kbliImpact: null,
            expenditureComponent: null,
            expenditureImpact: null,
            llmModel: geo.decision === 'DROP_STATIC_NOISE' ? 'title-geo-filter' : 'geo-filter',
            llmStatus: LlmStatusEnum.SUCCESS,
            llmError: geo.reason,
            llmConfidence: 1,
            verificationStatus: VerificationStatusEnum.IGNORED,
          })
          .where(eq(articles.id, article.id));
        continue;
      }

      const defaultPeriod = getQuarterFromDateWita(article.publishedAt);
      const classificationInput = {
        title: article.title,
        sourcePortal: article.sourcePortal,
        sourceType: article.sourceType,
        publishedAtWita: formatDateTimeWita(article.publishedAt),
        defaultQuarter: defaultPeriod.quarter,
        defaultYear: defaultPeriod.year,
        snippetText: article.snippetText,
      };

      const result = legacyWorker
        ? await legacyWorker.classifyArticle(classificationInput, {
            signal: pipelineController.signal,
            deadlineAtMs,
          })
        : await llmRouter!.classifyArticle(classificationInput, {
            signal: pipelineController.signal,
            deadlineAtMs,
          });

      totalInputTokens += result.usage.inputTokens;
      totalOutputTokens += result.usage.outputTokens;
      totalTokens += result.usage.totalTokens;
      if (result.responseTimeMs > 0) {
        totalResponseTimeMs += result.responseTimeMs;
        timedLlmCalls += 1;
      }

      if (result.ok) {
        consecutiveRateLimitErrors = 0;
        succeededCount += 1;
        const mapped = mapClassificationToPersistence(result.classification, result.modelUsed);

        if (mapped.isEconomicPhenomenon) {
          economicCount += 1;
        } else {
          nonEconomicCount += 1;
        }

        await db
          .update(articles)
          .set({
            geographicScope: mapped.geographicScope,
            isEconomicPhenomenon: mapped.isEconomicPhenomenon,
            summary: mapped.summary,
            kbliCategory: mapped.kbliCategory,
            kbliImpact: mapped.kbliImpact,
            expenditureComponent: mapped.expenditureComponent,
            expenditureImpact: mapped.expenditureImpact,
            quarter: mapped.quarter,
            year: mapped.year,
            llmModel: mapped.llmModel,
            llmStatus: mapped.llmStatus,
            llmError: mapped.llmError,
            llmConfidence: mapped.llmConfidence,
            verificationStatus: mapped.verificationStatus,
          })
          .where(eq(articles.id, article.id));
      } else {
        failedCount += 1;
        errors.push({
          source: article.sourcePortal,
          stage: 'LLM',
          message: `[${result.errorCode}] ${result.errorMessage}`,
          url: article.url,
        });

        await db
          .update(articles)
          .set({
            llmModel: result.modelUsed,
            llmError:
              result.errorCode === 'RATE_LIMIT_EXCEEDED'
                ? 'RATE_LIMIT_EXCEEDED'
                : result.errorMessage.slice(0, 500),
          })
          .where(eq(articles.id, article.id));

        if (result.errorCode === 'TIMEOUT_BUDGET_EXCEEDED') {
          timedOut = true;
        }

        if (result.isRateLimit) {
          consecutiveRateLimitErrors += 1;
          if (consecutiveRateLimitErrors >= CIRCUIT_BREAKER_CONSECUTIVE_429_THRESHOLD) {
            circuitBreakerOpen = true;
            errors.push({
              source: 'llm-router',
              stage: 'LLM',
              message: `Circuit breaker aktif saat retry setelah ${CIRCUIT_BREAKER_CONSECUTIVE_429_THRESHOLD}x error 429 beruntun.`,
            });
          }
        } else {
          consecutiveRateLimitErrors = 0;
        }
      }

      if ((idx + 1) % 3 === 0 || idx === pendingFailedArticles.length - 1) {
        await persistRetrySnapshot(ScraperRunStatusEnum.RUNNING, false).catch(() => {});
      }
    }

    const durationMs = Date.now() - startedAtMs;

    const finalStatus =
      timedOut
        ? succeededCount > 0
          ? ScraperRunStatusEnum.PARTIAL
          : ScraperRunStatusEnum.FAILED
        : failedCount === 0
          ? ScraperRunStatusEnum.SUCCESS
          : succeededCount > 0
            ? ScraperRunStatusEnum.PARTIAL
            : ScraperRunStatusEnum.FAILED;

    await persistRetrySnapshot(finalStatus, true);

    return {
      logId,
      status: finalStatus,
      processedCount,
      succeededCount,
      economicCount,
      nonEconomicCount,
      failedCount,
      totalInputTokens,
      totalOutputTokens,
      totalTokens,
      durationMs,
      providerStats: getCurrentProviderStats(),
      errors,
    };
  } catch (fatalErr) {
    errors.push({
      source: 'retry-llm',
      stage: 'SYSTEM',
      message: fatalErr instanceof Error ? fatalErr.message : String(fatalErr),
    });

    const fallbackStatus =
      succeededCount > 0 ? ScraperRunStatusEnum.PARTIAL : ScraperRunStatusEnum.FAILED;
    await persistRetrySnapshot(fallbackStatus, true).catch(() => {});
    throw fatalErr;
  } finally {
    clearTimeout(deadlineTimer);
    if (!finalized) {
      const safeStatus =
        succeededCount > 0 ? ScraperRunStatusEnum.PARTIAL : ScraperRunStatusEnum.FAILED;
      await persistRetrySnapshot(safeStatus, true).catch((err) => {
        console.error(`[Retry LLM ${logId}] Gagal melepas status RUNNING di blok finally:`, err);
      });
    }
  }
}

export async function runRetryFailedLlmBatch(params: {
  triggeredBy?: string | null;
  limit?: number;
  maxDurationMs?: number;
  workerOptions?: GeminiWorkerOptions;
  routerOptions?: MultiLlmRouterOptions;
} = {}): Promise<RetryLlmSummary> {
  const { logId, releaseLock } = await acquireScrapeExecutionLock(
    ScraperRunTypeEnum.RETRY_LLM,
    params.triggeredBy ?? null,
  );

  try {
    return await executeLockedRetryLlmBatch(logId, params);
  } finally {
    await releaseLock();
  }
}

export async function startRetryFailedLlmInBackground(params: {
  triggeredBy?: string | null;
  limit?: number;
  maxDurationMs?: number;
  workerOptions?: GeminiWorkerOptions;
  routerOptions?: MultiLlmRouterOptions;
} = {}): Promise<{ logId: string; status: ScraperRunStatusEnum.RUNNING }> {
  const { logId, releaseLock } = await acquireScrapeExecutionLock(
    ScraperRunTypeEnum.RETRY_LLM,
    params.triggeredBy ?? null,
  );

  void executeLockedRetryLlmBatch(logId, params)
    .catch((err) => {
      console.error(`[Retry LLM Background Job ${logId}] Failed:`, err);
    })
    .finally(async () => {
      await releaseLock();
    });

  return {
    logId,
    status: ScraperRunStatusEnum.RUNNING,
  };
}
