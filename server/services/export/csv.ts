// server/services/export/csv.ts
import type { ArticleRecord } from '../../db/schema';
import { formatArticleExportRow, OFFICIAL_EXPORT_HEADERS } from './excel';

const UTF8_BOM = '\uFEFF';
const FORMULA_INJECTION_REGEX = /^[\s]*[=+\-@\t\r]/;

/**
 * Menetralkan potensi CSV Formula Injection (=, +, -, @, TAB, CR) dan membungkus sel RFC-4180.
 */
export function sanitizeAndEscapeCsvCell(rawValue: string): string {
  const normalized = rawValue.replace(/\r\n|\r|\n/g, ' ');
  const neutralized = FORMULA_INJECTION_REGEX.test(normalized)
    ? `'${normalized}`
    : normalized;

  const escaped = neutralized.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Menghasilkan string CSV dengan UTF-8 BOM (ramah Microsoft Excel Indonesia), pemisah koma,
 * CRLF baris, proteksi formula injection, dan urutan mutlak 10 kolom resmi Nerwilis.
 */
export function generateArticlesCsvString(rows: ReadonlyArray<ArticleRecord>): string {
  const headerLine = OFFICIAL_EXPORT_HEADERS.map((h) => sanitizeAndEscapeCsvCell(h)).join(',');
  const dataLines = rows.map((article) =>
    formatArticleExportRow(article)
      .map((cell) => sanitizeAndEscapeCsvCell(cell))
      .join(','),
  );

  return `${UTF8_BOM}${[headerLine, ...dataLines].join('\r\n')}\r\n`;
}

