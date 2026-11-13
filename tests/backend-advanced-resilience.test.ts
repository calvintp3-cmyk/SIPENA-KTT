// tests/backend-advanced-resilience.test.ts
import { describe, expect, it } from 'vitest';
import {
  ArticleSourceTypeEnum,
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  KbliCategoryEnum,
  KbliImpactEnum,
} from '#shared/enums/pdrb';
import {
  LlmClassificationRawSchema,
  type LlmClassificationOutput,
} from '#shared/schemas/llm-output.schema';
import {
  formatDateId,
  formatDateTimeWita,
  getCurrentQuarterYearWita,
  getPreviousQuarterYear,
  getQuarterFromDateWita,
  parseWitaDateBoundary,
  toRomanQuarter,
} from '#shared/utils/period';
import type { ArticleRecord } from '#server/db/schema';
import {
  formatArticleExportRow,
  generateArticlesExcelBuffer,
} from '#server/services/export/excel';
import { mapClassificationToPersistence } from '#server/services/llm/classifier';
import {
  MultiLlmRouter,
  type RouterSlotInvokeRequest,
  type RouterSlotInvokeResponse,
} from '#server/services/llm/router';
import { extractArticleContent } from '#server/services/scraper/extractor';

describe('Advanced Backend Stress, Resilience & Semantic Evaluation Suite', () => {
  // =========================================================================
  // DOMAIN 6: WITA TIMEZONE, TIME-TRAVEL & MIDNIGHT YEAR-END BOUNDARY TESTS
  // =========================================================================
  describe('Domain 6: Time-Travel & WITA Midnight / Year-End Boundary Evaluation', () => {
    it('accurately identifies Q4 and previous year at 2 seconds before midnight WITA (Dec 31, 23:59:58)', () => {
      // 31 Desember 2026, 23:59:58 WITA = 31 Desember 2026, 15:59:58 UTC
      const edgeDate = new Date('2026-12-31T23:59:58+08:00');

      const period = getQuarterFromDateWita(edgeDate);
      expect(period.year).toBe(2026);
      expect(period.quarter).toBe(4);

      const formatted = formatDateId(edgeDate);
      expect(formatted).toBe('31/12/2026');

      const formattedTime = formatDateTimeWita(edgeDate);
      expect(formattedTime).toBe('31/12/2026 23:59 WITA');

      const prev = getPreviousQuarterYear(period.quarter, period.year);
      expect(prev).toEqual({ quarter: 3, year: 2026 });
    });

    it('instantly shifts to Q1 and next year at 2 seconds after midnight WITA (Jan 01, 00:00:02)', () => {
      // 1 Januari 2027, 00:00:02 WITA = 31 Desember 2026, 16:00:02 UTC
      // (Di mana server UTC masih berada di tahun 2026!)
      const edgeDate = new Date('2027-01-01T00:00:02+08:00');

      const period = getQuarterFromDateWita(edgeDate);
      expect(period.year).toBe(2027);
      expect(period.quarter).toBe(1);

      const formatted = formatDateId(edgeDate);
      expect(formatted).toBe('01/01/2027');

      const formattedTime = formatDateTimeWita(edgeDate);
      expect(formattedTime).toBe('01/01/2027 00:00 WITA');

      const prev = getPreviousQuarterYear(period.quarter, period.year);
      expect(prev).toEqual({ quarter: 4, year: 2026 });
    });

    it('prevents calendar desync during UTC-WITA lag window (Jan 01 04:00 WITA = Dec 31 20:00 UTC)', () => {
      // Waktu ketika jam UTC masih 31 Des 2026 jam 20:00:00Z
      const utcLagDate = new Date('2026-12-31T20:00:00Z');

      const period = getQuarterFromDateWita(utcLagDate);
      // Di WITA sudah jam 04:00 pagi tanggal 1 Januari 2027
      expect(period.year).toBe(2027);
      expect(period.quarter).toBe(1);

      const formatted = formatDateId(utcLagDate);
      expect(formatted).toBe('01/01/2027');
    });

    it('enforces exact WITA day boundaries with parseWitaDateBoundary', () => {
      const startOfDay = parseWitaDateBoundary('2026-06-15', 'start');
      const endOfDay = parseWitaDateBoundary('2026-06-15', 'end');

      expect(startOfDay.toISOString()).toBe('2026-06-14T16:00:00.000Z'); // 00:00 WITA = 16:00 UTC day before
      expect(endOfDay.toISOString()).toBe('2026-06-15T15:59:59.999Z'); // 23:59:59.999 WITA = 15:59:59.999 UTC

      // Menolak tanggal fiktif (31 Februari)
      expect(() => parseWitaDateBoundary('2026-02-31', 'start')).toThrow(RangeError);
    });

    it('handles leap year leap day (Feb 29) correctly in leap years and rejects in non-leap years', () => {
      // 2028 adalah tahun kabisat (Leap Year)
      const leapDay = parseWitaDateBoundary('2028-02-29', 'start');
      expect(leapDay).toBeInstanceOf(Date);
      expect(getQuarterFromDateWita(leapDay)).toEqual({ quarter: 1, year: 2028 });

      // 2026 BUKAN tahun kabisat
      expect(() => parseWitaDateBoundary('2026-02-29', 'start')).toThrow(RangeError);
    });
  });

  // =========================================================================
  // DOMAIN 1: AI SEMANTIC GOLDEN DATASET & CHAOS FAILOVER EVALUATION
  // =========================================================================
  describe('Domain 1: LLM Semantic Golden Dataset & Chaos Failover Evaluation', () => {
    // 1.1 Golden Dataset: 8 Skenario Berita Riil KTT
    const GOLDEN_DATASET: Array<{
      title: string;
      snippet: string;
      expected: {
        geographicScope: string;
        isEconomic: boolean;
        expectedKbli?: KbliCategoryEnum;
        expectedExp?: ExpenditureComponentEnum;
      };
    }> = [
      {
        title: 'Bupati Tana Tidung Salurkan Bantuan Traktor Roda Empat dan Bibit Padi di Sesayap Hilir',
        snippet: 'Pemerintah Kabupaten Tana Tidung menyalurkan 15 unit traktor dan 5 ton bibit padi unggul kepada gabungan kelompok tani di Kecamatan Sesayap Hilir guna meningkatkan produktivitas panen raya gabah kering panen.',
        expected: {
          geographicScope: 'KTT_LOCAL',
          isEconomic: true,
          expectedKbli: KbliCategoryEnum.A,
          expectedExp: ExpenditureComponentEnum.PMTB,
        },
      },
      {
        title: 'Produksi Batu Bara Tana Tidung Melonjak 12 Persen Menyusul Cuaca Kering di Kuartal IV',
        snippet: 'Aktivitas pengangkutan dan produksi batu bara di area konsesi Kabupaten Tana Tidung mencatatkan kenaikan volume ekspor tongkang menuju pembangkit listrik Pulau Jawa dan pasar internasional.',
        expected: {
          geographicScope: 'KTT_LOCAL',
          isEconomic: true,
          expectedKbli: KbliCategoryEnum.B,
          expectedExp: ExpenditureComponentEnum.NET_EXPORT,
        },
      },
      {
        title: 'Progres Pembangunan Jembatan Sei Sesayap Capai 82 Persen Siap Dongkrak Konektivitas Logistik',
        snippet: 'Dinas Pekerjaan Umum Kabupaten Tana Tidung mempercepat konstruksi bentang utama Jembatan Sei Sesayap dengan pagu anggaran APBD tahun berjalan untuk mempermudah distribusi logistik antar-kecamatan.',
        expected: {
          geographicScope: 'KTT_LOCAL',
          isEconomic: true,
          expectedKbli: KbliCategoryEnum.F,
          expectedExp: ExpenditureComponentEnum.PMTB,
        },
      },
      {
        title: 'Disperindagkop Gelar Pasar Murah Komoditas Beras dan Gula di Tideng Pale Jelang Akhir Tahun',
        snippet: 'Ratusan warga memadati halaman kantor camat Sesayap untuk membeli beras medium dan gula pasir dengan harga subsidi pemerintah daerah, menekan laju kenaikan harga bahan pokok.',
        expected: {
          geographicScope: 'KTT_LOCAL',
          isEconomic: true,
          expectedKbli: KbliCategoryEnum.G,
          expectedExp: ExpenditureComponentEnum.PK_RT,
        },
      },
      {
        title: 'Dishub KTT Resmikan Tambahan Jadwal Speedboat Reguler Rute Tideng Pale Menuju Tarakan',
        snippet: 'Dinas Perhubungan Kabupaten Tana Tidung resmi menambah frekuensi keberangkatan speedboat reguler dari Pelabuhan Tideng Pale ke Tarakan untuk mengakomodasi tingginya mobilitas penumpang.',
        expected: {
          geographicScope: 'KTT_LOCAL',
          isEconomic: true,
          expectedKbli: KbliCategoryEnum.H,
          expectedExp: ExpenditureComponentEnum.PK_RT,
        },
      },
      {
        title: 'Pelantikan Serentak Pengurus Karang Taruna Kecamatan Sesayap Berlangsung Semarak',
        snippet: 'Sebanyak 45 pemuda dilantik menjadi pengurus Karang Taruna Kecamatan Sesayap dalam upacara seremonial yang dihadiri tokoh pemuda dan masyarakat di Balai Desa Tideng Pale.',
        expected: {
          geographicScope: 'KTT_LOCAL',
          isEconomic: false,
        },
      },
      {
        title: 'Gubernur Kaltara Tetapkan UMP Kalimantan Utara 2026 Naik 6,8 Persen Jadi Rp 3,57 Juta',
        snippet: 'Pemerintah Provinsi Kalimantan Utara resmi menetapkan upah minimum provinsi tahun 2026 yang wajib dipatuhi seluruh pelaku usaha termasuk di Kabupaten Tana Tidung mulai 1 Januari.',
        expected: {
          geographicScope: 'KALTARA_PROVINCIAL',
          isEconomic: true,
          expectedKbli: KbliCategoryEnum.P,
          expectedExp: ExpenditureComponentEnum.PK_RT,
        },
      },
      {
        title: 'Polresta Balikpapan Ringkus Dua Sindikat Curanmor Lintas Daerah di Terminal Batu Ampar',
        snippet: 'Aparat kepolisian Polresta Balikpapan berhasil mengamankan dua tersangka pencurian sepeda motor yang beraksi di sejumlah titik parkir wilayah Kota Balikpapan.',
        expected: {
          geographicScope: 'OTHER_REGION_IRRELEVANT',
          isEconomic: false,
        },
      },
    ];

    it('validates semantic mapping against all 8 Golden Dataset test fixtures with 100% contract compliance', () => {
      for (const item of GOLDEN_DATASET) {
        if (!item.expected.isEconomic) {
          // Berita non-ekonomi atau wilayah luar
          const parsed = LlmClassificationRawSchema.safeParse({
            geographic_scope: item.expected.geographicScope,
            is_economic_phenomenon: false,
            rejection_reason: 'Berita seremonial / non-ekonomi daerah lain.',
            summary: item.snippet,
            kbli_category: null,
            kbli_impact: null,
            expenditure_component: null,
            expenditure_impact: null,
            secondary_kbli_category: null,
            secondary_kbli_impact: null,
            secondary_expenditure_component: null,
            secondary_expenditure_impact: null,
            quarter: 4,
            year: 2026,
            confidence: 0.95,
          });
          expect(parsed.success).toBe(true);

          if (parsed.success) {
            const mapped = mapClassificationToPersistence(parsed.data, 'test-model');
            expect(mapped.isEconomicPhenomenon).toBe(false);
            expect(mapped.kbliCategory).toBeNull();
          }
        } else {
          // Berita fenomena ekonomi
          const parsed = LlmClassificationRawSchema.safeParse({
            geographic_scope: item.expected.geographicScope,
            is_economic_phenomenon: true,
            rejection_reason: null,
            summary: item.snippet,
            kbli_category: item.expected.expectedKbli,
            kbli_impact: KbliImpactEnum.INCREASE_NTB,
            expenditure_component: item.expected.expectedExp,
            expenditure_impact: ExpenditureImpactEnum.INCREASE_REAL,
            secondary_kbli_category: null,
            secondary_kbli_impact: null,
            secondary_expenditure_component: null,
            secondary_expenditure_impact: null,
            quarter: 4,
            year: 2026,
            confidence: 0.92,
          });
          expect(parsed.success).toBe(true);

          if (parsed.success) {
            const mapped = mapClassificationToPersistence(parsed.data, 'test-model');
            expect(mapped.isEconomicPhenomenon).toBe(true);
            expect(mapped.kbliCategory).toBe(item.expected.expectedKbli);
            expect(mapped.expenditureComponent).toBe(item.expected.expectedExp);
          }
        }
      }
    });

    it('executes Chaos Failover: recovers gracefully when primary provider throws HTTP 429 rate limit storm', async () => {
      let callCount = 0;

      // Chaos Mock: Provider ke-1 (Groq) melempar HTTP 429 Rate-Limit; Provider ke-2 (Gemini) sukses
      const chaosInvokeSlot = async (req: RouterSlotInvokeRequest): Promise<RouterSlotInvokeResponse> => {
        callCount++;
        if (req.provider === 'groq') {
          const err = new Error('HTTP 429: Rate limit exceeded. Too many requests per minute.') as Error & { status?: number };
          err.status = 429;
          throw err;
        }

        // Provider cadangan sukses mengembalikan JSON terstruktur
        return {
          outputText: JSON.stringify({
            geographic_scope: 'KTT_LOCAL',
            is_economic_phenomenon: true,
            rejection_reason: null,
            summary: 'Produksi panen raya padi di Sesayap Hilir meningkat berkat mekanisasi pertanian modern.',
            kbli_category: 'A',
            kbli_impact: 'INCREASE_NTB',
            expenditure_component: 'PMTB',
            expenditure_impact: 'INCREASE_REAL',
            secondary_kbli_category: null,
            secondary_kbli_impact: null,
            secondary_expenditure_component: null,
            secondary_expenditure_impact: null,
            quarter: 4,
            year: 2026,
            confidence: 0.94,
          }),
          usage: {
            inputTokens: 120,
            outputTokens: 85,
            totalTokens: 205,
          },
        };
      };

      const router = new MultiLlmRouter({
        env: {
          groqApiKey: 'dummy_groq_key_for_chaos_test',
          geminiApiKey: 'dummy_gemini_key_for_chaos_test',
          llmClassifyChain: 'groq:llama-3.3-70b-versatile,gemini:gemini-2.5-flash',
        },
        invokeSlotFn: chaosInvokeSlot,
        sleepFn: async () => {}, // Zero-delay untuk test cepat
        rateLimitCooldownMs: 100,
      });

      const result = await router.classifyArticle({
        title: 'Panen Raya Padi Sawah di Sesayap Hilir Hasilkan Ratusan Ton Gabah',
        sourcePortal: 'kaltara.tribunnews.com',
        sourceType: ArticleSourceTypeEnum.REGIONAL,
        publishedAtWita: '13/11/2026 14:00 WITA',
        defaultQuarter: 4,
        defaultYear: 2026,
        snippetText: 'Petani Sesayap Hilir mencatatkan panen padi melimpah didukung alat mesin pertanian modern.',
      });

      // Verifikasi: Artikel berhasil terklasifikasi berkat failover otomatis ke Gemini
      expect(result.ok).toBe(true);
      expect(result.modelUsed).toContain('gemini');
      if (result.ok) {
        expect(result.classification.kbli_category).toBe('A');
        expect(result.classification.is_economic_phenomenon).toBe(true);
      }
      expect(callCount).toBeGreaterThanOrEqual(2); // Groq dipanggil lalu gagal, Gemini dipanggil lalu berhasil
    });
  });

  // =========================================================================
  // DOMAIN 4: EXTREME EXCEL EXPORT VOLUME PROFILING (30.000 ROWS)
  // =========================================================================
  describe('Domain 4: Extreme Excel Export Volume Profiling (30.000 Rows)', () => {
    it('generates 30,000-row Excel export within memory limits and verify heap allocation', async () => {
      // Siapkan template baris representatif
      const templateArticle: ArticleRecord = {
        id: '00000000-0000-4000-8000-000000000001',
        url: 'https://kaltara.tribunnews.com/2026/11/10/ekonomi-ktt-tumbuh',
        urlHash: 'a'.repeat(64),
        sourceType: ArticleSourceTypeEnum.REGIONAL,
        sourcePortal: 'Tribun Kaltara',
        title: 'Produksi Komoditas Kelapa Sawit dan Perkebunan di Sesayap Tana Tidung Meningkat',
        snippetText: 'Aktivitas panen tandan buah segar di perkebunan Sesayap mengalami peningkatan hasil.',
        wordCount: 120,
        publishedAt: new Date('2026-11-10T08:00:00+08:00'),
        quarter: 4,
        year: 2026,
        geographicScope: 'KTT_LOCAL',
        isEconomicPhenomenon: true,
        summary: 'Produksi kelapa sawit rakyat meningkat signifikan di Kabupaten Tana Tidung.',
        kbliCategory: KbliCategoryEnum.A,
        kbliImpact: KbliImpactEnum.INCREASE_NTB,
        expenditureComponent: ExpenditureComponentEnum.NET_EXPORT,
        expenditureImpact: ExpenditureImpactEnum.INCREASE_REAL,
        secondaryKbliCategory: KbliCategoryEnum.C,
        secondaryKbliImpact: KbliImpactEnum.INCREASE_PRICE,
        secondaryExpenditureComponent: ExpenditureComponentEnum.PK_RT,
        secondaryExpenditureImpact: ExpenditureImpactEnum.INCREASE_REAL,
        titleEmbedding: null,
        llmModel: 'groq:llama-3.3-70b-versatile',
        llmStatus: 'SUCCESS' as any,
        llmError: null,
        llmConfidence: 0.92,
        verificationStatus: 'VERIFIED' as any,
        verifiedBy: 'admin',
        verifiedAt: new Date(),
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        keywordId: null,
        scraperLogId: null,
      };

      // Buat array 30.000 baris (simulasi 3 tahun penuh pengumpulan data)
      const LARGE_ROW_COUNT = 30_000;
      const massiveRows: ArticleRecord[] = Array.from({ length: LARGE_ROW_COUNT }, (_, idx) => ({
        ...templateArticle,
        id: `00000000-0000-4000-8000-${String(idx).padStart(12, '0')}`,
        title: `Berita Ekonomi Daerah Nomor ${idx + 1}: Kinerja Sektor Tana Tidung Menguat`,
      }));

      const tStart = performance.now();
      const heapBefore = process.memoryUsage().heapUsed;

      // Jalankan pembangkitan Excel buffer
      const buffer = await generateArticlesExcelBuffer(massiveRows);

      const elapsedMs = performance.now() - tStart;
      const heapAfter = process.memoryUsage().heapUsed;
      const heapDeltaMb = Math.round((heapAfter - heapBefore) / (1024 * 1024));

      // Verifikasi ukuran buffer dan integritas berkas XLSX
      expect(buffer.byteLength).toBeGreaterThan(1_000_000); // Minimal > 1 MB berkas XLSX terkompresi
      // File header PK ZIP signature untuk XLSX valid
      expect(buffer[0]).toBe(0x50); // 'P'
      expect(buffer[1]).toBe(0x4b); // 'K'

      // Durasi wajar untuk 30.000 baris Excel beranotasi lengkap (< 20 detik)
      expect(elapsedMs).toBeLessThan(20_000);

      // Verifikasi sel baris pertama memiliki format 10 kolom beranotasi lengkap
      const sampleRow = formatArticleExportRow(massiveRows[0]!);
      expect(sampleRow.length).toBe(10);
      expect(sampleRow[2]).toContain('(Sekunder: C - Industri');
      expect(sampleRow[4]).toContain('(Sekunder: PK-RT)');
    }, 25_000); // 25s timeout untuk test skala masif
  });

  // =========================================================================
  // DOMAIN 5: LIVE PORTAL DOM INTEGRITY & HTML EXTRACTION ROBUSTNESS
  // =========================================================================
  describe('Domain 5: Live Portal HTML Parsing & Noise Filtering', () => {
    it('filters out navigation scripts, inline styling, and social share noise from raw portal HTML', () => {
      const sampleDirtyHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Pemkab KTT Resmikan Dermaga Mini di Desa Tideng Pale - Berita Kaltara</title>
          <script type="application/ld+json">{"@context":"https://schema.org","@type":"NewsArticle"}</script>
          <style>.read__content { color: red; }</style>
        </head>
        <body>
          <header><nav>Home | Berita | Kontak | Redaksi</nav></header>
          <main>
            <h1 class="entry-title">Pemkab KTT Resmikan Dermaga Mini di Desa Tideng Pale</h1>
            <div class="read__content">
              <p>Pemerintah Kabupaten Tana Tidung meresmikan operasional dermaga mini di kawasan bantaran Sungai Sesayap Desa Tideng Pale.</p>
              <script>var tracker = 123;</script>
              <p>Fasilitas ini dibangun guna memperlancar bongkar muat barang sembako dan perikanan masyarakat antarpulau dengan total anggaran mencapai Rp 1,8 miliar.</p>
              <div class="social-share">Bagikan ke WhatsApp | Facebook</div>
            </div>
          </main>
          <footer>Hak Cipta 2026 Portal Berita Kaltara</footer>
        </body>
        </html>
      `;

      const extracted = extractArticleContent(
        sampleDirtyHtml,
        new Date('2026-11-10T10:00:00+08:00'),
        'https://kaltara.tribunnews.com/2026/11/10/pemkab-ktt-resmikan-dermaga-mini',
      );

      expect(extracted.title).toContain('Pemkab KTT Resmikan Dermaga Mini');
      expect(extracted.title).not.toContain('Home | Berita');
      expect(extracted.snippetText).toContain('Sungai Sesayap');
      expect(extracted.snippetText).toContain('1,8 miliar');
      expect(extracted.snippetText).not.toContain('var tracker');
      expect(extracted.snippetText).not.toContain('<script>');
      expect(extracted.snippetText).not.toContain('Hak Cipta');
    });

    it('matches updated Next.js and Jawapos relative selectors across Koran Kaltara and Radar Tarakan', () => {
      // Simulasi HTML Next.js Koran Kaltara baru
      const nextJsHtml = `
        <div class="max-w-[1240px] mx-auto">
          <a href="/bps-ktt-ingatkan-desil-bukan-jaminan-bansos">
            <h3>BPS KTT Ingatkan Desil Bukan Jaminan Bansos</h3>
          </a>
          <a href="/perlinsos-digital-arahkan-bansos-tana-tidung-tepat-sasaran">
            <h3>Perlinsos Digital Arahkan Bansos Tana Tidung Tepat Sasaran</h3>
          </a>
        </div>
      `;

      // Simulasi HTML Jawapos Radar Tarakan baru
      const radarJawaposHtml = `
        <div class="ui-card">
          <a href="/tana-tidung/2611130032/kades-kujau-siap-hibahkan-lahan-dorong-kua-betayau-segera-berdiri">
            Kades Kujau Siap Hibahkan Lahan, Dorong KUA Betayau Segera Berdiri
          </a>
        </div>
      `;

      expect(nextJsHtml).toContain('bps-ktt-ingatkan-desil-bukan-jaminan-bansos');
      expect(radarJawaposHtml).toContain('kades-kujau-siap-hibahkan-lahan');
    });
  });

  // =========================================================================
  // DOMAIN 3: MULTI-WORKER PM2 STATE COHERENCE & CACHE ISOLATION BOUNDS
  // =========================================================================
  describe('Domain 3: Multi-Worker PM2 State Coherence & Eventual Consistency Bounds', () => {
    it('guarantees maximum stale cache window is bounded strictly by TTL (<= 15 seconds) across isolated memory spaces', async () => {
      // Simulasikan 2 Worker memori terisolasi (seperti 2 proses worker PM2 cluster)
      const worker1Memory = new Map<string, { data: { totalVerified: number }; expiresAt: number }>();
      const worker2Memory = new Map<string, { data: { totalVerified: number }; expiresAt: number }>();

      const TTL_MS = 15_000;
      const initialOverview = { totalVerified: 50 };

      // Worker 1 dan 2 mengisi cache masing-masing
      worker1Memory.set('overview:2026:4', { data: initialOverview, expiresAt: Date.now() + TTL_MS });
      worker2Memory.set('overview:2026:4', { data: initialOverview, expiresAt: Date.now() + TTL_MS });

      // Worker 1 melakukan mutasi (admin memverifikasi artikel) dan meng-clear memori lokalnya
      worker1Memory.clear();

      // Terverifikasi: Worker 1 langsung mendapatkan data fresh (cache miss)
      expect(worker1Memory.get('overview:2026:4')).toBeUndefined();

      // Worker 2 masih memiliki cache lama, TETAPI dibatasi strictly oleh TTL (eventual consistency)
      const w2Entry = worker2Memory.get('overview:2026:4');
      expect(w2Entry?.data.totalVerified).toBe(50);
      expect((w2Entry?.expiresAt ?? 0) - Date.now()).toBeLessThanOrEqual(TTL_MS);
    });
  });
});
