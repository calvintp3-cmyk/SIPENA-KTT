// server/api/admin/articles/[id].patch.ts
import { eq } from 'drizzle-orm';
import { createError, defineEventHandler } from 'h3';
import { VerificationStatusEnum } from '../../../../shared/enums/pdrb';
import { UpdateArticleReviewSchema } from '../../../../shared/schemas/article.schema';
import { db } from '../../../db';
import { articles } from '../../../db/schema';
import { getMissingVerificationFields } from '../../../services/articles/query';
import { invalidateOverviewCache } from '../../../utils/overview-cache';
import { getValidatedUuidParam, parseBodyWithSchema } from '../../../utils/request';
import { requireAdminSession } from '../../../utils/session';

export default defineEventHandler(async (event) => {
  const adminUser = await requireAdminSession(event);
  const articleId = getValidatedUuidParam(event, 'id');
  const body = await parseBodyWithSchema(event, UpdateArticleReviewSchema);

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

  const nextState = {
    title: body.title ?? existing.title,
    summary: body.summary !== undefined ? body.summary : existing.summary,
    isEconomicPhenomenon:
      body.isEconomicPhenomenon !== undefined
        ? body.isEconomicPhenomenon
        : existing.isEconomicPhenomenon,
    kbliCategory: body.kbliCategory !== undefined ? body.kbliCategory : existing.kbliCategory,
    kbliImpact: body.kbliImpact !== undefined ? body.kbliImpact : existing.kbliImpact,
    expenditureComponent:
      body.expenditureComponent !== undefined
        ? body.expenditureComponent
        : existing.expenditureComponent,
    expenditureImpact:
      body.expenditureImpact !== undefined ? body.expenditureImpact : existing.expenditureImpact,
    secondaryKbliCategory:
      body.secondaryKbliCategory !== undefined
        ? body.secondaryKbliCategory
        : existing.secondaryKbliCategory,
    secondaryKbliImpact:
      body.secondaryKbliImpact !== undefined
        ? body.secondaryKbliImpact
        : existing.secondaryKbliImpact,
    secondaryExpenditureComponent:
      body.secondaryExpenditureComponent !== undefined
        ? body.secondaryExpenditureComponent
        : existing.secondaryExpenditureComponent,
    secondaryExpenditureImpact:
      body.secondaryExpenditureImpact !== undefined
        ? body.secondaryExpenditureImpact
        : existing.secondaryExpenditureImpact,
    quarter: body.quarter ?? existing.quarter,
    year: body.year ?? existing.year,
    verificationStatus: body.verificationStatus ?? existing.verificationStatus,
  };

  if (nextState.verificationStatus === VerificationStatusEnum.VERIFIED) {
    // Jika admin langsung klik "Verifikasi" atau "Rescue" tanpa menyentuh toggle isEconomicPhenomenon,
    // namun 4 field klasifikasi & ringkasan sudah lengkap, otomatis sahkan isEconomicPhenomenon = true.
    if (
      body.verificationStatus === VerificationStatusEnum.VERIFIED &&
      body.isEconomicPhenomenon === undefined &&
      nextState.summary &&
      nextState.kbliCategory &&
      nextState.kbliImpact &&
      nextState.expenditureComponent &&
      nextState.expenditureImpact
    ) {
      nextState.isEconomicPhenomenon = true;
    }

    const missingFields = getMissingVerificationFields(nextState);
    if (missingFields.length > 0) {
      throw createError({
        statusCode: 422,
        statusMessage: 'Unprocessable Entity',
        message: `Artikel belum dapat diverifikasi karena field wajib belum lengkap: ${missingFields.join(', ')}.`,
        data: { missingFields },
      });
    }
  }

  const nextVerifiedBy =
    nextState.verificationStatus === VerificationStatusEnum.VERIFIED ? adminUser.id : null;
  const nextVerifiedAt =
    nextState.verificationStatus === VerificationStatusEnum.VERIFIED ? new Date() : null;

  const [updated] = await db
    .update(articles)
    .set({
      ...nextState,
      verifiedBy: nextVerifiedBy,
      verifiedAt: nextVerifiedAt,
    })
    .where(eq(articles.id, articleId))
    .returning();

  invalidateOverviewCache();
  return { item: updated };
});

