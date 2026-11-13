// server/api/admin/articles/export.get.ts
import { desc } from 'drizzle-orm';
import { defineEventHandler, setResponseHeader } from 'h3';
import { ExportArticlesQuerySchema } from '../../../../shared/schemas/article.schema';
import { getWitaDateParts } from '../../../../shared/utils/period';
import { db } from '../../../db';
import { articles } from '../../../db/schema';
import { buildAdminArticleFilters } from '../../../services/articles/query';
import { generateArticlesCsvString } from '../../../services/export/csv';
import { generateArticlesExcelBuffer } from '../../../services/export/excel';
import { parseQueryWithSchema } from '../../../utils/request';
import { requireAdminSession } from '../../../utils/session';

const MAX_EXPORT_ROWS = 10_000;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function buildExportTimestampStamp(): string {
  const p = getWitaDateParts(new Date());
  return `${p.year}${pad2(p.month)}${pad2(p.day)}-${pad2(p.hour)}${pad2(p.minute)}`;
}

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const query = parseQueryWithSchema(event, ExportArticlesQuerySchema);
  const whereClause = buildAdminArticleFilters(query);

  const rows = await db
    .select()
    .from(articles)
    .where(whereClause)
    .orderBy(desc(articles.publishedAt), desc(articles.createdAt))
    .limit(MAX_EXPORT_ROWS);

  const stamp = buildExportTimestampStamp();
  setResponseHeader(event, 'Cache-Control', 'no-store');
  setResponseHeader(event, 'X-Export-Rows-Count', String(rows.length));
  setResponseHeader(event, 'X-Export-Truncated', rows.length >= MAX_EXPORT_ROWS ? 'true' : 'false');

  if (query.format === 'csv') {
    const csv = generateArticlesCsvString(rows);
    setResponseHeader(event, 'Content-Type', 'text/csv; charset=utf-8');
    setResponseHeader(
      event,
      'Content-Disposition',
      `attachment; filename="sipena-ktt-fenomena-pdrb-${stamp}.csv"`,
    );
    return csv;
  }

  const xlsxBuffer = await generateArticlesExcelBuffer(rows);
  setResponseHeader(
    event,
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  );
  setResponseHeader(
    event,
    'Content-Disposition',
    `attachment; filename="sipena-ktt-fenomena-pdrb-${stamp}.xlsx"`,
  );
  return xlsxBuffer;
});

