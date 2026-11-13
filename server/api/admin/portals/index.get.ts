// server/api/admin/portals/index.get.ts
import { count, desc, max, sql } from 'drizzle-orm';
import { defineEventHandler } from 'h3';
import { ArticleSourceTypeEnum } from '../../../../shared/enums/pdrb';
import { db } from '../../../db';
import { articles, scraperLogs } from '../../../db/schema';
import { REGIONAL_PORTALS } from '../../../services/scraper/portals';
import { requireAdminSession } from '../../../utils/session';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const [sourceAggRows, recentLogs] = await Promise.all([
    db
      .select({
        sourcePortal: articles.sourcePortal,
        sourceType: articles.sourceType,
        totalArticles: count(),
        verifiedArticles: sql<number>`count(*) filter (where ${articles.verificationStatus} = 'VERIFIED')::int`,
        pendingArticles: sql<number>`count(*) filter (where ${articles.verificationStatus} = 'PENDING')::int`,
        lastArticleAt: max(articles.publishedAt),
      })
      .from(articles)
      .groupBy(articles.sourcePortal, articles.sourceType),
    db
      .select({
        id: scraperLogs.id,
        startedAt: scraperLogs.startedAt,
        status: scraperLogs.status,
        portalsChecked: scraperLogs.portalsChecked,
        articlesInserted: scraperLogs.articlesInserted,
        errorSummary: scraperLogs.errorSummary,
      })
      .from(scraperLogs)
      .orderBy(desc(scraperLogs.startedAt))
      .limit(15),
  ]);

  const regionalPortalKeys = new Set(REGIONAL_PORTALS.map((p) => p.sourcePortal));

  const errorMap = new Map<
    string,
    { count: number; lastMessage: string | null; lastAt: string | null }
  >();
  for (const log of recentLogs) {
    const errors = Array.isArray(log.errorSummary) ? log.errorSummary : [];
    for (const entry of errors) {
      const key = entry.source;
      const existing = errorMap.get(key);
      const logAt = log.startedAt instanceof Date ? log.startedAt.toISOString() : String(log.startedAt);
      if (!existing) {
        errorMap.set(key, {
          count: 1,
          lastMessage: `[${entry.stage}] ${entry.message}`,
          lastAt: logAt,
        });
      } else {
        existing.count += 1;
      }
    }
  }

  const portals = REGIONAL_PORTALS.map((cfg) => {
    const matched = sourceAggRows.filter(
      (r) => r.sourcePortal === cfg.sourcePortal,
    );
    const totalArticles = matched.reduce((acc, r) => acc + Number(r.totalArticles), 0);
    const verifiedArticles = matched.reduce((acc, r) => acc + Number(r.verifiedArticles), 0);
    const pendingArticles = matched.reduce((acc, r) => acc + Number(r.pendingArticles), 0);
    const latestMs = matched.reduce<number | null>((best, r) => {
      if (!r.lastArticleAt) return best;
      const ms = new Date(r.lastArticleAt).getTime();
      return best === null || ms > best ? ms : best;
    }, null);
    const errStats = errorMap.get(cfg.sourcePortal);

    return {
      id: cfg.id,
      label: cfg.label,
      sourcePortal: cfg.sourcePortal,
      sourceType: ArticleSourceTypeEnum.REGIONAL,
      indexUrl: cfg.indexUrl,
      additionalIndexUrls: [...(cfg.additionalIndexUrls ?? [])],
      allowedHosts: [...cfg.allowedHosts],
      totalArticles,
      verifiedArticles,
      pendingArticles,
      lastArticleAt: latestMs ? new Date(latestMs).toISOString() : null,
      recentErrorsCount: errStats?.count ?? 0,
      lastErrorMessage: errStats?.lastMessage ?? null,
      lastErrorAt: errStats?.lastAt ?? null,
      isActive: cfg.isActive !== false,
      inactiveReason: cfg.inactiveReason ?? null,
    };
  });

  const otherSources = sourceAggRows
    .filter((r) => !regionalPortalKeys.has(r.sourcePortal))
    .map((r) => ({
      sourcePortal: r.sourcePortal,
      sourceType: r.sourceType,
      totalArticles: Number(r.totalArticles),
      verifiedArticles: Number(r.verifiedArticles),
      pendingArticles: Number(r.pendingArticles),
      lastArticleAt: r.lastArticleAt
        ? new Date(r.lastArticleAt).toISOString()
        : null,
    }))
    .sort((a, b) => b.totalArticles - a.totalArticles);

  const latestLog = recentLogs[0] ?? null;

  return {
    portals,
    otherSources,
    lastCrawlerRun: latestLog
      ? {
          id: latestLog.id,
          startedAt:
            latestLog.startedAt instanceof Date
              ? latestLog.startedAt.toISOString()
              : String(latestLog.startedAt),
          status: latestLog.status,
          portalsChecked: latestLog.portalsChecked,
          articlesInserted: latestLog.articlesInserted,
        }
      : null,
  };
});

