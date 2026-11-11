// tests/pdrb-analytics.test.ts
import { describe, expect, it } from 'vitest';
import {
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  getPdrb17GroupForKbli,
  KbliCategoryEnum,
  KbliImpactEnum,
  PDRB_17_SECTORS,
  resolvePdrbGroupCodes,
} from '#shared/enums/pdrb';
import {
  AdminArticlesQuerySchema,
  PublicArticlesQuerySchema,
  SynthesisGenerateSchema,
} from '#shared/schemas/article.schema';
import {
  buildGroundedBrsFallbackNarrative,
  buildQuarterSeries,
  computeDashboardAnalytics,
  computeTrendAnalytics,
  resolveSynthesisTargetLabel,
  type AnalyticsArticleRow,
} from '#server/services/analytics/pdrb-analytics';
import { buildAdminArticleFilters } from '#server/services/articles/query';

const SAMPLE_ARTICLES: AnalyticsArticleRow[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    title: 'Panen Raya Padi dan Kelapa Sawit Dorong Produksi Pertanian KTT',
    summary: 'Produksi TBS sawit dan gabah petani Tana Tidung meningkat sepanjang awal triwulan.',
    sourcePortal: 'Benuanta.co.id',
    url: 'https://benuanta.co.id/panen-sawit-ktt',
    kbliCategory: KbliCategoryEnum.A,
    kbliImpact: KbliImpactEnum.INCREASE_NTB,
    expenditureComponent: ExpenditureComponentEnum.NET_EXPORT,
    expenditureImpact: ExpenditureImpactEnum.INCREASE_REAL,
    publishedAt: '2026-04-12T08:00:00.000Z',
    quarter: 2,
    year: 2026,
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    title: 'Jasa Konsultan Teknik dan Sewa Alat Berat Proyek Puspem Bertambah',
    summary: 'Permintaan jasa teknik sipil dan penyewaan alat berat proyek daerah naik signifikan.',
    sourcePortal: 'TribunKaltara.com',
    url: 'https://kaltara.tribunnews.com/puspem-alat-berat',
    kbliCategory: KbliCategoryEnum.M,
    kbliImpact: KbliImpactEnum.INCREASE_NTB,
    expenditureComponent: ExpenditureComponentEnum.PMTB,
    expenditureImpact: ExpenditureImpactEnum.INCREASE_REAL,
    publishedAt: '2026-05-03T06:30:00.000Z',
    quarter: 2,
    year: 2026,
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    title: 'Tarif Sewa Armada Penunjang Operasional Tambang Terkoreksi',
    summary: 'Biaya sewa armada penunjang usaha di Kecamatan Sesayap cenderung stabil menurun.',
    sourcePortal: 'KoranKaltara.com',
    url: 'https://korankaltara.com/sewa-armada',
    kbliCategory: KbliCategoryEnum.N,
    kbliImpact: KbliImpactEnum.DECREASE_PRICE,
    expenditureComponent: ExpenditureComponentEnum.PMTB,
    expenditureImpact: ExpenditureImpactEnum.DECREASE_DEFLATOR,
    publishedAt: '2026-05-18T03:00:00.000Z',
    quarter: 2,
    year: 2026,
  },
  {
    id: '00000000-0000-4000-8000-000000000004',
    title: 'Festival Budaya Irau Dongkrak Sektor Hiburan dan Jasa Personal',
    summary: 'Penyelenggaraan agenda budaya daerah meningkatkan aktivitas pelaku seni serta UMKM lokal.',
    sourcePortal: 'RadarTarakan.co.id',
    url: 'https://radartarakan.jawapos.com/festival-ktt',
    kbliCategory: KbliCategoryEnum.R,
    kbliImpact: KbliImpactEnum.INCREASE_NTB,
    expenditureComponent: ExpenditureComponentEnum.PK_RT,
    expenditureImpact: ExpenditureImpactEnum.INCREASE_REAL,
    publishedAt: '2026-06-05T09:15:00.000Z',
    quarter: 2,
    year: 2026,
  },
];

