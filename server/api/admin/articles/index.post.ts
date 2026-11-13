// server/api/admin/articles/index.post.ts
import { createError, defineEventHandler, setResponseStatus } from 'h3';
import {
  ArticleSourceTypeEnum,
  LlmStatusEnum,
  VerificationStatusEnum,
} from '../../../../shared/enums/pdrb';
import { CreateManualArticleSchema } from '../../../../shared/schemas/article.schema';
import { getQuarterFromDateWita, WITA_UTC_OFFSET } from '../../../../shared/utils/period';
import { db } from '../../../db';
import { articles } from '../../../db/schema';
import { countWords } from '../../../services/scraper/extractor';
import { invalidateOverviewCache } from '../../../utils/overview-cache';
import { parseBodyWithSchema } from '../../../utils/request';
import { requireAdminSession } from '../../../utils/session';
import { hashNormalizedUrl } from '../../../utils/url-hash';

function isPgUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const candidate = err as { code?: unknown; cause?: { code?: unknown } };
  return candidate.code === '23505' || candidate.cause?.code === '23505';
}

export default defineEventHandler(async (event) => {
  const adminUser = await requireAdminSession(event);
  const body = await parseBodyWithSchema(event, CreateManualArticleSchema);

  const publishedAtDate = /^\d{4}-\d{2}-\d{2}$/.test(body.publishedAt)
    ? new Date(`${body.publishedAt}T08:00:00${WITA_UTC_OFFSET}`)
    : new Date(body.publishedAt);

  if (Number.isNaN(publishedAtDate.getTime())) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Unprocessable Entity',
      message: 'Format tanggal rilis berita tidak valid.',
    });
  }

  const defaultPeriod = getQuarterFromDateWita(publishedAtDate);
  const quarter = body.quarter ?? defaultPeriod.quarter;
  const year = body.year ?? defaultPeriod.year;

  const { normalizedUrl, urlHash } = hashNormalizedUrl(body.url);
  const verificationStatus = body.verifyImmediately
    ? VerificationStatusEnum.VERIFIED
    : VerificationStatusEnum.PENDING;

  try {
    const [created] = await db
      .insert(articles)
      .values({
        url: normalizedUrl,
        urlHash,
        sourceType: ArticleSourceTypeEnum.MANUAL,
        sourcePortal: body.sourcePortal,
        title: body.title,
        snippetText: body.snippetText,
        wordCount: countWords(body.snippetText),
        publishedAt: publishedAtDate,
        quarter,
        year,
        isEconomicPhenomenon: true,
        summary: body.summary,
        kbliCategory: body.kbliCategory,
        kbliImpact: body.kbliImpact,
        secondaryKbliCategory:
          body.secondaryKbliCategory && body.secondaryKbliCategory !== body.kbliCategory
            ? body.secondaryKbliCategory
            : null,
        secondaryKbliImpact:
          body.secondaryKbliCategory && body.secondaryKbliCategory !== body.kbliCategory
            ? (body.secondaryKbliImpact ?? null)
            : null,
        expenditureComponent: body.expenditureComponent,
        expenditureImpact: body.expenditureImpact,
        secondaryExpenditureComponent:
          body.secondaryExpenditureComponent &&
          body.secondaryExpenditureComponent !== body.expenditureComponent
            ? body.secondaryExpenditureComponent
            : null,
        secondaryExpenditureImpact:
          body.secondaryExpenditureComponent &&
          body.secondaryExpenditureComponent !== body.expenditureComponent
            ? (body.secondaryExpenditureImpact ?? null)
            : null,
        llmModel: null,
        llmStatus: LlmStatusEnum.SKIPPED_MANUAL,
        llmError: null,
        llmConfidence: null,
        verificationStatus,
        verifiedBy: body.verifyImmediately ? adminUser.id : null,
        verifiedAt: body.verifyImmediately ? new Date() : null,
        createdBy: adminUser.id,
      })
      .returning();

    invalidateOverviewCache();
    setResponseStatus(event, 201);
    return { item: created };
  } catch (err) {
    if (isPgUniqueViolation(err)) {
      throw createError({
        statusCode: 409,
        statusMessage: 'Conflict',
        message: 'URL atau referensi berita ini sudah tercatat di Bank Data.',
      });
    }
    throw err;
  }
});

