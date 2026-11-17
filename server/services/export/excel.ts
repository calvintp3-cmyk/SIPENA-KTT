// server/services/export/excel.ts
import ExcelJS from 'exceljs';
import {
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  EXPENDITURE_COMPONENT_LABELS,
  EXPENDITURE_IMPACT_LABELS,
  KbliCategoryEnum,
  KbliImpactEnum,
  KBLI_CATEGORY_META,
  KBLI_IMPACT_LABELS,
  VERIFICATION_STATUS_LABELS,
} from '../../../shared/enums/pdrb';
import { formatDateId, formatPeriodLabel } from '../../../shared/utils/period';
import type { ArticleRecord } from '../../db/schema';
import { isSafeHttpUrl } from '../../utils/url-hash';

export const EXPORT_WORKSHEET_NAME = 'Fenomena PDRB KTT';
export const EXPORT_BRIDGING_WORKSHEET_NAME = 'Bridging 17 Sektor PDRB BPS';

export interface Bps17SectorDef {
  code: string;
  name: string;
  kbli2025: ReadonlyArray<string>;
}

export const BPS_17_SECTORS: ReadonlyArray<Bps17SectorDef> = [
  { code: 'A', name: 'Pertanian, Kehutanan, dan Perikanan', kbli2025: ['A'] },
  { code: 'B', name: 'Pertambangan dan Penggalian', kbli2025: ['B'] },
  { code: 'C', name: 'Industri Pengolahan', kbli2025: ['C'] },
  { code: 'D', name: 'Pengadaan Listrik dan Gas', kbli2025: ['D'] },
  { code: 'E', name: 'Pengadaan Air, Pengelolaan Sampah, Limbah dan Daur Ulang', kbli2025: ['E'] },
  { code: 'F', name: 'Konstruksi', kbli2025: ['F'] },
  { code: 'G', name: 'Perdagangan Besar dan Eceran; Reparasi Mobil dan Sepeda Motor', kbli2025: ['G'] },
  { code: 'H', name: 'Transportasi dan Pergudangan', kbli2025: ['H'] },
  { code: 'I', name: 'Penyediaan Akomodasi dan Makan Minum', kbli2025: ['I'] },
  { code: 'J', name: 'Informasi dan Komunikasi', kbli2025: ['J', 'K'] },
  { code: 'K', name: 'Jasa Keuangan dan Asuransi', kbli2025: ['L'] },
  { code: 'L', name: 'Real Estat', kbli2025: ['M'] },
  { code: 'M,N', name: 'Jasa Perusahaan', kbli2025: ['N', 'O'] },
  { code: 'O', name: 'Administrasi Pemerintahan, Pertahanan dan Jaminan Sosial Wajib', kbli2025: ['P'] },
  { code: 'P', name: 'Jasa Pendidikan', kbli2025: ['Q'] },
  { code: 'Q', name: 'Jasa Kesehatan dan Kegiatan Sosial', kbli2025: ['R'] },
  { code: 'R,S,T,U', name: 'Jasa Lainnya', kbli2025: ['S', 'T', 'U', 'V'] },
] as const;

export interface BpsExpenditureDef {
  code: string;
  name: string;
}

export const BPS_EXPENDITURE_COMPONENTS: ReadonlyArray<BpsExpenditureDef> = [
  { code: ExpenditureComponentEnum.PK_RT, name: 'Pengeluaran Konsumsi Rumah Tangga (PK-RT)' },
  { code: ExpenditureComponentEnum.PK_LNPRT, name: 'Pengeluaran Konsumsi Lembaga Non-Profit yang Melayani Rumah Tangga (PK-LNPRT)' },
  { code: ExpenditureComponentEnum.PK_P, name: 'Pengeluaran Konsumsi Pemerintah (PK-P)' },
  { code: ExpenditureComponentEnum.PMTB, name: 'Pembentukan Modal Tetap Bruto (PMTB / Investasi)' },
  { code: ExpenditureComponentEnum.NET_EXPORT, name: 'Ekspor Bersih Antardaerah / Luar Negeri' },
  { code: ExpenditureComponentEnum.INVENTORY_CHANGE, name: 'Perubahan Inventori' },
] as const;

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
  'Lokus / Kecamatan (KTT)',
  'Catatan Kurator',
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
  string, // 11. Lokus / Kecamatan (KTT)
  string, // 12. Catatan Kurator
];

