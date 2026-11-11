// server/api/admin/articles/batch.post.ts
import { inArray } from 'drizzle-orm';
import { defineEventHandler } from 'h3';
import { VerificationStatusEnum } from '../../../../shared/enums/pdrb';
import { BatchArticleActionSchema } from '../../../../shared/schemas/article.schema';
import { db } from '../../../db';
import { articles } from '../../../db/schema';
import { getMissingVerificationFields } from '../../../services/articles/query';
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

  return {
    action: body.action,
    updatedCount: validIds.length,
    updatedIds: validIds,
    incompleteItems,
  };
});

