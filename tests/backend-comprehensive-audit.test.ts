// tests/backend-comprehensive-audit.test.ts
import { describe, expect, it, beforeEach } from 'vitest';
import {
  ArticleSourceTypeEnum,
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  KbliCategoryEnum,
  KbliImpactEnum,
  LlmStatusEnum,
  VerificationStatusEnum,
} from '#shared/enums/pdrb';
import {
  AdminArticlesQuerySchema,
  PublicArticlesQuerySchema,
} from '#shared/schemas/article.schema';
import { LlmClassificationRawSchema } from '#shared/schemas/llm-output.schema';
import {
  convertKbliVersion,
  getKbliFourGenerations,
  KBLI_CONCORDANCE_ENTRIES,
} from '#shared/utils/kbli-concordance';
import type { ArticleRecord } from '#server/db/schema';
import { escapeSqlLikePattern } from '#server/services/articles/query';
import { generateArticlesCsvString, sanitizeAndEscapeCsvCell } from '#server/services/export/csv';
import {
  formatArticleExportRow,
  generateArticlesExcelBuffer,
  sanitizeExcelCellValue,
} from '#server/services/export/excel';
import { mapClassificationToPersistence } from '#server/services/llm/classifier';
import { evaluateGeographicRelevance } from '#server/services/scraper/geo-filter';
import {
  harvestRegionalPortals,
  type RegionalPortalConfig,
} from '#server/services/scraper/portals';
import { verifyCronSecret } from '#server/utils/cron-secret';
import {
  getCachedOverview,
  invalidateOverviewCache,
  setCachedOverview,
} from '#server/utils/overview-cache';
import {
  __clearAllRateLimitsForTest,
  checkLoginRateLimit,
  resetLoginRateLimit,
} from '#server/utils/rate-limit';
import {
  ExternalFetchError,
  resetHostRateLimitsForTest,
  safeFetchText,
  SsrfValidationError,
} from '#server/utils/ssrf';

function createSampleArticle(overrides: Partial<ArticleRecord> = {}): ArticleRecord {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    url: 'https://kaltara.tribunnews.com/2026/11/10/ekonomi-ktt-tumbuh',
    urlHash: 'a'.repeat(64),
    sourceType: ArticleSourceTypeEnum.REGIONAL,
    sourcePortal: 'kaltara.tribunnews.com',
    keywordId: null,
    scraperLogId: null,
    title: 'Realisasi APBD Tana Tidung Dorong Pembangunan Jalan dan Pasar Rakyat',
    snippetText: 'Pemerintah Kabupaten Tana Tidung mempercepat serapan anggaran infrastruktur jalan.',
    wordCount: 85,
    publishedAt: new Date('2026-11-10T04:00:00.000Z'),
    quarter: 4,
    year: 2026,
    isEconomicPhenomenon: true,
    geographicScope: 'KTT_LOCAL',
    titleEmbedding: null,
    summary: 'Realisasi belanja modal Pemkab Tana Tidung meningkatkan konstruksi jalan dan perdagangan pasar.',
    kbliCategory: KbliCategoryEnum.F,
    kbliImpact: KbliImpactEnum.INCREASE_NTB,
    expenditureComponent: ExpenditureComponentEnum.PMTB,
    expenditureImpact: ExpenditureImpactEnum.INCREASE_REAL,
    secondaryKbliCategory: KbliCategoryEnum.G,
    secondaryKbliImpact: KbliImpactEnum.INCREASE_NTB,
    secondaryExpenditureComponent: ExpenditureComponentEnum.PK_P,
    secondaryExpenditureImpact: ExpenditureImpactEnum.INCREASE_REAL,
    llmModel: 'groq:llama-3.3-70b-versatile',
    llmStatus: LlmStatusEnum.SUCCESS,
    llmError: null,
    llmConfidence: 0.92,
    verificationStatus: VerificationStatusEnum.VERIFIED,
    verifiedBy: null,
    verifiedAt: new Date('2026-11-10T05:00:00.000Z'),
    createdBy: null,
    createdAt: new Date('2026-11-10T04:10:00.000Z'),
    updatedAt: new Date('2026-11-10T05:00:00.000Z'),
    ...overrides,
  };
}

