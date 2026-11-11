// server/services/export/excel.ts
import ExcelJS from 'exceljs';
import {
  EXPENDITURE_COMPONENT_LABELS,
  EXPENDITURE_IMPACT_LABELS,
  KBLI_CATEGORY_META,
  KBLI_IMPACT_LABELS,
  VERIFICATION_STATUS_LABELS,
} from '../../../shared/enums/pdrb';
import { formatDateId, formatPeriodLabel } from '../../../shared/utils/period';
import type { ArticleRecord } from '../../db/schema';
import { isSafeHttpUrl } from '../../utils/url-hash';

export const EXPORT_WORKSHEET_NAME = 'Fenomena PDRB KTT';

/**
 * Urutan 10 kolom baku resmi Nerwilis BPS Kab. Tana Tidung (docs/design.md §3.4 & PRD Epic 4).
 */
export const OFFICIAL_EXPORT_HEADERS = [
  'Waktu Rilis Berita',
  'Judul Berita',
  'Kategori Lapangan Usaha (KBLI)',
  'Dampak Sisi Lapangan Usaha',
  'Komponen PDRB Pengeluaran',
  'Dampak Sisi Pengeluaran',
  'Ringkasan Berita',
  'Sumber Berita (URL)',
  'Periode Berita',
  'Status Verifikasi',
] as const;

export type ExportRowTuple = [
  string, // 1. Waktu Rilis Berita (dd/mm/yyyy)
  string, // 2. Judul Berita
  string, // 3. Kategori Lapangan Usaha (KBLI)
  string, // 4. Dampak Sisi Lapangan Usaha
  string, // 5. Komponen PDRB Pengeluaran
  string, // 6. Dampak Sisi Pengeluaran
  string, // 7. Ringkasan Berita
  string, // 8. Sumber Berita (URL)
  string, // 9. Periode Berita (Triwulan & Tahun)
  string, // 10. Status Verifikasi
];

const COLUMN_WIDTHS = [18, 42, 34, 24, 32, 28, 55, 40, 18, 18] as const;

export function formatArticleExportRow(article: ArticleRecord): ExportRowTuple {
  const kbliLabel = article.kbliCategory
    ? KBLI_CATEGORY_META[article.kbliCategory]?.fullLabel ?? article.kbliCategory
    : '-';
  const kbliImpactLabel = article.kbliImpact
    ? KBLI_IMPACT_LABELS[article.kbliImpact] ?? article.kbliImpact
    : '-';
  const expComponentLabel = article.expenditureComponent
    ? EXPENDITURE_COMPONENT_LABELS[article.expenditureComponent]?.short ??
      article.expenditureComponent
    : '-';
  const expImpactLabel = article.expenditureImpact
    ? EXPENDITURE_IMPACT_LABELS[article.expenditureImpact] ?? article.expenditureImpact
    : '-';

  return [
    formatDateId(article.publishedAt),
    article.title,
    kbliLabel,
    kbliImpactLabel,
    expComponentLabel,
    expImpactLabel,
    article.summary ?? article.snippetText,
    article.url,
    formatPeriodLabel(article.quarter, article.year),
    VERIFICATION_STATUS_LABELS[article.verificationStatus] ?? article.verificationStatus,
  ];
}

/**
 * Menghasilkan buffer berkas Excel `.xlsx` dengan struktur mutlak 10 kolom resmi Nerwilis.
 */
export async function generateArticlesExcelBuffer(
  rows: ReadonlyArray<ArticleRecord>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SIPENA KTT - BPS Kabupaten Tana Tidung';
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet(EXPORT_WORKSHEET_NAME, {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = OFFICIAL_EXPORT_HEADERS.map((header, idx) => ({
    header,
    key: `col_${idx + 1}`,
    width: COLUMN_WIDTHS[idx] ?? 22,
  }));

  const headerRow = sheet.getRow(1);
  headerRow.height = 28;
  headerRow.eachCell((cell) => {
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF0D9488' }, // Teal-600 identitas SIPENA KTT
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: 'center',
      wrapText: true,
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF0F766E' } },
      left: { style: 'thin', color: { argb: 'FF0F766E' } },
      bottom: { style: 'medium', color: { argb: 'FF0F766E' } },
      right: { style: 'thin', color: { argb: 'FF0F766E' } },
    };
  });

  for (const article of rows) {
    const tuple = formatArticleExportRow(article);
    const addedRow = sheet.addRow([...tuple]);

    addedRow.eachCell((cell, colNumber) => {
      cell.font = {
        name: 'Calibri',
        size: 10,
        color: { argb: 'FF0F172A' },
      };

      const isCentered = colNumber === 1 || colNumber === 9 || colNumber === 10;
      cell.alignment = {
        vertical: 'top',
        horizontal: isCentered ? 'center' : 'left',
        wrapText: true,
      };

      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };

      if (colNumber === 8 && isSafeHttpUrl(tuple[7])) {
        cell.value = {
          text: tuple[7],
          hyperlink: tuple[7],
        };
        cell.font = {
          name: 'Calibri',
          size: 10,
          color: { argb: 'FF0369A1' },
          underline: true,
        };
      }
    });
  }

  sheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: Math.max(1, rows.length + 1), column: OFFICIAL_EXPORT_HEADERS.length },
  };

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