const COLUMN_WIDTHS = [18, 42, 34, 24, 32, 28, 55, 40, 18, 18, 22, 35] as const;

export function sanitizeExcelCellValue(rawValue: string): string {
  if (typeof rawValue !== 'string') return rawValue;
  if (/^[\s]*[=+\-@]/.test(rawValue)) {
    return `'${rawValue}`;
  }
  return rawValue;
}

export function formatArticleExportRow(article: ArticleRecord): ExportRowTuple {
  let kbliLabel = article.kbliCategory
    ? KBLI_CATEGORY_META[article.kbliCategory]?.fullLabel ?? article.kbliCategory
    : '-';
  if (article.secondaryKbliCategory && article.secondaryKbliCategory !== article.kbliCategory) {
    const secLabel =
      KBLI_CATEGORY_META[article.secondaryKbliCategory]?.fullLabel ?? article.secondaryKbliCategory;
    kbliLabel = `${kbliLabel} (Sekunder: ${secLabel})`;
  }

  const kbliImpactLabel = article.kbliImpact
    ? KBLI_IMPACT_LABELS[article.kbliImpact] ?? article.kbliImpact
    : '-';

  let expComponentLabel = article.expenditureComponent
    ? EXPENDITURE_COMPONENT_LABELS[article.expenditureComponent]?.short ??
      article.expenditureComponent
    : '-';
  if (
    article.secondaryExpenditureComponent &&
    article.secondaryExpenditureComponent !== article.expenditureComponent
  ) {
    const secExp =
      EXPENDITURE_COMPONENT_LABELS[article.secondaryExpenditureComponent]?.short ??
      article.secondaryExpenditureComponent;
    expComponentLabel = `${expComponentLabel} (Sekunder: ${secExp})`;
  }

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
    article.subdistrict ? `Kec. ${article.subdistrict}` : '-',
    article.curatorNotes ?? '-',
  ];
}

export interface SectorSummaryRow {
  code: string;
  name: string;
  kbli2025: string;
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  notes: string;
}

export function buildBps17SectorBridgingSummary(
  rows: ReadonlyArray<ArticleRecord>,
): SectorSummaryRow[] {
  return BPS_17_SECTORS.map((sector) => {
    const matched = rows.filter(
      (r) => r.kbliCategory && sector.kbli2025.includes(r.kbliCategory as string),
    );
    let positive = 0;
    let negative = 0;
    let neutral = 0;
    const noteSnippets: string[] = [];

    for (const item of matched) {
      const imp = item.kbliImpact;
      if (
        imp === KbliImpactEnum.INCREASE_NTB ||
        imp === KbliImpactEnum.INCREASE_PRICE
      ) {
        positive += 1;
      } else if (
        imp === KbliImpactEnum.DECREASE_NTB ||
        imp === KbliImpactEnum.DECREASE_PRICE
      ) {
        negative += 1;
      } else {
        neutral += 1;
      }

      if (noteSnippets.length < 2 && item.title) {
        noteSnippets.push(item.title);
      }
    }

    return {
      code: sector.code,
      name: sector.name,
      kbli2025: sector.kbli2025.join(', '),
      total: matched.length,
      positive,
      negative,
      neutral,
      notes: noteSnippets.join('; ') || '-',
    };
  });
}

export interface ExpenditureSummaryRow {
  code: string;
  name: string;
  total: number;
  positive: number;
  negative: number;
  neutral: number;
  notes: string;
}

