// tests/export-excel.test.ts
import ExcelJS from 'exceljs';
import { describe, expect, it } from 'vitest';
import {
  ArticleSourceTypeEnum,
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  KbliCategoryEnum,
  KbliImpactEnum,
  LlmStatusEnum,
  VerificationStatusEnum,
} from '#shared/enums/pdrb';
import type { ArticleRecord } from '#server/db/schema';
import { generateArticlesCsvString } from '#server/services/export/csv';
import {
  EXPORT_WORKSHEET_NAME,
  generateArticlesExcelBuffer,
  OFFICIAL_EXPORT_HEADERS,
} from '#server/services/export/excel';

function makeSampleArticle(overrides: Partial<ArticleRecord> = {}): ArticleRecord {
  const now = new Date('2026-10-14T01:15:00.000Z'); // 14/10/2026 09:15 WITA
  return {
    id: '00000000-0000-4000-8000-000000000001',
    url: 'https://korankaltara.com/harga-tbs-sawit-ktt-menguat',
    urlHash: 'a'.repeat(64),
    sourceType: ArticleSourceTypeEnum.REGIONAL,
    sourcePortal: 'korankaltara.com',
    title: 'Harga TBS Sawit KTT Menguat di Awal Triwulan IV',
    snippetText: 'Cuplikan berita asli 200 kata...',
    wordCount: 180,
    publishedAt: now,
    quarter: 4,
    year: 2026,
    isEconomicPhenomenon: true,
    summary:
      'Harga pembelian TBS kelapa sawit di Kabupaten Tana Tidung naik menjadi Rp 2.980/kg pada awal Oktober 2026.',
    kbliCategory: KbliCategoryEnum.A,
    kbliImpact: KbliImpactEnum.INCREASE_PRICE,
    expenditureComponent: ExpenditureComponentEnum.NET_EXPORT,
    expenditureImpact: ExpenditureImpactEnum.INCREASE_REAL,
    llmModel: 'gemini-3.8-flash',
    llmStatus: LlmStatusEnum.SUCCESS,
    llmError: null,
    llmConfidence: 0.95,
    verificationStatus: VerificationStatusEnum.VERIFIED,
    verifiedBy: null,
    verifiedAt: now,
    keywordId: null,
    scraperLogId: null,
    createdBy: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

describe('Export Excel (.xlsx) & CSV Resmi 10 Kolom Nerwilis', () => {
  it('menghasilkan workbook .xlsx dengan urutan tepat 10 kolom, tanggal WITA dd/mm/yyyy, & hyperlink aman', async () => {
    const sample1 = makeSampleArticle();
    const sample2 = makeSampleArticle({
      id: '00000000-0000-4000-8000-000000000002',
      publishedAt: new Date('2026-03-31T17:30:00.000Z'), // 01/04/2026 01:30 WITA
      quarter: 2,
      year: 2026,
      url: 'Surat Edaran Dinas PUPR No. 12/2026', // non-HTTP manual ref -> tidak dijadikan hyperlink
      kbliCategory: KbliCategoryEnum.F,
      kbliImpact: KbliImpactEnum.INCREASE_NTB,
      expenditureComponent: ExpenditureComponentEnum.PMTB,
      expenditureImpact: ExpenditureImpactEnum.INCREASE_REAL,
      verificationStatus: VerificationStatusEnum.PENDING,
    });

    const buffer = await generateArticlesExcelBuffer([sample1, sample2]);
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buffer as unknown as Parameters<ExcelJS.Workbook['xlsx']['load']>[0]);

    const sheet = wb.getWorksheet(EXPORT_WORKSHEET_NAME);
    expect(sheet).toBeDefined();

    const headerValues = [];
    for (let col = 1; col <= 10; col += 1) {
      headerValues.push(sheet!.getRow(1).getCell(col).text);
    }

    expect(headerValues).toEqual([
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
    ]);
    expect(headerValues).toEqual([...OFFICIAL_EXPORT_HEADERS]);

    const row2 = sheet!.getRow(2);
    expect(row2.getCell(1).value).toBe('14/10/2026');
    expect(row2.getCell(2).value).toBe('Harga TBS Sawit KTT Menguat di Awal Triwulan IV');
    expect(row2.getCell(3).value).toBe('A - Pertanian, Kehutanan, dan Perikanan');
    expect(row2.getCell(4).value).toBe('Meningkatkan Harga');
    expect(row2.getCell(5).value).toBe('Ekspor Bersih Antar Daerah/Luar Negeri');
    expect(row2.getCell(6).value).toBe('Meningkatkan Pengeluaran Riil');
    expect(row2.getCell(7).value).toContain('Rp 2.980/kg');
    expect(row2.getCell(8).value).toEqual({
      text: 'https://korankaltara.com/harga-tbs-sawit-ktt-menguat',
      hyperlink: 'https://korankaltara.com/harga-tbs-sawit-ktt-menguat',
    });
    expect(row2.getCell(9).value).toBe('Triwulan IV 2026');
    expect(row2.getCell(10).value).toBe('Terverifikasi');

    const row3 = sheet!.getRow(3);
    expect(row3.getCell(1).value).toBe('01/04/2026');
    expect(row3.getCell(5).value).toBe('PMTB');
    expect(row3.getCell(8).value).toBe('Surat Edaran Dinas PUPR No. 12/2026');
    expect(row3.getCell(9).value).toBe('Triwulan II 2026');
    expect(row3.getCell(10).value).toBe('Menunggu Review');
  });

  it('menghasilkan CSV UTF-8 BOM yang menetralkan CSV Formula Injection (=, +, -, @)', () => {
    const evilArticle = makeSampleArticle({
      title: '=CMD("calc.exe")',
      summary: '+10% Inflasi atau -2% Kontraksi @KTT',
    });

    const csv = generateArticlesCsvString([evilArticle]);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    expect(csv).toContain(`"'=CMD(""calc.exe"")"`);
    expect(csv).toContain(`"'+10% Inflasi atau -2% Kontraksi @KTT"`);
  });
});

