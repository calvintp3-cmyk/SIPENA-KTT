// server/api/admin/articles/batch.post.ts
import { inArray } from 'drizzle-orm';
import { defineEventHandler } from 'h3';
import { VerificationStatusEnum } from '../../../../shared/enums/pdrb';
import { BatchArticleActionSchema } from '../../../../shared/schemas/article.schema';
import { db } from '../../../db';
import { articles } from '../../../db/schema';
import { getMissingVerificationFields } from '../../../services/articles/query';
import { invalidateOverviewCache } from '../../../utils/overview-cache';
import { parseBodyWithSchema } from '../../../utils/request';
import { requireAdminSession } from '../../../utils/session';

export default defineEventHandler(async (event) => {
  const adminUser = await requireAdminSession(event);
  const body = await parseBodyWithSchema(event, BatchArticleActionSchema);

  const uniqueIds = Array.from(new Set(body.ids));
  const selectedRows = await db
    .select()
    .from(articles)
    .where(inArray(articles.id, uniqueIds));

  if (selectedRows.length === 0) {
    return {
      action: body.action,
      updatedCount: 0,
      updatedIds: [],
      incompleteItems: [],
    };
  }

  if (body.action === 'RECLASSIFY') {
    const targetIds = selectedRows.map((row) => row.id);
    const updatePayload: Record<string, unknown> = {};

    if (body.kbliCategory) updatePayload.kbliCategory = body.kbliCategory;
    if (body.kbliImpact) updatePayload.kbliImpact = body.kbliImpact;
    if (body.expenditureComponent) updatePayload.expenditureComponent = body.expenditureComponent;
    if (body.expenditureImpact) updatePayload.expenditureImpact = body.expenditureImpact;

    // Normalisasi anti-duplikasi sektor/komponen sekunder
    if (body.secondaryKbliCategory !== undefined) {
      const isDuplicate = body.kbliCategory
        ? body.secondaryKbliCategory === body.kbliCategory
        : false;
      updatePayload.secondaryKbliCategory = isDuplicate ? null : body.secondaryKbliCategory;
      if (isDuplicate) {
        updatePayload.secondaryKbliImpact = null;
      }
    }
    if (body.secondaryKbliImpact !== undefined && !updatePayload.secondaryKbliImpact) {
      updatePayload.secondaryKbliImpact = body.secondaryKbliImpact;
    }

    if (body.secondaryExpenditureComponent !== undefined) {
      const isDuplicate = body.expenditureComponent
        ? body.secondaryExpenditureComponent === body.expenditureComponent
        : false;
      updatePayload.secondaryExpenditureComponent = isDuplicate ? null : body.secondaryExpenditureComponent;
      if (isDuplicate) {
        updatePayload.secondaryExpenditureImpact = null;
      }
    }
    if (body.secondaryExpenditureImpact !== undefined && !updatePayload.secondaryExpenditureImpact) {
      updatePayload.secondaryExpenditureImpact = body.secondaryExpenditureImpact;
    }

    if (Object.keys(updatePayload).length > 0) {
      await db
        .update(articles)
        .set(updatePayload)
        .where(inArray(articles.id, targetIds));
    }

    invalidateOverviewCache();
    return {
      action: body.action,
      updatedCount: targetIds.length,
      updatedIds: targetIds,
      incompleteItems: [],
    };
  }

  if (body.action === 'IGNORE') {
    const targetIds = selectedRows.map((row) => row.id);
    await db
      .update(articles)
      .set({
        verificationStatus: VerificationStatusEnum.IGNORED,
        verifiedBy: null,
        verifiedAt: null,
      })
      .where(inArray(articles.id, targetIds));

    invalidateOverviewCache();
    return {
      action: body.action,
      updatedCount: targetIds.length,
      updatedIds: targetIds,
      incompleteItems: [],
    };
  }

  // Action = VERIFY: pisahkan baris yang sudah lengkap dari baris yang klasifikasinya kosong (mis. LLM FAILED)
  const validIds: string[] = [];
  const incompleteItems: Array<{ id: string; title: string; missingFields: string[] }> = [];

  for (const row of selectedRows) {
    const missingFields = getMissingVerificationFields(row);
    if (missingFields.length > 0) {
      incompleteItems.push({
        id: row.id,
        title: row.title,
        missingFields,
      });
    } else {
      validIds.push(row.id);
    }
  }

  if (validIds.length > 0) {
    await db
      .update(articles)
      .set({
        verificationStatus: VerificationStatusEnum.VERIFIED,
        verifiedBy: adminUser.id,
        verifiedAt: new Date(),
      })
      .where(inArray(articles.id, validIds));
  }

  invalidateOverviewCache();
  return {
    action: body.action,
    updatedCount: validIds.length,
    updatedIds: validIds,
    incompleteItems,
  };
});

