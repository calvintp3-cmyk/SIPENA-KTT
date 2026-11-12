// server/api/admin/scrapers/logs.get.ts
import { and, count, desc, eq, gt, gte, sql } from 'drizzle-orm';
import { defineEventHandler } from 'h3';
import {
  LlmStatusEnum,
  ScraperRunStatusEnum,
  VerificationStatusEnum,
} from '../../../../shared/enums/pdrb';
import { ScraperLogsQuerySchema } from '../../../../shared/schemas/article.schema';
import { db } from '../../../db';
import {
  articles,
  scraperLogs,
  users,
  type ScraperProviderStatEntry,
} from '../../../db/schema';
import { getConfiguredProviderHealthSummary } from '../../../services/llm/router';
import { STALE_RUN_TIMEOUT_MS } from '../../../services/scraper/pipeline';
import { buildRouterEnvFromRuntimeConfig } from '../../../utils/llm-config';
import { parseQueryWithSchema } from '../../../utils/request';
import { requireAdminSession } from '../../../utils/session';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const query = parseQueryWithSchema(event, ScraperLogsQuerySchema);
  const offset = (query.page - 1) * query.limit;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000);
  const activeRunCutoff = new Date(Date.now() - STALE_RUN_TIMEOUT_MS);
  const runtimeCfg = useRuntimeConfig(event);

  const [
    items,
    [totalRow],
    [latestRun],
    [activeRunRow],
    [stats30dRow],
    providerStatRows30d,
    [pendingFailedRow],
    [totalFailedRow],
  ] = await Promise.all([
    db
      .select({
        id: scraperLogs.id,
        runType: scraperLogs.runType,
        status: scraperLogs.status,
        portalsChecked: scraperLogs.portalsChecked,
        keywordsChecked: scraperLogs.keywordsChecked,
        articlesFetched: scraperLogs.articlesFetched,
        articlesDeduplicated: scraperLogs.articlesDeduplicated,
        articlesInserted: scraperLogs.articlesInserted,
        economicCount: scraperLogs.economicCount,
        nonEconomicCount: scraperLogs.nonEconomicCount,
        llmFailedCount: scraperLogs.llmFailedCount,
        totalInputTokens: scraperLogs.totalInputTokens,
        totalOutputTokens: scraperLogs.totalOutputTokens,
        totalTokens: scraperLogs.totalTokens,
        avgResponseTimeMs: scraperLogs.avgResponseTimeMs,
        durationMs: scraperLogs.durationMs,
        errorSummary: scraperLogs.errorSummary,
        providerStats: scraperLogs.providerStats,
        triggeredBy: scraperLogs.triggeredBy,
        triggeredByName: users.name,
        startedAt: scraperLogs.startedAt,
        finishedAt: scraperLogs.finishedAt,
      })
      .from(scraperLogs)
      .leftJoin(users, eq(scraperLogs.triggeredBy, users.id))
      .orderBy(desc(scraperLogs.startedAt))
      .limit(query.limit)
      .offset(offset),
    db.select({ total: count() }).from(scraperLogs),
    db
      .select()
      .from(scraperLogs)
      .orderBy(desc(scraperLogs.startedAt))
      .limit(1),
    db
      .select({ id: scraperLogs.id })
      .from(scraperLogs)
      .where(
        and(
          eq(scraperLogs.status, ScraperRunStatusEnum.RUNNING),
          gt(scraperLogs.startedAt, activeRunCutoff),
        ),
      )
      .limit(1),
    db
      .select({
        totalInputTokens: sql<number>`coalesce(sum(${scraperLogs.totalInputTokens}), 0)::int`,
        totalOutputTokens: sql<number>`coalesce(sum(${scraperLogs.totalOutputTokens}), 0)::int`,
        totalTokens: sql<number>`coalesce(sum(${scraperLogs.totalTokens}), 0)::int`,
        articlesFetched: sql<number>`coalesce(sum(${scraperLogs.articlesFetched}), 0)::int`,
        articlesDeduplicated: sql<number>`coalesce(sum(${scraperLogs.articlesDeduplicated}), 0)::int`,
        articlesInserted: sql<number>`coalesce(sum(${scraperLogs.articlesInserted}), 0)::int`,
      })
      .from(scraperLogs)
      .where(gte(scraperLogs.startedAt, thirtyDaysAgo)),
    db
      .select({ providerStats: scraperLogs.providerStats })
      .from(scraperLogs)
      .where(gte(scraperLogs.startedAt, thirtyDaysAgo)),
    db
      .select({ total: count() })
      .from(articles)
      .where(
        and(
          eq(articles.llmStatus, LlmStatusEnum.FAILED),
          eq(articles.verificationStatus, VerificationStatusEnum.PENDING),
        ),
      ),
    db
      .select({ total: count() })
      .from(articles)
      .where(eq(articles.llmStatus, LlmStatusEnum.FAILED)),
  ]);

  const providerStats30d: Record<string, ScraperProviderStatEntry> = {};
  for (const row of providerStatRows30d) {
    const map = row.providerStats;
    if (!map || typeof map !== 'object') continue;
    for (const [slotId, entry] of Object.entries(map)) {
      if (!entry || typeof entry !== 'object') continue;
      const existing = providerStats30d[slotId];
      if (!existing) {
        providerStats30d[slotId] = { ...entry };
      } else {
        existing.calls += entry.calls ?? 0;
        existing.successes += entry.successes ?? 0;
        existing.rateLimits += entry.rateLimits ?? 0;
        existing.failures += entry.failures ?? 0;
        existing.inputTokens += entry.inputTokens ?? 0;
        existing.outputTokens += entry.outputTokens ?? 0;
        existing.totalTokens += entry.totalTokens ?? 0;
        existing.totalLatencyMs += entry.totalLatencyMs ?? 0;
      }
    }
  }

  const providerHealth = getConfiguredProviderHealthSummary(
    buildRouterEnvFromRuntimeConfig(runtimeCfg),
  );

  const total = Number(totalRow?.total ?? 0);
  const totalPages = Math.max(1, Math.ceil(total / query.limit));

  const fetched30d = Number(stats30dRow?.articlesFetched ?? 0);
  const dedup30d = Number(stats30dRow?.articlesDeduplicated ?? 0);
  const deduplicationRatePercent =
    fetched30d > 0 ? Math.round((dedup30d / fetched30d) * 1000) / 10 : 0;

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages,
    },
    observability: {
      isRunning: Boolean(activeRunRow),
      runningLogId: activeRunRow?.id ?? null,
      latestRun: latestRun ?? null,
      pendingLlmFailedCount: Number(pendingFailedRow?.total ?? 0),
      totalLlmFailedCount: Number(totalFailedRow?.total ?? 0),
      providerHealth,
      providerStats30d,
      tokenStats30d: {
        totalInputTokens: Number(stats30dRow?.totalInputTokens ?? 0),
        totalOutputTokens: Number(stats30dRow?.totalOutputTokens ?? 0),
        totalTokens: Number(stats30dRow?.totalTokens ?? 0),
        articlesFetched: fetched30d,
        articlesDeduplicated: dedup30d,
        articlesInserted: Number(stats30dRow?.articlesInserted ?? 0),
        deduplicationRatePercent,
      },
    },
  };
});
