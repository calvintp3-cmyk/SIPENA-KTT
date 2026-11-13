// server/api/admin/articles/extract-url.post.ts
import { createError, defineEventHandler } from 'h3';
import { z } from 'zod';
import {
  ArticleSourceTypeEnum,
  KbliCategoryEnum,
  KbliImpactEnum,
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
} from '../../../../shared/enums/pdrb';
import { getQuarterFromDateWita, getWitaDateParts, formatDateTimeWita } from '../../../../shared/utils/period';
import { MultiLlmRouter } from '../../../services/llm/router';
import { extractArticleContent } from '../../../services/scraper/extractor';
import { parseBodyWithSchema } from '../../../utils/request';
import { requireAdminSession } from '../../../utils/session';
import { safeFetchText } from '../../../utils/ssrf';

const ExtractUrlRequestSchema = z.object({
  url: z.string().trim().url('URL berita tidak valid.'),
});

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const body = await parseBodyWithSchema(event, ExtractUrlRequestSchema);

  let html = '';
  let finalUrl = body.url;

  try {
    const fetchRes = await safeFetchText(body.url, { timeoutMs: 12_000 });
    html = fetchRes.body;
    finalUrl = fetchRes.finalUrl;
  } catch (err) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Entity',
      message: `Gagal mengunduh halaman dari URL tersebut: ${err instanceof Error ? err.message : String(err)}`,
    });
  }

  const extracted = extractArticleContent(html, new Date(), finalUrl);
  if (!extracted.title || extracted.title.length < 5) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Entity',
      message: 'Gagal mengekstrak judul artikel berita dari halaman web tersebut.',
    });
  }

  let domain = 'Internet';
  try {
    domain = new URL(finalUrl).hostname.replace(/^www\./i, '');
  } catch {
    // fallback
  }

  const publishedDate = extracted.publishedAt ?? new Date();
  const dateParts = getWitaDateParts(publishedDate);
  const publishedAtStr = `${dateParts.year}-${String(dateParts.month).padStart(2, '0')}-${String(dateParts.day).padStart(2, '0')}`;
  const period = getQuarterFromDateWita(publishedDate);

  // Jalankan klasifikasi cepat dengan MultiLlmRouter
  let aiSummary = extracted.snippetText ? extracted.snippetText.slice(0, 320) : '';
  let kbliCategory = KbliCategoryEnum.A;
  let kbliImpact = KbliImpactEnum.INCREASE_NTB;
  let expenditureComponent = ExpenditureComponentEnum.PK_RT;
  let expenditureImpact = ExpenditureImpactEnum.INCREASE_REAL;
  let confidence: number | null = null;
  let llmModelUsed: string | null = null;

  try {
    const router = new MultiLlmRouter();
    const result = await router.classifyArticle({
      title: extracted.title,
      sourcePortal: domain,
      sourceType: ArticleSourceTypeEnum.MANUAL,
      publishedAtWita: formatDateTimeWita(publishedDate),
      defaultQuarter: period.quarter,
      defaultYear: period.year,
      snippetText: extracted.snippetText,
    });

    if (result.ok && result.classification) {
      const cls = result.classification;
      aiSummary = cls.summary || aiSummary;
      kbliCategory = (cls.kbli_category as KbliCategoryEnum) || kbliCategory;
      kbliImpact = (cls.kbli_impact as KbliImpactEnum) || kbliImpact;
      expenditureComponent = (cls.expenditure_component as ExpenditureComponentEnum) || expenditureComponent;
      expenditureImpact = (cls.expenditure_impact as ExpenditureImpactEnum) || expenditureImpact;
      confidence = typeof cls.confidence === 'number' ? cls.confidence : null;
      llmModelUsed = result.modelUsed;
    }
  } catch {
    // LLM optional, fallback ke teks ekstraksi
  }

  return {
    url: finalUrl,
    sourcePortal: domain,
    title: extracted.title,
    snippetText: extracted.snippetText,
    publishedAt: publishedAtStr,
    year: period.year,
    quarter: period.quarter,
    summary: aiSummary,
    kbliCategory,
    kbliImpact,
    expenditureComponent,
    expenditureImpact,
    confidence,
    llmModelUsed,
  };
});
