// server/api/admin/synthesis/generate.post.ts
import { and, desc, eq, inArray } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { VerificationStatusEnum } from '../../../../shared/enums/pdrb';
import { SynthesisGenerateSchema } from '../../../../shared/schemas/article.schema';
import { formatPeriodLabel } from '../../../../shared/utils/period';
import { db } from '../../../db';
import { articles } from '../../../db/schema';
import {
  buildGroundedBrsFallbackNarrative,
  resolveSynthesisTargetLabel,
} from '../../../services/analytics/pdrb-analytics';
import { buildBrsSynthesisPrompts } from '../../../services/llm/classifier';
import { generateSynthesisWithRouter } from '../../../services/llm/router';
import { buildRouterEnvFromRuntimeConfig } from '../../../utils/llm-config';
import { parseBodyWithSchema } from '../../../utils/request';
import { requireAdminSession } from '../../../utils/session';

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const body = await parseBodyWithSchema(event, SynthesisGenerateSchema);

  const selectedRows = await db
    .select({
      id: articles.id,
      title: articles.title,
      summary: articles.summary,
      sourcePortal: articles.sourcePortal,
      url: articles.url,
      kbliCategory: articles.kbliCategory,
      kbliImpact: articles.kbliImpact,
      expenditureComponent: articles.expenditureComponent,
      expenditureImpact: articles.expenditureImpact,
      publishedAt: articles.publishedAt,
      quarter: articles.quarter,
      year: articles.year,
    })
    .from(articles)
    .where(
      and(
        inArray(articles.id, Array.from(new Set(body.articleIds))),
        eq(articles.verificationStatus, VerificationStatusEnum.VERIFIED),
      ),
    )
    .orderBy(desc(articles.publishedAt));

  if (selectedRows.length === 0) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Entity',
      message: 'Tidak ada artikel berstatus Terverifikasi yang ditemukan dari pilihan Anda.',
    });
  }

  const periodLabel = formatPeriodLabel(body.quarter, body.year);
  const targetLabel = resolveSynthesisTargetLabel(body.dimension, body.targetCode);

  const citations = selectedRows.map((row, idx) => ({
    index: idx + 1,
    id: row.id,
    title: row.title,
    sourcePortal: row.sourcePortal,
    publishedAt:
      row.publishedAt instanceof Date ? row.publishedAt.toISOString() : String(row.publishedAt),
    url: row.url,
    kbliCategory: row.kbliCategory,
    kbliImpact: row.kbliImpact,
    expenditureComponent: row.expenditureComponent,
    expenditureImpact: row.expenditureImpact,
  }));

  const { systemInstruction, userPrompt } = buildBrsSynthesisPrompts({
    periodLabel,
    dimension: body.dimension,
    targetLabel,
    style: body.style,
    articles: selectedRows,
  });

  const runtimeCfg = useRuntimeConfig(event);
  const routerResult = await generateSynthesisWithRouter(
    { systemInstruction, userPrompt },
    {
      env: buildRouterEnvFromRuntimeConfig(runtimeCfg),
    },
  );

  let narrativeMarkdown: string;
  let modelUsed: string | null = null;
  let notice: string | null = null;
  let mode: 'llm' | 'template' = 'template';

  if (routerResult.ok) {
    narrativeMarkdown = routerResult.narrativeMarkdown;
    modelUsed = routerResult.modelUsed;
    mode = 'llm';
    notice = routerResult.notice;
  } else {
    narrativeMarkdown = buildGroundedBrsFallbackNarrative({
      periodLabel,
      dimension: body.dimension,
      targetCode: body.targetCode,
      style: body.style,
      articles: selectedRows,
    });
    mode = 'template';
    notice = routerResult.notice;
  }

  return {
    narrativeMarkdown,
    mode,
    modelUsed,
    notice,
    citations,
    generatedAt: new Date().toISOString(),
    articleCount: selectedRows.length,
  };
});
