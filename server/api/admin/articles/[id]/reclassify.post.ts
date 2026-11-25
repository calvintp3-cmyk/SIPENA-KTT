// server/api/admin/articles/[id]/reclassify.post.ts
import { eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { formatDateTimeWita, getQuarterFromDateWita } from '../../../../../shared/utils/period';
import { db } from '../../../../db';
import { articles } from '../../../../db/schema';
import { mapClassificationToPersistence } from '../../../../services/llm/classifier';
import { MultiLlmRouter } from '../../../../services/llm/router';
import { detectKttSubdistrict } from '../../../../services/scraper/geo-filter';
import { buildScraperPipelineRuntimeOptions } from '../../../../utils/llm-config';
import { invalidateOverviewCache } from '../../../../utils/overview-cache';
import { getValidatedUuidParam } from '../../../../utils/request';
import { requireAdminSession } from '../../../../utils/session';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const articleId = getValidatedUuidParam(event, 'id');

  const [existing] = await db
    .select()
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Not Found',
      message: 'Artikel tidak ditemukan di database.',
    });
  }

  const runtimeCfg = useRuntimeConfig(event);
  const { routerOptions } = buildScraperPipelineRuntimeOptions(runtimeCfg);
  const llmRouter = new MultiLlmRouter({
    task: 'classify',
    ...routerOptions,
  });

  if (llmRouter.configuredSlotCount === 0) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Service Unavailable',
      message:
        'Tidak ada API key LLM yang terkonfigurasi di server. Pastikan GEMINI_API_KEY / GROQ_API_KEY / CEREBRAS_API_KEY sudah diatur pada file .env.',
    });
  }

  const defaultPeriod = getQuarterFromDateWita(existing.publishedAt);
  const aiResult = await llmRouter.classifyArticle({
    title: existing.title,
    sourcePortal: existing.sourcePortal,
    sourceType: existing.sourceType,
    publishedAtWita: formatDateTimeWita(existing.publishedAt),
    defaultQuarter: defaultPeriod.quarter,
    defaultYear: defaultPeriod.year,
    snippetText: existing.snippetText,
  });

  if (!aiResult.ok) {
    const [failedUpdated] = await db
      .update(articles)
      .set({
        llmModel: aiResult.modelUsed ?? existing.llmModel,
        llmError: `[${aiResult.errorCode}] ${aiResult.errorMessage}`.slice(0, 500),
      })
      .where(eq(articles.id, articleId))
      .returning();

    throw createError({
      statusCode: 502,
      statusMessage: 'Bad Gateway',
      message: `Gagal menjalankan klasifikasi AI (${aiResult.errorCode}): ${aiResult.errorMessage}`,
      data: { item: failedUpdated },
    });
  }

  const mapped = mapClassificationToPersistence(
    aiResult.classification,
    aiResult.modelUsed,
    existing.snippetText,
  );
  const detectedSubdistrict =
    existing.subdistrict || detectKttSubdistrict(existing.title, existing.snippetText);

  const [updated] = await db
    .update(articles)
    .set({
      geographicScope: mapped.geographicScope,
      subdistrict: detectedSubdistrict,
      isEconomicPhenomenon: mapped.isEconomicPhenomenon,
      summary: mapped.summary,
      kbliCategory: mapped.kbliCategory,
      kbliImpact: mapped.kbliImpact,
      expenditureComponent: mapped.expenditureComponent,
      expenditureImpact: mapped.expenditureImpact,
      secondaryKbliCategory: mapped.secondaryKbliCategory,
      secondaryKbliImpact: mapped.secondaryKbliImpact,
      secondaryExpenditureComponent: mapped.secondaryExpenditureComponent,
      secondaryExpenditureImpact: mapped.secondaryExpenditureImpact,
      quarter: mapped.quarter,
      year: mapped.year,
      llmModel: mapped.llmModel,
      llmStatus: mapped.llmStatus,
      llmError: mapped.llmError,
      llmConfidence: mapped.llmConfidence,
      verificationStatus: mapped.verificationStatus,
    })
    .where(eq(articles.id, articleId))
    .returning();

  invalidateOverviewCache();
  return {
    item: updated,
    modelUsed: aiResult.modelUsed,
    providerUsed: aiResult.providerUsed,
    responseTimeMs: aiResult.responseTimeMs,
  };
});
