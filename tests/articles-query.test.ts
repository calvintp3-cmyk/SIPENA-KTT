// tests/articles-query.test.ts
import { describe, expect, it } from 'vitest';
import {
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  KbliCategoryEnum,
  KbliImpactEnum,
} from '#shared/enums/pdrb';
import {
  CreateManualArticleSchema,
  TriggerScraperSchema,
  UpdateArticleReviewSchema,
} from '#shared/schemas/article.schema';
import {
  buildAdminArticleFilters,
  escapeSqlLikePattern,
  getMissingVerificationFields,
} from '#server/services/articles/query';

describe('Articles Query Helper, Zod Boundary & Verification Completeness', () => {
  it('meng-escape wildcard SQL ILIKE (%, _, \\) secara aman', () => {
    expect(escapeSqlLikePattern('100%_kaltara\\test')).toBe('100\\%\\_kaltara\\\\test');
  });

  it('membangun Drizzle SQL clause hanya ketika filter tersedia', () => {
    expect(buildAdminArticleFilters({})).toBeUndefined();
    expect(
      buildAdminArticleFilters({
        year: 2026,
        quarter: 4,
        kbli: KbliCategoryEnum.A,
        q: 'sawit',
        from: '2026-10-01',
        to: '2026-10-31',
      }),
    ).toBeDefined();
  });

  it('mendeteksi kelengkapan field wajib sebelum artikel berstatus VERIFIED', () => {
    const complete = getMissingVerificationFields({
      isEconomicPhenomenon: true,
      summary: 'Harga batubara acuan KTT meningkat pada awal triwulan IV tahun ini.',
      kbliCategory: KbliCategoryEnum.B,
      kbliImpact: KbliImpactEnum.INCREASE_PRICE,
      expenditureComponent: ExpenditureComponentEnum.NET_EXPORT,
      expenditureImpact: ExpenditureImpactEnum.INCREASE_DEFLATOR,
      quarter: 4,
      year: 2026,
    });
    expect(complete).toEqual([]);

    const incomplete = getMissingVerificationFields({
      isEconomicPhenomenon: null,
      summary: null,
      kbliCategory: null,
      kbliImpact: KbliImpactEnum.INCREASE_NTB,
      expenditureComponent: null,
      expenditureImpact: null,
      quarter: 4,
      year: 2026,
    });
    expect(incomplete).toEqual([
      'isEconomicPhenomenon',
      'summary',
      'kbliCategory',
      'expenditureComponent',
      'expenditureImpact',
    ]);
  });

  it('memvalidasi batas skema manual insert, update review, dan trigger scraper', () => {
    const xssUriAttempt = CreateManualArticleSchema.safeParse({
      title: 'Pelabuhan Sesayap Mulai Beroperasi Optimal',
      url: 'javascript:alert(1)',
      publishedAt: '2026-10-14',
      snippetText: 'Cuplikan teks pelabuhan cukup panjang minimal lima belas karakter.',
      summary: 'Operasional pelabuhan Sungai Sesayap mendorong arus keluar komoditas daerah.',
      kbliCategory: KbliCategoryEnum.H,
      kbliImpact: KbliImpactEnum.INCREASE_NTB,
      expenditureComponent: ExpenditureComponentEnum.NET_EXPORT,
      expenditureImpact: ExpenditureImpactEnum.INCREASE_REAL,
    });
    expect(xssUriAttempt.success).toBe(false);

    const validManual = CreateManualArticleSchema.safeParse({
      title: 'Operasional Pelabuhan Sungai Sesayap Meningkatkan Arus Kargo',
      url: 'https://benuanta.co.id/pelabuhan-sesayap-ktt',
      publishedAt: '2026-10-14',
      snippetText: 'Cuplikan berita resmi dari sumber terverifikasi lapangan Nerwilis BPS KTT.',
      summary: 'Volume muat barang di pelabuhan Sesayap meningkat 12 persen dibanding triwulan lalu.',
      kbliCategory: KbliCategoryEnum.H,
      kbliImpact: KbliImpactEnum.INCREASE_NTB,
      expenditureComponent: ExpenditureComponentEnum.NET_EXPORT,
      expenditureImpact: ExpenditureImpactEnum.INCREASE_REAL,
    });
    expect(validManual.success).toBe(true);

    expect(UpdateArticleReviewSchema.safeParse({}).success).toBe(false);
    expect(TriggerScraperSchema.parse({})).toEqual({ mode: 'ALL' });
  });
});