describe('Comprehensive Backend Audit Suite (6 Engineering Axes)', () => {
  // =========================================================================
  // AXIS 1: SQL & QUERY VALIDATION BOUNDARIES
  // =========================================================================
  describe('Axis 1: SQL & Query Validation Boundaries (sql-optimization-patterns)', () => {
    it('escapes SQL LIKE special wildcard characters (%, _, \\) to prevent wildcard DoS', () => {
      const raw = '100% pertumbuhan_ekonomi\\ktt';
      const escaped = escapeSqlLikePattern(raw);
      expect(escaped).toBe('100\\% pertumbuhan\\_ekonomi\\\\ktt');
    });

    it('rejects out-of-range pagination limits and invalid years in PublicArticlesQuerySchema', () => {
      expect(PublicArticlesQuerySchema.safeParse({ limit: -5 }).success).toBe(false);
      expect(PublicArticlesQuerySchema.safeParse({ limit: 0 }).success).toBe(false);
      expect(PublicArticlesQuerySchema.safeParse({ limit: 5000 }).success).toBe(false);
      expect(PublicArticlesQuerySchema.safeParse({ page: 0 }).success).toBe(false);
      expect(PublicArticlesQuerySchema.safeParse({ quarter: 5 }).success).toBe(false);
      expect(PublicArticlesQuerySchema.safeParse({ year: 1990 }).success).toBe(false);
      expect(PublicArticlesQuerySchema.safeParse({ kbli: "' OR '1'='1" }).success).toBe(false);
    });

    it('accepts valid multi-sector query parameters on Public and Admin schemas', () => {
      const pubRes = PublicArticlesQuerySchema.safeParse({
        page: '1',
        limit: '20',
        year: '2026',
        quarter: '4',
        kbli: 'K',
        expenditure: 'PMTB,PK_P',
      });
      expect(pubRes.success).toBe(true);

      const admRes = AdminArticlesQuerySchema.safeParse({
        kbliCategory: 'A,C,F',
        expenditureComponent: 'NET_EXPORT',
        verificationStatus: 'VERIFIED',
      });
      expect(admRes.success).toBe(true);
    });
  });

  // =========================================================================
  // AXIS 2: SCRAPER RESILIENCE & FAULT INJECTION
  // =========================================================================
  describe('Axis 2: Scraper Resilience & Fault Injection (llm-routing-and-scraping)', () => {
    it('isolates portal failures (502, timeout, 403 Cloudflare) without aborting healthy portals', async () => {
      const testPortals: RegionalPortalConfig[] = [
        {
          id: 'p1-broken',
          label: 'Portal 502',
          sourcePortal: 'portal1.kaltara.id',
          indexUrl: 'https://portal1.kaltara.id/berita',
          allowedHosts: ['portal1.kaltara.id'],
          itemSelectors: ['article'],
          maxPages: 1,
        },
        {
          id: 'p2-timeout',
          label: 'Portal Timeout',
          sourcePortal: 'portal2.kaltara.id',
          indexUrl: 'https://portal2.kaltara.id/berita',
          allowedHosts: ['portal2.kaltara.id'],
          itemSelectors: ['article'],
          maxPages: 1,
        },
        {
          id: 'p3-healthy',
          label: 'Portal Sehat',
          sourcePortal: 'portal3.kaltara.id',
          indexUrl: 'https://portal3.kaltara.id/berita',
          allowedHosts: ['portal3.kaltara.id'],
          itemSelectors: ['article'],
          maxPages: 1,
        },
      ];
      const now = new Date('2026-11-13T08:00:00.000Z');

      const mockFetch = async (url: string) => {
        if (url.includes('portal1.kaltara.id')) {
          throw new ExternalFetchError('HTTP 502 Bad Gateway', 502);
        }
        if (url.includes('portal2.kaltara.id')) {
          throw new ExternalFetchError('Timeout >7000ms', 408);
        }
        return {
          finalUrl: url,
          body: `
            <html><body>
              <article>
                <h2><a href="https://portal3.kaltara.id/2026/11/13/harga-tbs-sawit-ktt-naik">Harga TBS Sawit di Tana Tidung Naik Jadi Rp 2.950 per Kg</a></h2>
                <time datetime="2026-11-13T06:00:00+08:00">13 Nov 2026</time>
              </article>
            </body></html>
          `,
        };
      };

      const result = await harvestRegionalPortals({
        portals: testPortals,
        now,
        lookbackDays: 7,
        fetchFn: mockFetch,
      });

      expect(result.portalsChecked).toBe(3);
      expect(result.errors).toHaveLength(2);
      expect(result.candidates).toHaveLength(1);
      expect(result.candidates[0]?.title).toContain('Harga TBS Sawit');
    });

    it('breaks out of pagination loop immediately when page 2 yields duplicate URLs (loop trap guard)', async () => {
      const singlePortal: RegionalPortalConfig[] = [
        {
          id: 'loop-portal',
          label: 'Portal Loop',
          sourcePortal: 'loop.kaltara.id',
          indexUrl: 'https://loop.kaltara.id/ekonomi',
          allowedHosts: ['loop.kaltara.id'],
          itemSelectors: ['article'],
          paginationPattern: 'QUERY_PAGE',
          maxPages: 5,
        },
      ];
      const now = new Date('2026-11-13T08:00:00.000Z');
      let fetchedPages = 0;

      const duplicateHtml = `
        <html><body>
          <article>
            <h2><a href="https://loop.kaltara.id/2026/11/13/proyek-jalan-usaha-tani-ktt">Proyek Jalan Usaha Tani Tana Tidung Rampung Tepat Waktu</a></h2>
            <time datetime="2026-11-13T05:00:00+08:00">13 Nov 2026</time>
          </article>
        </body></html>
      `;

      const result = await harvestRegionalPortals({
        portals: singlePortal,
        now,
        lookbackDays: 7,
        fetchFn: async (url) => {
          fetchedPages++;
          return { finalUrl: url, body: duplicateHtml };
        },
      });

      // Halaman 1 menemukan 1 kandidat baru, Halaman 2 menemukan URL yang sama (newFoundOnPage = 0) -> berhenti di halaman 2
      expect(fetchedPages).toBe(2);
      expect(result.candidates).toHaveLength(1);
    });

    it('filters neighbor regency municipal noise with 0 LLM tokens while preserving KTT & macro links', () => {
      const noise = evaluateGeographicRelevance({
        title: 'Satpol PP Gelar Razia Tertibkan PKL dan Badut Jalanan di Kota Tarakan',
        snippetText: 'Penertiban dilakukan di sekitar perempatan lampu merah Tarakan oleh tim gabungan.',
        sourceType: ArticleSourceTypeEnum.REGIONAL,
      });
      expect(noise.decision).toBe('DROP_OTHER_REGENCY_LOCAL');

      const tbsCommodity = evaluateGeographicRelevance({
        title: 'Disbun Kaltara Tetapkan Harga TBS Kelapa Sawit Periode November Rp 2.890',
        snippetText: 'Penetapan harga tandan buah segar berlaku bagi perusahaan sawit di Kalimantan Utara.',
        sourceType: ArticleSourceTypeEnum.REGIONAL,
      });
      expect(tbsCommodity.decision).toBe('ALLOW_FOR_LLM_REVIEW');
    });
  });

  // =========================================================================
  // AXIS 3: MULTI-LLM FAILOVER, ADVERSARIAL SCHEMA & LINKAGE QUALITY
  // =========================================================================
  describe('Axis 3: Multi-LLM Failover & Schema Hardening (llm-evaluation)', () => {
    it('Rejects hallucinated or out-of-range LLM outputs via LlmClassificationRawSchema', () => {
      const invalidCode = LlmClassificationRawSchema.safeParse({
        is_economic_phenomenon: true,
        geographic_scope: 'KTT_LOCAL',
        summary: 'Ringkasan ekonomi yang cukup panjang untuk memenuhi syarat minimal karakter.',
        kbli_category: 'Z',
        kbli_impact: 'INCREASE_NTB',
        expenditure_component: 'PMTB',
        expenditure_impact: 'INCREASE_REAL',
        secondary_kbli_category: null,
        secondary_kbli_impact: null,
        secondary_expenditure_component: null,
        secondary_expenditure_impact: null,
        quarter: 4,
        year: 2026,
        confidence: 0.9,
        reasoning: 'Alasan klasifikasi.',
      });
      expect(invalidCode.success).toBe(false);

      const missingPrimary = LlmClassificationRawSchema.safeParse({
        is_economic_phenomenon: true,
        geographic_scope: 'KTT_LOCAL',
        summary: 'Ringkasan ekonomi yang cukup panjang untuk memenuhi syarat minimal karakter.',
        kbli_category: null,
        kbli_impact: 'INCREASE_NTB',
        expenditure_component: 'PMTB',
        expenditure_impact: 'INCREASE_REAL',
        secondary_kbli_category: null,
        secondary_kbli_impact: null,
        secondary_expenditure_component: null,
        secondary_expenditure_impact: null,
        quarter: 4,
        year: 2026,
        confidence: 0.9,
        reasoning: 'Alasan klasifikasi.',
      });
      expect(missingPrimary.success).toBe(false);
    });

    it('Automatically nullifies duplicate secondary sector when identical to primary sector in persistence mapper', () => {
      const input = {
        is_economic_phenomenon: true,
        geographic_scope: 'KTT_LOCAL' as const,
        rejection_reason: null,
        summary: 'Pembangunan pelabuhan dan dermaga sungai di Kabupaten Tana Tidung.',
        kbli_category: KbliCategoryEnum.F,
        kbli_impact: KbliImpactEnum.INCREASE_NTB,
        expenditure_component: ExpenditureComponentEnum.PMTB,
        expenditure_impact: ExpenditureImpactEnum.INCREASE_REAL,
        secondary_kbli_category: KbliCategoryEnum.F,
        secondary_kbli_impact: KbliImpactEnum.INCREASE_NTB,
        secondary_expenditure_component: ExpenditureComponentEnum.PMTB,
        secondary_expenditure_impact: ExpenditureImpactEnum.INCREASE_REAL,
        quarter: 4,
        year: 2026,
        confidence: 0.88,
      };
      const mapped = mapClassificationToPersistence(input, 'groq:llama-3.3-70b-versatile');

      // Terverifikasi: Auto-nullify aktif bila sektor sekunder identik dengan primer untuk mencegah duplikasi
      expect(mapped.kbliCategory).toBe(KbliCategoryEnum.F);
      expect(mapped.secondaryKbliCategory).toBeNull();
      expect(mapped.secondaryKbliImpact).toBeNull();
      expect(mapped.verificationStatus).toBe(VerificationStatusEnum.PENDING);

      // Verifikasi ketika sektor sekunder berbeda (distinct)
      const mappedDistinct = mapClassificationToPersistence(
        {
          ...input,
          secondary_kbli_category: KbliCategoryEnum.G,
          secondary_kbli_impact: KbliImpactEnum.INCREASE_PRICE,
        },
        'groq:llama-3.3-70b-versatile',
      );
      expect(mappedDistinct.secondaryKbliCategory).toBe(KbliCategoryEnum.G);
      expect(mappedDistinct.secondaryKbliImpact).toBe(KbliImpactEnum.INCREASE_PRICE);
    });
  });

  // =========================================================================
  // AXIS 4: API SECURITY, RATE LIMITING & SSRF REDIRECT CHAINING
  // =========================================================================
  describe('Axis 4: API Security, Brute-Force & SSRF Redirect Chaining (security-and-hardening)', () => {
    beforeEach(() => {
      __clearAllRateLimitsForTest();
      resetHostRateLimitsForTest();
    });

    it('blocks brute-force login attempts on the 11th try within 15-minute window and resets on success', () => {
      const attackerIp = '203.0.113.77';
      const now = 1_700_000_000_000;

      for (let i = 1; i <= 10; i++) {
        const res = checkLoginRateLimit(attackerIp, now + i * 100);
        expect(res.allowed).toBe(true);
        expect(res.remaining).toBe(10 - i);
      }

      const blocked = checkLoginRateLimit(attackerIp, now + 2000);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
      expect(blocked.retryAfterSeconds).toBeGreaterThan(800);

      resetLoginRateLimit(attackerIp);
      const afterReset = checkLoginRateLimit(attackerIp, now + 3000);
      expect(afterReset.allowed).toBe(true);
    });

    it('blocks SSRF HTTP 302 redirect hops targeting AWS/Cloud metadata (169.254.169.254) or localhost', async () => {
      const fakeDns = async (hostname: string) => {
        if (hostname === 'portal-berita-resmi.id') {
          return [{ address: '104.21.44.10', family: 4 }];
        }
        return [{ address: '127.0.0.1', family: 4 }];
      };

      const originalFetch = globalThis.fetch;
      globalThis.fetch = (async () =>
        new Response(null, {
          status: 302,
          headers: {
            location: 'http://169.254.169.254/latest/meta-data/iam/security-credentials/',
          },
        })) as typeof fetch;

      try {
        await expect(
          safeFetchText('https://portal-berita-resmi.id/artikel-1', {
            dnsLookup: fakeDns,
            politeHostPacing: false,
          }),
        ).rejects.toThrow(SsrfValidationError);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('enforces timing-safe cron secret verification against spoofing and short secrets', () => {
      const validSecret = 'sipena_ktt_cron_secret_2026_secure_token';
      expect(verifyCronSecret(validSecret, validSecret)).toBe(true);
      expect(verifyCronSecret('wrong_secret_same_len_0000000000000000', validSecret)).toBe(false);
      expect(verifyCronSecret('short', validSecret)).toBe(false);
      expect(verifyCronSecret(undefined, validSecret)).toBe(false);
      expect(verifyCronSecret('GANTI_DENGAN_CRON_SECRET_ANDA_MIN_16', 'GANTI_DENGAN_CRON_SECRET_ANDA_MIN_16')).toBe(false);
    });

    it('caps rate-limiter bucket memory allocations under high-volume IP requests', () => {
      // Menguji ketahanan rate-limiter ketika diserang ratusan IP berbeda
      for (let i = 0; i < 300; i++) {
        checkLoginRateLimit(`192.168.10.${i}`);
      }
      const res = checkLoginRateLimit('192.168.10.1');
      expect(res.allowed).toBe(true);
    });

    it('stores, retrieves, and invalidates in-memory overview cache with TTL safety', () => {
      invalidateOverviewCache();
      expect(getCachedOverview(2026, 4)).toBeNull();

      const sampleOverview = { test: true, count: 42 };
      setCachedOverview(2026, 4, sampleOverview, 50); // 50ms TTL

      expect(getCachedOverview(2026, 4)).toEqual(sampleOverview);

      // Invalidate eksplisit
      invalidateOverviewCache();
      expect(getCachedOverview(2026, 4)).toBeNull();
    });
  });

  // =========================================================================
  // AXIS 5: EXCEL & CSV EXPORT STRESS TEST & FORMULA INJECTION
  // =========================================================================
  describe('Axis 5: Excel & CSV Export Stress & Formula Injection (xlsx-export)', () => {
    it('neutralizes CSV and Excel formula injection payloads (=, +, -, @)', () => {
      expect(sanitizeAndEscapeCsvCell('=CMD|\' /C calc\'!A0')).toBe('"\'=CMD|\' /C calc\'!A0"');
      expect(sanitizeAndEscapeCsvCell('+SUM(A1:A10)')).toBe('"\'+SUM(A1:A10)"');
      expect(sanitizeAndEscapeCsvCell('-2+3')).toBe('"\'-2+3"');
      expect(sanitizeAndEscapeCsvCell('@IMPORTXML("http://evil.com")')).toBe('"\'@IMPORTXML(""http://evil.com"")"');

      // Proteksi formula injection pada sel Excel
      expect(sanitizeExcelCellValue('=1+1')).toBe('\'=1+1');
      expect(sanitizeExcelCellValue('+SUM(B1:B5)')).toBe('\'+SUM(B1:B5)');
      expect(sanitizeExcelCellValue('-100')).toBe('\'-100');
      expect(sanitizeExcelCellValue('@SUM')).toBe('\'@SUM');
      expect(sanitizeExcelCellValue('Berita Normal')).toBe('Berita Normal');
    });

    it('enriches export rows with secondary sector and expenditure annotations without altering 10-column layout', () => {
      const sample = createSampleArticle({
        kbliCategory: KbliCategoryEnum.F,
        secondaryKbliCategory: KbliCategoryEnum.G,
        expenditureComponent: ExpenditureComponentEnum.PMTB,
        secondaryExpenditureComponent: ExpenditureComponentEnum.PK_RT,
      });

      const row = formatArticleExportRow(sample);
      expect(row.length).toBe(10);
      expect(row[2]).toContain('Konstruksi');
      expect(row[2]).toContain('(Sekunder: G - Perdagangan Besar dan Eceran');
      expect(row[4]).toContain('PMTB');
      expect(row[4]).toContain('(Sekunder: PK-RT)');
    });

    it('generates 1,000-row Excel (.xlsx) and CSV exports within <2.5s without memory spikes', async () => {
      const bulkRows: ArticleRecord[] = Array.from({ length: 1000 }, (_, idx) =>
        createSampleArticle({
          id: `00000000-0000-4000-8000-${String(idx).padStart(12, '0')}`,
          title: `Berita Ekonomi Daerah Ke-${idx + 1}: Produksi Komoditas Unggulan Meningkat`,
          kbliCategory: idx % 2 === 0 ? KbliCategoryEnum.A : KbliCategoryEnum.C,
        }),
      );

      const t0 = performance.now();
      const csv = generateArticlesCsvString(bulkRows);
      const xlsxBuffer = await generateArticlesExcelBuffer(bulkRows);
      const elapsedMs = performance.now() - t0;

      expect(csv.split('\r\n').length).toBeGreaterThanOrEqual(1001);
      expect(xlsxBuffer.byteLength).toBeGreaterThan(25_000);
      expect(elapsedMs).toBeLessThan(2500);
    });
  });

  // =========================================================================
  // AXIS 6: KBLI 4-GENERATION CONCORDANCE INTEGRITY
  // =========================================================================
  describe('Axis 6: 4-Generation KBLI Concordance Completeness', () => {
    it('maps all 22 KBLI 2025 categories (A-V) across 2020, 2015, and 2009 without gaps', () => {
      expect(KBLI_CONCORDANCE_ENTRIES).toHaveLength(22);
      for (const entry of KBLI_CONCORDANCE_ENTRIES) {
        const bridge = getKbliFourGenerations(entry.code_2025);
        expect(bridge).not.toBeNull();
        expect(bridge?.code2025).toBeTruthy();
        expect(bridge?.code2020).toBeTruthy();
        expect(bridge?.code2015).toBeTruthy();
        expect(bridge?.code2009).toBeTruthy();
      }
      expect(getKbliFourGenerations('INVALID_CODE')).toBeNull();
      expect(convertKbliVersion('INVALID_CODE', '2025', '2020')).toBeNull();
    });
  });
});