describe('Taksonomi 17 Kategori PDRB, Query Schema, Analitik & Sintesis BRS', () => {
  it('memetakan seluruh 21 huruf KBLI (A-U) ke tepat 17 kategori PDRB tanpa duplikasi atau celah', () => {
    expect(PDRB_17_SECTORS).toHaveLength(17);

    const seen = new Set<KbliCategoryEnum>();
    for (const sector of PDRB_17_SECTORS) {
      for (const code of sector.kbliCodes) {
        expect(seen.has(code)).toBe(false);
        seen.add(code);
      }
    }

    const allKbli = Object.values(KbliCategoryEnum);
    expect(seen.size).toBe(allKbli.length);
    for (const code of allKbli) {
      expect(seen.has(code)).toBe(true);
    }

    expect(resolvePdrbGroupCodes('M,N')).toEqual([KbliCategoryEnum.M, KbliCategoryEnum.N]);
    expect(resolvePdrbGroupCodes('r,s,t,u')).toEqual([
      KbliCategoryEnum.R,
      KbliCategoryEnum.S,
      KbliCategoryEnum.T,
      KbliCategoryEnum.U,
    ]);
    expect(resolvePdrbGroupCodes('ALL')).toEqual([]);
    expect(getPdrb17GroupForKbli(KbliCategoryEnum.N).groupCode).toBe('M,N');
    expect(getPdrb17GroupForKbli(KbliCategoryEnum.U).groupCode).toBe('R,S,T,U');
  });

  it('memvalidasi PublicArticlesQuerySchema, AdminArticlesQuerySchema (pdrbGroup), dan SynthesisGenerateSchema', () => {
    const publicParsed = PublicArticlesQuerySchema.parse({
      year: '2026',
      quarter: '2',
      pdrbGroup: ' M,N ',
      impactMacro: 'EXPANSION',
    });
    expect(publicParsed.year).toBe(2026);
    expect(publicParsed.quarter).toBe(2);
    expect(publicParsed.pdrbGroup).toBe('M,N');
    expect(publicParsed.impactMacro).toBe('EXPANSION');

    const publicAllGroup = PublicArticlesQuerySchema.parse({ pdrbGroup: 'ALL' });
    expect(publicAllGroup.pdrbGroup).toBeUndefined();

    const adminGroupQuery = AdminArticlesQuerySchema.parse({ pdrbGroup: 'R,S,T,U' });
    expect(buildAdminArticleFilters(adminGroupQuery)).toBeDefined();

    // Synthesis: minimal 1 UUID valid & maksimal 30
    expect(
      SynthesisGenerateSchema.safeParse({
        year: 2026,
        quarter: 2,
        dimension: 'kbli',
        targetCode: 'M,N',
        style: 'BRS_FORMAL',
        articleIds: [],
      }).success,
    ).toBe(false);

    const tooManyIds = Array.from({ length: 31 }, (_, i) =>
      `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`,
    );
    expect(
      SynthesisGenerateSchema.safeParse({
        year: 2026,
        quarter: 2,
        dimension: 'kbli',
        targetCode: 'A',
        style: 'EXECUTIVE_BRIEF',
        articleIds: tooManyIds,
      }).success,
    ).toBe(false);

    const validSynthesis = SynthesisGenerateSchema.safeParse({
      year: 2026,
      quarter: 2,
      dimension: 'kbli',
      targetCode: 'M,N',
      style: 'BULLET_POINTS',
      articleIds: [SAMPLE_ARTICLES[1]!.id, SAMPLE_ARTICLES[2]!.id],
    });
    expect(validSynthesis.success).toBe(true);
  });

  it('membangun seri 8 triwulan berurutan lintas pergantian tahun', () => {
    const series = buildQuarterSeries(2, 2026, 8);
    expect(series).toHaveLength(8);
    expect(series[0]).toEqual({ quarter: 3, year: 2024 });
    expect(series[7]).toEqual({ quarter: 2, year: 2026 });
  });

  it('menghitung KPI Dashboard, Gap 17 Sektor (termasuk penggabungan M,N & R,S,T,U), serta Heatmap 17x6', () => {
    const dash = computeDashboardAnalytics({
      periodArticles: SAMPLE_ARTICLES,
      prevTotalVerified: 2,
      pendingQueueCount: 7,
      llmFailedCount: 1,
      availableYears: [2026, 2025],
      year: 2026,
      quarter: 2,
    });

    expect(dash.period.label).toBe('Triwulan II 2026');
    expect(dash.period.previousLabel).toBe('Triwulan I 2026');
    expect(dash.kpi.totalVerifiedPeriod).toBe(4);
    expect(dash.kpi.deltaPercent).toBe(100);
    // Sektor tercakup: A (1), M,N (2), R,S,T,U (1) => 3 covered, 14 gap
    expect(dash.kpi.coveredSectors).toBe(3);
    expect(dash.kpi.gapSectorsCount).toBe(14);
    expect(dash.kpi.expansionPercent).toBe(75); // 3 dari 4 INCREASE_NTB

    const sectorMN = dash.gapTiles.find((t) => t.groupCode === 'M,N');
    expect(sectorMN).toBeDefined();
    expect(sectorMN?.count).toBe(2);
    expect(sectorMN?.isGap).toBe(false);
    expect(sectorMN?.isThin).toBe(true);

    const sectorB = dash.gapTiles.find((t) => t.groupCode === 'B');
    expect(sectorB?.isGap).toBe(true);
    expect(sectorB?.count).toBe(0);

    const heatMN = dash.heatmapMatrix.find((r) => r.groupCode === 'M,N');
    expect(heatMN?.cells[ExpenditureComponentEnum.PMTB]).toBe(2);
    const heatR = dash.heatmapMatrix.find((r) => r.groupCode === 'R,S,T,U');
    expect(heatR?.cells[ExpenditureComponentEnum.PK_RT]).toBe(1);
  });

  it('menghitung perbandingan tren q-to-q dan y-on-y pada dimensi KBLI maupun Pengeluaran', () => {
    const prevQuarterArt: AnalyticsArticleRow = {
      ...SAMPLE_ARTICLES[0]!,
      id: '00000000-0000-4000-8000-000000000099',
      kbliCategory: KbliCategoryEnum.A,
      kbliImpact: KbliImpactEnum.INCREASE_PRICE,
      quarter: 1,
      year: 2026,
    };
    const historyQuarters = buildQuarterSeries(2, 2026, 8);
    const trendKbli = computeTrendAnalytics({
      mode: 'qoq',
      dimension: 'kbli',
      targetYear: 2026,
      targetQuarter: 2,
      baselineYear: 2026,
      baselineQuarter: 1,
      historyQuarters,
      historyArticles: [...SAMPLE_ARTICLES, prevQuarterArt],
      availableYears: [2026],
    });

    expect(trendKbli.kpi.currentTotal).toBe(4);
    expect(trendKbli.kpi.baselineTotal).toBe(1);
    expect(trendKbli.kpi.deltaCount).toBe(3);
    expect(trendKbli.kpi.deltaPercent).toBe(300);
    expect(trendKbli.kpi.topRiser?.code).toBe('M,N');
    expect(trendKbli.kpi.topRiser?.deltaCount).toBe(2);

    const q1Point = trendKbli.history8Quarters.find((p) => p.year === 2026 && p.quarter === 1);
    const q2Point = trendKbli.history8Quarters.find((p) => p.year === 2026 && p.quarter === 2);
    expect(q1Point?.pricePressure).toBe(1);
    expect(q2Point?.isTarget).toBe(true);
    expect(q2Point?.increaseNtb).toBe(3);
    expect(q2Point?.pricePressure).toBe(1);

    const trendExp = computeTrendAnalytics({
      mode: 'yoy',
      dimension: 'expenditure',
      targetYear: 2026,
      targetQuarter: 2,
      baselineYear: 2025,
      baselineQuarter: 2,
      historyQuarters,
      historyArticles: SAMPLE_ARTICLES,
      availableYears: [2026],
    });
    expect(trendExp.rows).toHaveLength(6);
    const pmtbRow = trendExp.rows.find((r) => r.code === ExpenditureComponentEnum.PMTB);
    expect(pmtbRow?.currentCount).toBe(2);
    expect(pmtbRow?.deltaPercent).toBeNull();
  });

  it('menghasilkan narasi fallback BRS yang berakar pada sitasi [1]..[N] tanpa angka palsu', () => {
    const selected = [SAMPLE_ARTICLES[1]!, SAMPLE_ARTICLES[2]!];
    expect(resolveSynthesisTargetLabel('kbli', 'M,N')).toContain('Jasa Perusahaan');

    for (const style of ['BRS_FORMAL', 'EXECUTIVE_BRIEF', 'BULLET_POINTS'] as const) {
      const md = buildGroundedBrsFallbackNarrative({
        periodLabel: 'Triwulan II 2026',
        dimension: 'kbli',
        targetCode: 'M,N',
        style,
        articles: selected,
      });

      expect(md).toContain('[1]');
      expect(md).toContain('[2]');
      expect(md).toContain('TribunKaltara.com');
      expect(md).toContain('KoranKaltara.com');
      expect(md).not.toMatch(/\d+(?:[.,]\d+)?\s*%/);
    }
  });
});