export function buildExpenditureSummary(
  rows: ReadonlyArray<ArticleRecord>,
): ExpenditureSummaryRow[] {
  return BPS_EXPENDITURE_COMPONENTS.map((comp) => {
    const matched = rows.filter((r) => r.expenditureComponent === comp.code);
    let positive = 0;
    let negative = 0;
    let neutral = 0;
    const noteSnippets: string[] = [];

    for (const item of matched) {
      const imp = item.expenditureImpact;
      if (
        imp === ExpenditureImpactEnum.INCREASE_REAL ||
        imp === ExpenditureImpactEnum.INCREASE_DEFLATOR
      ) {
        positive += 1;
      } else if (
        imp === ExpenditureImpactEnum.DECREASE_REAL ||
        imp === ExpenditureImpactEnum.DECREASE_DEFLATOR
      ) {
        negative += 1;
      } else {
        neutral += 1;
      }

      if (noteSnippets.length < 2 && item.title) {
        noteSnippets.push(item.title);
      }
    }

    return {
      code: comp.code,
      name: comp.name,
      total: matched.length,
      positive,
      negative,
      neutral,
      notes: noteSnippets.join('; ') || '-',
    };
  });
}

/**
 * Menghasilkan buffer berkas Excel `.xlsx` dengan:
 * Sheet 1: Struktur mutlak 10 kolom resmi Nerwilis BPS Kab. Tana Tidung.
 * Sheet 2: Rekap agregasi resmi Bridging KBLI 2025 ke 17 Sektor PDRB & 6 Komponen Pengeluaran.
 */
