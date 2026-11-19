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
import {
  countWords,
  extractArticleContent,
  isSameArticlePaginationUrl,
  normalizeToFullPageArticleUrl,
} from '../../../services/scraper/extractor';
import { detectKttSubdistrict } from '../../../services/scraper/geo-filter';
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
  const fetchUrl = normalizeToFullPageArticleUrl(body.url);
  let finalUrl = fetchUrl;

  try {
    const fetchRes = await safeFetchText(fetchUrl, { timeoutMs: 12_000 });
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

  let fullSnippetText = extracted.snippetText;
  let currentPageUrl = extracted.nextFullPageUrl;
  let pageIter = 0;
  const MAX_PAGES = 5;
  const visited = new Set<string>([finalUrl]);

  while (
    currentPageUrl &&
    pageIter < MAX_PAGES &&
    !visited.has(currentPageUrl) &&
    isSameArticlePaginationUrl(finalUrl, currentPageUrl)
  ) {
    visited.add(currentPageUrl);
    pageIter += 1;
    try {
      const nextPageRes = await safeFetchText(currentPageUrl, { timeoutMs: 8_000 });
      const nextExtracted = extractArticleContent(nextPageRes.body, publishedDate, nextPageRes.finalUrl);
      if (nextExtracted.isValidContent && !nextExtracted.isSoftBlocked) {
        if (
          currentPageUrl.includes('page=all') ||
          currentPageUrl.includes('show=all') ||
          currentPageUrl.includes('showpage=all') ||
          currentPageUrl.includes('single=1')
        ) {
          if (nextExtracted.wordCount >= countWords(fullSnippetText)) {
            fullSnippetText = nextExtracted.snippetText;
          }
          break;
        } else {
          fullSnippetText = `${fullSnippetText}\n\n${nextExtracted.snippetText}`.trim();
          currentPageUrl = nextExtracted.nextFullPageUrl;
        }
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  const subdistrict = detectKttSubdistrict(extracted.title, fullSnippetText);

  // Jalankan klasifikasi cepat dengan MultiLlmRouter
  let aiSummary = fullSnippetText ? fullSnippetText.slice(0, 320) : '';
  let kbliCategory = KbliCategoryEnum.A;
  let kbliImpact = KbliImpactEnum.INCREASE_NTB;
  let expenditureComponent = ExpenditureComponentEnum.PK_RT;
  let expenditureImpact = ExpenditureImpactEnum.INCREASE_REAL;
  let secondaryKbliCategory: KbliCategoryEnum | null = null;
  let secondaryKbliImpact: KbliImpactEnum | null = null;
  let secondaryExpenditureComponent: ExpenditureComponentEnum | null = null;
  let secondaryExpenditureImpact: ExpenditureImpactEnum | null = null;
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
      snippetText: fullSnippetText,
    });

    if (result.ok && result.classification) {
      const cls = result.classification;
      aiSummary = cls.summary || aiSummary;
      kbliCategory = (cls.kbli_category as KbliCategoryEnum) || kbliCategory;
      kbliImpact = (cls.kbli_impact as KbliImpactEnum) || kbliImpact;
      expenditureComponent = (cls.expenditure_component as ExpenditureComponentEnum) || expenditureComponent;
      expenditureImpact = (cls.expenditure_impact as ExpenditureImpactEnum) || expenditureImpact;

      const rawSecKbli = cls.secondary_kbli_category as KbliCategoryEnum | null | undefined;
      if (rawSecKbli && rawSecKbli !== kbliCategory) {
        secondaryKbliCategory = rawSecKbli;
        secondaryKbliImpact = (cls.secondary_kbli_impact as KbliImpactEnum) || null;
      }

      const rawSecExp = cls.secondary_expenditure_component as ExpenditureComponentEnum | null | undefined;
      if (rawSecExp && rawSecExp !== expenditureComponent) {
        secondaryExpenditureComponent = rawSecExp;
        secondaryExpenditureImpact = (cls.secondary_expenditure_impact as ExpenditureImpactEnum) || null;
      }

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
    snippetText: fullSnippetText,
    subdistrict: subdistrict ?? null,
    publishedAt: publishedAtStr,
    year: period.year,
    quarter: period.quarter,
    summary: aiSummary,
    kbliCategory,
    kbliImpact,
    secondaryKbliCategory,
    secondaryKbliImpact,
    expenditureComponent,
    expenditureImpact,
    secondaryExpenditureComponent,
    secondaryExpenditureImpact,
    confidence,
    llmModelUsed,
  };
});
