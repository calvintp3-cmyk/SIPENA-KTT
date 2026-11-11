// server/services/scraper/pipeline.ts
import { and, desc, eq, inArray, lte, sql } from 'drizzle-orm';
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
} from '../../db/schema';
import { safeFetchText, type SafeFetchOptions } from '../../utils/ssrf';
import { extractHostnameLabel, hashNormalizedUrl, isSafeHttpUrl } from '../../utils/url-hash';
import { mapClassificationToPersistence } from '../llm/classifier';
import { GeminiClassificationWorker, type GeminiWorkerOptions } from '../llm/gemini-client';
import { extractArticleContent } from './extractor';
import {
  extractRedirectTargetFromGoogleHtml,
  harvestNationalKeywords,
  type ActiveKeywordTarget,
} from './national';
import {
  getWitaLookbackCutoff,
  harvestRegionalPortals,
  isWithinLookbackWindow,
  type DiscoveredArticleCandidate,
  type RegionalPortalConfig,
} from './portals';
import { isHardNoiseTitleForNational } from './title-filter';

export const SCRAPER_ADVISORY_LOCK_KEY = 982451;
export const STALE_RUN_TIMEOUT_MS = 30 * 60 * 1000;
const FETCH_CONCURRENCY = 2;
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
  portals?: ReadonlyArray<RegionalPortalConfig>;
  keywords?: ReadonlyArray<ActiveKeywordTarget>;
  fetchFn?: (url: string, options?: SafeFetchOptions) => Promise<{ finalUrl: string; body: string }>;
  workerOptions?: GeminiWorkerOptions;
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

async function runWithConcurrency<T>(
  items: ReadonlyArray<T>,
  limit: number,
  handler: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  let cursor = 0;
  const workerCount = Math.min(limit, items.length);

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (cursor < items.length) {
        const index = cursor;
        cursor += 1;
        const item = items[index];
        if (item !== undefined) {
          await handler(item);
        }
      }
    }),
  );
}

interface AcquiredScrapeLock {
  logId: string;
  releaseLock: () => Promise<void>;
}

/**
 * Mengambil PostgreSQL Advisory Lock eksklusif, membersihkan sesi RUNNING yang menggantung > 30 menit,
 * memastikan tidak ada job lain yang aktif, dan membuat entri awal pada tabel `scraper_logs`.
 */
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

    const staleCutoff = new Date(Date.now() - STALE_RUN_TIMEOUT_MS);

    // Pulihkan baris log RUNNING yang lebih lama dari 30 menit akibat crash/restart mendadak
    await db
      .update(scraperLogs)
      .set({
        status: ScraperRunStatusEnum.FAILED,
        finishedAt: new Date(),
        errorSummary: sql`${scraperLogs.errorSummary} || ${JSON.stringify([
          {
            source: 'system',
            stage: 'SYSTEM',
            message: 'Eksekusi sebelumnya melebihi batas waktu 30 menit dan ditutup otomatis.',
          },
        ])}::jsonb`,
      })
      .where(
        and(
          eq(scraperLogs.status, ScraperRunStatusEnum.RUNNING),
          lte(scraperLogs.startedAt, staleCutoff),
        ),
      );

    // Pastikan tidak ada log RUNNING baru yang masih aktif (< 30 menit)
    const [activeRun] = await db
      .select({ id: scraperLogs.id })
      .from(scraperLogs)
      .where(eq(scraperLogs.status, ScraperRunStatusEnum.RUNNING))
      .limit(1);

    if (activeRun) {
      throw new ScrapeConflictError();
    }

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