export async function generateArticlesExcelBuffer(
  rows: ReadonlyArray<ArticleRecord>,
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SIPENA KTT - BPS Kabupaten Tana Tidung';
  workbook.created = new Date();
  workbook.modified = new Date();

  // --------------------------------------------------------------------------
  // SHEET 1: Fenomena PDRB KTT (10 Kolom Baku Nerwilis)
  // --------------------------------------------------------------------------
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
    const sanitizedTuple = tuple.map((val) => sanitizeExcelCellValue(val));
    const addedRow = sheet.addRow(sanitizedTuple);

    addedRow.eachCell((cell, colNumber) => {
      cell.font = {
        name: 'Calibri',
        size: 10,
        color: { argb: 'FF0F172A' },
      };

      const isCentered =
        colNumber === 1 || colNumber === 9 || colNumber === 10 || colNumber === 11;
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

  // --------------------------------------------------------------------------
  // SHEET 2: Bridging 17 Sektor PDRB BPS (Matriks Lapangan Usaha & Pengeluaran)
  // --------------------------------------------------------------------------
  const sheet2 = workbook.addWorksheet(EXPORT_BRIDGING_WORKSHEET_NAME, {
    views: [{ state: 'frozen', ySplit: 2 }],
  });

  sheet2.columns = [
    { width: 14 }, // A: Kode
    { width: 44 }, // B: Nama Sektor / Komponen
    { width: 18 }, // C: Kategori KBLI 2025
    { width: 16 }, // D: Total Fenomena
    { width: 13 }, // E: Dampak (+)
    { width: 13 }, // F: Dampak (-)
    { width: 13 }, // G: Netral
    { width: 55 }, // H: Catatan Utama
  ];

  // SECTION 1: Judul Tabel A
  const titleA = sheet2.addRow([
    'TABEL A: MATRIKS BRIDGING KBLI 2025 KE 17 LAPANGAN USAHA PDRB BPS (KABUPATEN TANA TIDUNG)',
  ]);
  sheet2.mergeCells(`A${titleA.number}:H${titleA.number}`);
  titleA.height = 26;
  titleA.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  titleA.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  titleA.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  // Header Tabel A
  const headerRowA = sheet2.addRow([
    'Kode Sektor',
    'Lapangan Usaha PDRB BPS',
    'Kategori KBLI 2025',
    'Total Fenomena',
    'Dampak (+)',
    'Dampak (-)',
    'Netral',
    'Catatan Fenomena Utama',
  ]);
  headerRowA.height = 24;
  headerRowA.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F766E' } }; // Teal-700
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF134E4A' } },
      left: { style: 'thin', color: { argb: 'FF134E4A' } },
      bottom: { style: 'medium', color: { argb: 'FF134E4A' } },
      right: { style: 'thin', color: { argb: 'FF134E4A' } },
    };
  });

  const sectorRows = buildBps17SectorBridgingSummary(rows);
  let totalSectorsSum = 0;
  let totalPosSum = 0;
  let totalNegSum = 0;
  let totalNeuSum = 0;

  for (const s of sectorRows) {
    totalSectorsSum += s.total;
    totalPosSum += s.positive;
    totalNegSum += s.negative;
    totalNeuSum += s.neutral;

    const row = sheet2.addRow([
      s.code,
      s.name,
      s.kbli2025,
      s.total,
      s.positive,
      s.negative,
      s.neutral,
      s.notes,
    ]);

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF0F172A' } };
      const isNum = colNumber >= 4 && colNumber <= 7;
      const isCode = colNumber === 1 || colNumber === 3;
      cell.alignment = {
        vertical: 'top',
        horizontal: isNum || isCode ? 'center' : 'left',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  }

  // Row Total Tabel A
  const totalRowA = sheet2.addRow([
    'TOTAL',
    'Semua Lapangan Usaha',
    '-',
    totalSectorsSum,
    totalPosSum,
    totalNegSum,
    totalNeuSum,
    '-',
  ]);
  totalRowA.eachCell((cell, colNumber) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    const isNum = colNumber >= 4 && colNumber <= 7;
    const isCode = colNumber === 1 || colNumber === 3;
    cell.alignment = {
      vertical: 'middle',
      horizontal: isNum || isCode ? 'center' : 'left',
    };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF64748B' } },
      bottom: { style: 'double', color: { argb: 'FF64748B' } },
    };
  });

  // Jeda baris
  sheet2.addRow([]);
  sheet2.addRow([]);

  // SECTION 2: Judul Tabel B
  const titleB = sheet2.addRow([
    'TABEL B: DISTRIBUSI FENOMENA PDRB SISI PENGELUARAN (6 KOMPONEN BPS)',
  ]);
  sheet2.mergeCells(`A${titleB.number}:H${titleB.number}`);
  titleB.height = 26;
  titleB.getCell(1).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
  titleB.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  titleB.getCell(1).alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };

  // Header Tabel B
  const headerRowB = sheet2.addRow([
    'Kode Komponen',
    'Komponen Pengeluaran PDRB BPS',
    '-',
    'Total Fenomena',
    'Dampak (+)',
    'Dampak (-)',
    'Netral',
    'Catatan Fenomena Utama',
  ]);
  headerRowB.height = 24;
  headerRowB.eachCell((cell) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A8A' } }; // Navy-800
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF172554' } },
      left: { style: 'thin', color: { argb: 'FF172554' } },
      bottom: { style: 'medium', color: { argb: 'FF172554' } },
      right: { style: 'thin', color: { argb: 'FF172554' } },
    };
  });

  const expRows = buildExpenditureSummary(rows);
  let totalExpSum = 0;
  let totalExpPosSum = 0;
  let totalExpNegSum = 0;
  let totalExpNeuSum = 0;

  for (const e of expRows) {
    totalExpSum += e.total;
    totalExpPosSum += e.positive;
    totalExpNegSum += e.negative;
    totalExpNeuSum += e.neutral;

    const row = sheet2.addRow([
      e.code,
      e.name,
      '-',
      e.total,
      e.positive,
      e.negative,
      e.neutral,
      e.notes,
    ]);

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF0F172A' } };
      const isNum = colNumber >= 4 && colNumber <= 7;
      const isCode = colNumber === 1 || colNumber === 3;
      cell.alignment = {
        vertical: 'top',
        horizontal: isNum || isCode ? 'center' : 'left',
        wrapText: true,
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      };
    });
  }

  // Row Total Tabel B
  const totalRowB = sheet2.addRow([
    'TOTAL',
    'Semua Komponen Pengeluaran',
    '-',
    totalExpSum,
    totalExpPosSum,
    totalExpNegSum,
    totalExpNeuSum,
    '-',
  ]);
  totalRowB.eachCell((cell, colNumber) => {
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0F172A' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
    const isNum = colNumber >= 4 && colNumber <= 7;
    const isCode = colNumber === 1 || colNumber === 3;
    cell.alignment = {
      vertical: 'middle',
      horizontal: isNum || isCode ? 'center' : 'left',
    };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF64748B' } },
      bottom: { style: 'double', color: { argb: 'FF64748B' } },
    };
  });

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