async function executeLockedScrapePipeline(
  logId: string,
  params: RunScrapePipelineParams,
): Promise<ScrapeRunSummary> {
  const startedAtMs = Date.now();
  const mode: ScrapeRunMode = params.mode ?? 'ALL';
  const now = params.now ?? new Date();
  const lookbackDays = params.lookbackDays ?? 3;
  const fetchFn = params.fetchFn ?? safeFetchText;
  const cutoffDate = getWitaLookbackCutoff(now, lookbackDays);

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

  const errors: ScraperPortalErrorEntry[] = [];

  try {
    // -------------------------------------------------------------------------
    // Phase A: Link Discovery (Regional + Keyword Nasional)
    // -------------------------------------------------------------------------
    const rawCandidates: DiscoveredArticleCandidate[] = [];

    if (mode === 'ALL' || mode === 'REGIONAL_ONLY') {
      const regResult = await harvestRegionalPortals({
        portals: params.portals,
        fetchFn,
        now,
        lookbackDays,
      });
      portalsChecked = regResult.portalsChecked;
      rawCandidates.push(...regResult.candidates);
      errors.push(...regResult.errors);
    }

    if (mode === 'ALL' || mode === 'NATIONAL_ONLY') {
      const natResult = await harvestNationalKeywords({
        keywords: params.keywords,
        fetchFn,
        now,
        lookbackDays,
      });
      keywordsChecked = natResult.keywordsChecked;
      rawCandidates.push(...natResult.candidates);
      errors.push(...natResult.errors);
    }

    // Deduplikasi kandidat in-memory berdasarkan urlHash (memprioritaskan temuan awal)
    const uniqueCandidates: DiscoveredArticleCandidate[] = [];
    const seenCandidateHashes = new Set<string>();
    for (const item of rawCandidates) {
      if (!seenCandidateHashes.has(item.urlHash)) {
        seenCandidateHashes.add(item.urlHash);
        uniqueCandidates.push(item);
      }
    }

    articlesFetched = uniqueCandidates.length;

    // -------------------------------------------------------------------------
    // Phase B: Title Hard-Noise Filter (Khusus Nasional) & DB URL Deduplication
    // -------------------------------------------------------------------------
    const noiseFilteredCandidates: DiscoveredArticleCandidate[] = [];
    for (const candidate of uniqueCandidates) {
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

    const newCandidates: DiscoveredArticleCandidate[] = [];
    for (const candidate of noiseFilteredCandidates) {
      if (existingUrlHashes.has(candidate.urlHash)) {
        articlesDeduplicated += 1;
        continue;
      }
      newCandidates.push(candidate);
    }

    // -------------------------------------------------------------------------
    // Phase C: Concurrent HTML Fetch (max 2) + Word Threshold Extractor (150-250 kata)
    // -------------------------------------------------------------------------
    const extractedReady: ExtractedReadyArticle[] = [];
    const extractedSeenHashes = new Set<string>();

    await runWithConcurrency(newCandidates, FETCH_CONCURRENCY, async (candidate) => {
      try {
        let fetched = await fetchFn(candidate.url, {
          timeoutMs: 15_000,
          maxBytes: 2 * 1024 * 1024,
        });

        // Jika masih mendarat di wrapper HTML Google News, ikuti tautan penerbit target sekali lagi
        if (isGoogleWrapperHost(fetched.finalUrl)) {
          const externalTarget = extractRedirectTargetFromGoogleHtml(fetched.body);
          if (externalTarget) {
            fetched = await fetchFn(externalTarget, {
              timeoutMs: 15_000,
              maxBytes: 2 * 1024 * 1024,
            });
          }
        }

        const finalUrl = isSafeHttpUrl(fetched.finalUrl) ? fetched.finalUrl : candidate.url;
        const { normalizedUrl, urlHash } = hashNormalizedUrl(finalUrl);

        if (extractedSeenHashes.has(urlHash)) {
          articlesDeduplicated += 1;
          return;
        }

        const extracted = extractArticleContent(fetched.body, candidate.publishedHint);
        const publishedAt = extracted.publishedAt ?? candidate.publishedHint ?? now;

        // Jika halaman artikel memiliki tanggal jelas lebih tua dari jendela H-3 WITA, abaikan sebelum LLM
        if (extracted.publishedAt && !isWithinLookbackWindow(extracted.publishedAt, cutoffDate)) {
          articlesDeduplicated += 1;
          return;
        }

        if (!extracted.isValidContent) {
          errors.push({
            source: candidate.sourcePortal,
            stage: 'EXTRACT',
            message: `Konten teks terlalu pendek (${extracted.wordCount} kata bersih).`,
            url: finalUrl,
          });
          return;
        }

        extractedSeenHashes.add(urlHash);
        const resolvedPortal =
          candidate.sourceType === ArticleSourceTypeEnum.NATIONAL && !isGoogleWrapperHost(finalUrl)
            ? extractHostnameLabel(finalUrl)
            : candidate.sourcePortal;

        extractedReady.push({
          candidate,
          finalUrl,
          normalizedUrl,
          urlHash,
          sourcePortal: resolvedPortal,
          title: extracted.title.length >= 8 ? extracted.title : candidate.title,
          snippetText: extracted.snippetText,
          wordCount: extracted.wordCount,
          publishedAt,
        });
      } catch (err) {
        errors.push({
          source: candidate.sourcePortal,
          stage: 'FETCH',
          message: err instanceof Error ? err.message : String(err),
          url: candidate.url,
        });
      }
    });

    // Cek ulang hash URL final hasil redirect di DB sebelum memanggil LLM agar 0 token terbuang
    const existingFinalHashes = await queryExistingHashes(extractedReady.map((item) => item.urlHash));
    const readyForLlm: ExtractedReadyArticle[] = [];
    for (const item of extractedReady) {
      if (existingFinalHashes.has(item.urlHash)) {
        articlesDeduplicated += 1;
        continue;
      }
      readyForLlm.push(item);
    }

    // -------------------------------------------------------------------------
    // Phase D: Sequential Gemini Classification Worker + Circuit Breaker + Persist
    // -------------------------------------------------------------------------
    const worker = new GeminiClassificationWorker(params.workerOptions);
    let consecutiveRateLimitErrors = 0;
    let circuitBreakerOpen = false;

    for (const item of readyForLlm) {
      const defaultPeriod = getQuarterFromDateWita(item.publishedAt);
      const publishedAtWita = formatDateTimeWita(item.publishedAt);

      let persistenceFields: {
        isEconomicPhenomenon: boolean | null;
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

      if (circuitBreakerOpen) {
        llmFailedCount += 1;
        persistenceFields = {
          isEconomicPhenomenon: null,
          summary: null,
          kbliCategory: null,
          kbliImpact: null,
          expenditureComponent: null,
          expenditureImpact: null,
          quarter: defaultPeriod.quarter,
          year: defaultPeriod.year,
          llmModel: null,
          llmStatus: LlmStatusEnum.FAILED,
          llmError: 'CIRCUIT_BREAKER_QUOTA',
          llmConfidence: null,
          verificationStatus: VerificationStatusEnum.PENDING,
        };
      } else {
        const aiResult = await worker.classifyArticle({
          title: item.title,
          sourcePortal: item.sourcePortal,
          sourceType: item.candidate.sourceType,
          matchedKeyword: item.candidate.matchedKeyword,
          publishedAtWita,
          defaultQuarter: defaultPeriod.quarter,
          defaultYear: defaultPeriod.year,
          snippetText: item.snippetText,
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
          const mapped = mapClassificationToPersistence(aiResult.classification, aiResult.modelUsed);
          persistenceFields = {
            ...mapped,
          };
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

          if (aiResult.isRateLimit) {
            consecutiveRateLimitErrors += 1;
            if (consecutiveRateLimitErrors >= CIRCUIT_BREAKER_CONSECUTIVE_429_THRESHOLD) {
              circuitBreakerOpen = true;
              errors.push({
                source: 'gemini-worker',
                stage: 'LLM',
                message: `Circuit breaker aktif setelah ${CIRCUIT_BREAKER_CONSECUTIVE_429_THRESHOLD}x kegagalan 429 beruntun; sisa antrean disimpan untuk retry.`,
              });
            }
          } else {
            consecutiveRateLimitErrors = 0;
          }

          persistenceFields = {
            isEconomicPhenomenon: null,
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
    }

    const durationMs = Date.now() - startedAtMs;
    const avgResponseTimeMs = timedLlmCalls > 0 ? Math.round(totalResponseTimeMs / timedLlmCalls) : 0;

    const harvestErrors = errors.filter((e) => e.stage === 'HARVEST').length;
    const totalSourcesChecked = portalsChecked + keywordsChecked;

    let finalStatus: ScraperRunStatusEnum;
    if (totalSourcesChecked > 0 && harvestErrors >= totalSourcesChecked && articlesInserted === 0) {
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

    await db
      .update(scraperLogs)
      .set({
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
        errorSummary: errors.slice(0, 100),
        finishedAt: new Date(),
      })
      .where(eq(scraperLogs.id, logId));

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
      errors,
    };
  } catch (fatalErr) {
    const durationMs = Date.now() - startedAtMs;
    errors.push({
      source: 'pipeline',
      stage: 'SYSTEM',
      message: fatalErr instanceof Error ? fatalErr.message : String(fatalErr),
    });

    await db
      .update(scraperLogs)
      .set({
        status: ScraperRunStatusEnum.FAILED,
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
        durationMs,
        errorSummary: errors.slice(0, 100),
        finishedAt: new Date(),
      })
      .where(eq(scraperLogs.id, logId))
      .catch(() => {});

    throw fatalErr;
  }
}

/**
 * Menjalankan pipeline scraper secara penuh (blocking/awaitable) dengan PostgreSQL Advisory Lock.
 * Cocok untuk Nitro Scheduled Tasks & endpoint `/api/cron/trigger`.
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
 * Langsung mengembalikan `{ logId, status: 'RUNNING' }` untuk HTTP `202 Accepted` atau melempar `409`.
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
    workerOptions?: GeminiWorkerOptions;
  } = {},
): Promise<RetryLlmSummary> {
  const startedAtMs = Date.now();
  const limit = params.limit ?? 50;
  const worker = new GeminiClassificationWorker(params.workerOptions);

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
  const errors: ScraperPortalErrorEntry[] = [];

  try {
    // Hanya mengulang artikel yang masih menunggu review (jangan menimpa artikel yang sudah diverifikasi manual)
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

    for (const article of pendingFailedArticles) {
      if (circuitBreakerOpen) {
        failedCount += 1;
        continue;
      }

      processedCount += 1;
      const defaultPeriod = getQuarterFromDateWita(article.publishedAt);
      const result = await worker.classifyArticle({
        title: article.title,
        sourcePortal: article.sourcePortal,
        sourceType: article.sourceType,
        publishedAtWita: formatDateTimeWita(article.publishedAt),
        defaultQuarter: defaultPeriod.quarter,
        defaultYear: defaultPeriod.year,
        snippetText: article.snippetText,
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

        if (result.isRateLimit) {
          consecutiveRateLimitErrors += 1;
          if (consecutiveRateLimitErrors >= CIRCUIT_BREAKER_CONSECUTIVE_429_THRESHOLD) {
            circuitBreakerOpen = true;
            errors.push({
              source: 'gemini-worker',
              stage: 'LLM',
              message: `Circuit breaker aktif saat retry setelah ${CIRCUIT_BREAKER_CONSECUTIVE_429_THRESHOLD}x error 429 beruntun.`,
            });
          }
        } else {
          consecutiveRateLimitErrors = 0;
        }
      }
    }

    const durationMs = Date.now() - startedAtMs;
    const avgResponseTimeMs = timedLlmCalls > 0 ? Math.round(totalResponseTimeMs / timedLlmCalls) : 0;

    const finalStatus =
      failedCount === 0
        ? ScraperRunStatusEnum.SUCCESS
        : succeededCount > 0
          ? ScraperRunStatusEnum.PARTIAL
          : ScraperRunStatusEnum.FAILED;

    await db
      .update(scraperLogs)
      .set({
        status: finalStatus,
        articlesFetched: pendingFailedArticles.length,
        economicCount,
        nonEconomicCount,
        llmFailedCount: failedCount,
        totalInputTokens,
        totalOutputTokens,
        totalTokens,
        avgResponseTimeMs,
        durationMs,
        errorSummary: errors.slice(0, 100),
        finishedAt: new Date(),
      })
      .where(eq(scraperLogs.id, logId));

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
      errors,
    };
  } catch (fatalErr) {
    const durationMs = Date.now() - startedAtMs;
    errors.push({
      source: 'retry-llm',
      stage: 'SYSTEM',
      message: fatalErr instanceof Error ? fatalErr.message : String(fatalErr),
    });

    await db
      .update(scraperLogs)
      .set({
        status: ScraperRunStatusEnum.FAILED,
        llmFailedCount: failedCount,
        totalInputTokens,
        totalOutputTokens,
        totalTokens,
        durationMs,
        errorSummary: errors.slice(0, 100),
        finishedAt: new Date(),
      })
      .where(eq(scraperLogs.id, logId))
      .catch(() => {});

    throw fatalErr;
  }
}

export async function runRetryFailedLlmBatch(params: {
  triggeredBy?: string | null;
  limit?: number;
  workerOptions?: GeminiWorkerOptions;
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
  workerOptions?: GeminiWorkerOptions;
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

