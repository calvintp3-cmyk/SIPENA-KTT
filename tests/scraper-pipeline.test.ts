// tests/scraper-pipeline.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ArticleSourceTypeEnum,
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  KbliCategoryEnum,
  KbliImpactEnum,
  ScraperRunStatusEnum,
  ScraperRunTypeEnum,
} from '#shared/enums/pdrb';
import { runWithConcurrency } from '#server/utils/concurrency';
import {
  DEFAULT_BROWSER_USER_AGENT,
  DEFAULT_FETCH_TIMEOUT_MS,
  safeFetchText,
} from '#server/utils/ssrf';
import {
  FALLBACK_GEMINI_MODEL,
  GeminiClassificationWorker,
  PRIMARY_GEMINI_MODEL,
  type GeminiInvokeFn,
} from '#server/services/llm/gemini-client';
import { harvestRegionalPortals, type RegionalPortalConfig } from '#server/services/scraper/portals';

// In-memory state untuk memverifikasi status log PostgreSQL pada pengujian pipeline tanpa DB eksternal
const { mockLogUpdates, mockInsertedArticles, mockOrderByCount, stateFlags } = vi.hoisted(() => ({
  mockLogUpdates: [] as Array<Record<string, unknown>>,
  mockInsertedArticles: [] as Array<Record<string, unknown>>,
  mockOrderByCount: { value: 0 },
  stateFlags: {
    failOnQueryExistingHashes: false,
  },
}));

vi.mock('#server/db', () => {
  const selectChain = () => {
    const chain = {
      from: (table: unknown) => {
        const isArticlesTable =
          Boolean(table && typeof table === 'object' && 'urlHash' in (table as Record<string, unknown>));
        const whereResult = {
          orderBy: () => {
            if (isArticlesTable) {
              mockOrderByCount.value += 1;
            }
            return {
              limit: async () => [],
            };
          },
          limit: async () => [],
          then: (resolve: (val: unknown[]) => unknown, reject?: (err: unknown) => unknown) => {
            if (isArticlesTable && stateFlags.failOnQueryExistingHashes) {
              return Promise.reject(new Error('Simulated DB connection lost in queryExistingHashes')).then(
                resolve,
                reject,
              );
            }
            return Promise.resolve([]).then(resolve, reject);
          },
        };
        return {
          where: () => whereResult,
        };
      },
    };
    return chain;
  };

  return {
    pool: {
      connect: vi.fn(async () => ({
        query: vi.fn(async (sqlText: string) => {
          if (sqlText.includes('pg_try_advisory_lock')) {
            return { rows: [{ acquired: true }] };
          }
          return { rows: [] };
        }),
        release: vi.fn(),
      })),
    },
    db: {
      select: vi.fn(() => selectChain()),
      insert: vi.fn((table: unknown) => {
        const isArticlesTable =
          Boolean(table && typeof table === 'object' && 'urlHash' in (table as Record<string, unknown>));
        return {
          values: (payload: Record<string, unknown>) => {
            if (isArticlesTable) {
              mockInsertedArticles.push(payload);
              return {
                onConflictDoNothing: () => ({
                  returning: async () => [{ id: `art-${mockInsertedArticles.length}` }],
                }),
              };
            }
            return {
              returning: async () => [{ id: 'log-test-001' }],
            };
          },
        };
      }),
      update: vi.fn(() => ({
        set: (patch: Record<string, unknown>) => ({
          where: async () => {
            mockLogUpdates.push(patch);
            return [];
          },
        }),
      })),
    },
  };
});

import { runScrapePipeline } from '#server/services/scraper/pipeline';

const VALID_ECONOMIC_JSON = JSON.stringify({
  geographic_scope: 'KTT_LOCAL',
  is_economic_phenomenon: true,
  rejection_reason: null,
  summary:
    'Produksi dan perdagangan komoditas unggulan Kabupaten Tana Tidung menunjukkan peningkatan signifikan pada triwulan berjalan.',
  kbli_category: KbliCategoryEnum.A,
  kbli_impact: KbliImpactEnum.INCREASE_NTB,
  expenditure_component: ExpenditureComponentEnum.NET_EXPORT,
  expenditure_impact: ExpenditureImpactEnum.INCREASE_REAL,
  quarter: 4,
  year: 2026,
  confidence: 0.95,
});

function buildSampleArticleHtml(title: string, publishedIso: string): string {
  const words = Array.from({ length: 170 }, (_, idx) => `ekonomi${idx + 1}`).join(' ');
  return `
    <!doctype html>
    <html>
      <head>
        <title>${title}</title>
        <meta property="og:title" content="${title}" />
        <meta property="article:published_time" content="${publishedIso}" />
      </head>
      <body>
        <article>
          <h1>${title}</h1>
          <div class="entry-content"><p>${words}.</p></div>
        </article>
      </body>
    </html>
  `;
}

describe('Scraper Pipeline Concurrency, Timeouts, Gemini Failover & Fail-Safe Release', () => {
  beforeEach(() => {
    mockLogUpdates.length = 0;
    mockInsertedArticles.length = 0;
    mockOrderByCount.value = 0;
    stateFlags.failOnQueryExistingHashes = false;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('menjalankan tugas secara paralel dengan batas concurrency=5 dan menghormati AbortSignal', async () => {
    const items = Array.from({ length: 12 }, (_, i) => i);
    let activeCount = 0;
    let peakActive = 0;
    const processed: number[] = [];
    const controller = new AbortController();

    await runWithConcurrency(
      items,
      5,
      async (item) => {
        activeCount += 1;
        peakActive = Math.max(peakActive, activeCount);
        await new Promise((r) => setTimeout(r, 15));
        processed.push(item);
        if (processed.length >= 6) {
          controller.abort();
        }
        activeCount -= 1;
      },
      controller.signal,
    );

    expect(peakActive).toBeLessThanOrEqual(5);
    expect(peakActive).toBeGreaterThanOrEqual(2);
    expect(processed.length).toBeLessThan(12);
  });

  it('harvestRegionalPortals menggunakan concurrency=5, timeout default 7s, header Chrome ID, dan isolasi error per portal', async () => {
    const now = new Date('2026-10-14T12:00:00.000Z');
    const portals: RegionalPortalConfig[] = Array.from({ length: 6 }, (_, i) => ({
      id: `portal-${i}`,
      label: `Portal ${i}`,
      sourcePortal: `portal${i}.example.id`,
      indexUrl: `https://portal${i}.example.id/ktt`,
      allowedHosts: [`portal${i}.example.id`],
      itemSelectors: ['article'],
    }));

    let inFlight = 0;
    let maxInFlight = 0;
    const capturedOpts: Array<{ timeoutMs?: number; userAgent?: string; acceptLanguage?: string }> = [];

    const result = await harvestRegionalPortals({
      portals,
      now,
      lookbackDays: 3,
      fetchFn: async (url, opts) => {
        inFlight += 1;
        maxInFlight = Math.max(maxInFlight, inFlight);
        capturedOpts.push({
          timeoutMs: opts?.timeoutMs,
          userAgent: opts?.userAgent,
          acceptLanguage: opts?.headers?.['accept-language'],
        });

        await new Promise((r) => setTimeout(r, 20));
        inFlight -= 1;

        if (url.includes('portal2.')) {
          throw new Error('Timeout >7000ms saat menghubungi portal2.example.id');
        }

        const idx = url.match(/portal(\d+)/)?.[1] ?? '0';
        return {
          finalUrl: url,
          body: `<article><h2><a href="${url}/berita-investasi-pelabuhan-${idx}">Investasi Pelabuhan Tana Tidung Meningkat ${idx}</a></h2><time datetime="2026-10-14T09:00:00+08:00"></time></article>`,
        };
      },
    });

    expect(maxInFlight).toBeLessThanOrEqual(5);
    expect(maxInFlight).toBeGreaterThanOrEqual(2);
    expect(result.portalsChecked).toBe(6);
    expect(result.candidates).toHaveLength(5);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]?.source).toBe('portal2.example.id');
    expect(result.errors[0]?.stage).toBe('HARVEST');
    expect(DEFAULT_FETCH_TIMEOUT_MS).toBe(7_000);
    expect(capturedOpts[0]?.timeoutMs).toBe(7_000);
    expect(capturedOpts[0]?.userAgent).toBe(DEFAULT_BROWSER_USER_AGENT);
    expect(capturedOpts[0]?.acceptLanguage).toContain('id');
  });

  it('GeminiClassificationWorker langsung switch ke flash-lite tanpa delay saat kuota harian (PerDay) 3.8-flash habis', async () => {
    const delays: number[] = [];
    const modelsCalled: string[] = [];

    const mockInvoke: GeminiInvokeFn = vi.fn(async (req) => {
      modelsCalled.push(req.model);
      if (req.model === PRIMARY_GEMINI_MODEL) {
        const err = new Error(
          '429 RESOURCE_EXHAUSTED: Quota exceeded for metric GenerateRequestsPerDayPerProjectPerModel-FreeTier, limit: 20',
        ) as Error & { status: number };
        err.status = 429;
        throw err;
      }
      return {
        outputText: VALID_ECONOMIC_JSON,
        usage: { inputTokens: 450, outputTokens: 120, totalTokens: 570 },
      };
    });

    const worker = new GeminiClassificationWorker({
      minIntervalMs: 0,
      invokeFn: mockInvoke,
      sleepFn: async (ms) => {
        delays.push(ms);
      },
    });

    const sample = {
      title: 'Pelabuhan Tana Tidung Percepat Arus Ekspor Kayu Olahan',
      sourcePortal: 'korankaltara.com',
      sourceType: ArticleSourceTypeEnum.REGIONAL,
      publishedAtWita: '14/10/2026 09:00 WITA',
      defaultQuarter: 4 as const,
      defaultYear: 2026,
      snippetText: 'Aktivitas bongkar muat barang di pelabuhan Sesayap mengalami kenaikan.',
    };

    const first = await worker.classifyArticle(sample);
    const second = await worker.classifyArticle(sample);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(worker.isPrimaryModelDisabled).toBe(true);
    expect(delays).toEqual([]);
    // Artikel 1 mencoba primary sekali lalu fallback; artikel 2 langsung pakai fallback tanpa hit primary lagi
    expect(modelsCalled).toEqual([
      PRIMARY_GEMINI_MODEL,
      FALLBACK_GEMINI_MODEL,
      FALLBACK_GEMINI_MODEL,
    ]);
  });

  it('safeFetchText menyertakan header Chrome lengkap dan membatalkan request gantung dalam timeout ketat', async () => {
    const seenHeaders: Array<Headers> = [];
    const mockFetch = vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => {
      seenHeaders.push(new Headers(init?.headers));
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => {
            const abortErr = new Error('The operation was aborted');
            abortErr.name = 'AbortError';
            reject(abortErr);
          },
          { once: true },
        );
      });
    });

    const dnsLookup = async () => [{ address: '104.21.10.2', family: 4 }];
    await expect(
      safeFetchText('https://korankaltara.com/lambat', {
        timeoutMs: 60,
        dnsLookup,
      }),
    ).rejects.toThrow(/Timeout >60ms/i);

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(seenHeaders[0]?.get('user-agent')).toContain('Chrome/');
    expect(seenHeaders[0]?.get('accept-language')).toContain('id');
  });

  it('runScrapePipeline melepas status DB dari RUNNING ke FAILED via blok try...finally jika terjadi fatal error', async () => {
    stateFlags.failOnQueryExistingHashes = true;

    await expect(
      runScrapePipeline({
        runType: ScraperRunTypeEnum.MANUAL,
        mode: 'REGIONAL_ONLY',
        portals: [
          {
            id: 'koran-kaltara',
            label: 'Koran Kaltara',
            sourcePortal: 'korankaltara.com',
            indexUrl: 'https://korankaltara.com/category/tana-tidung',
            allowedHosts: ['korankaltara.com'],
            itemSelectors: ['article'],
          },
        ],
        fetchFn: async (url) => ({
          finalUrl: url,
          body: '<article><h2><a href="https://korankaltara.com/berita-ekonomi-ktt-hari-ini">Berita Ekonomi KTT Hari Ini</a></h2></article>',
        }),
      }),
    ).rejects.toThrow(/Simulated DB connection lost/i);

    const lastUpdate = mockLogUpdates.at(-1);
    expect(lastUpdate?.status).toBe(ScraperRunStatusEnum.FAILED);
    expect(lastUpdate?.finishedAt).toBeInstanceOf(Date);
  });

  it('runScrapePipeline menghormati hard timeout dan tetap menyimpan hasil yang sudah didapat sebagai PARTIAL/FAILED', async () => {
    const now = new Date('2026-10-14T12:00:00.000Z');
    let llmCallIndex = 0;

    const summary = await runScrapePipeline({
      runType: ScraperRunTypeEnum.MANUAL,
      mode: 'REGIONAL_ONLY',
      now,
      maxDurationMs: 240,
      portals: [
        {
          id: 'koran-kaltara',
          label: 'Koran Kaltara',
          sourcePortal: 'korankaltara.com',
          indexUrl: 'https://korankaltara.com/category/tana-tidung',
          allowedHosts: ['korankaltara.com'],
          itemSelectors: ['article'],
        },
      ],
      fetchFn: async (url) => {
        if (url.includes('/category/')) {
          return {
            finalUrl: url,
            body: `
              <article><h2><a href="https://korankaltara.com/artikel-cepat-pertama">Artikel Ekonomi Tana Tidung Cepat Pertama</a></h2><time datetime="2026-10-14T09:00:00+08:00"></time></article>
              <article><h2><a href="https://korankaltara.com/artikel-lambat-kedua">Artikel Ekonomi Tana Tidung Lambat Kedua</a></h2><time datetime="2026-10-14T08:00:00+08:00"></time></article>
            `,
          };
        }
        return {
          finalUrl: url,
          body: buildSampleArticleHtml('Judul Artikel KTT', '2026-10-14T09:00:00+08:00'),
        };
      },
      workerOptions: {
        minIntervalMs: 0,
        invokeFn: async (req) => {
          llmCallIndex += 1;
          const delayMs = llmCallIndex === 1 ? 20 : 600;
          await new Promise<void>((resolve, reject) => {
            if (req.abortSignal?.aborted) {
              const e = new Error('Aborted');
              e.name = 'AbortError';
              reject(e);
              return;
            }
            const timer = setTimeout(() => {
              req.abortSignal?.removeEventListener('abort', onAbort);
              resolve();
            }, delayMs);
            const onAbort = () => {
              clearTimeout(timer);
              const e = new Error('Aborted by pipeline deadline');
              e.name = 'AbortError';
              reject(e);
            };
            req.abortSignal?.addEventListener('abort', onAbort, { once: true });
          });
          return {
            outputText: VALID_ECONOMIC_JSON,
            usage: { inputTokens: 300, outputTokens: 80, totalTokens: 380 },
          };
        },
      },
    });

    expect(summary.status).not.toBe(ScraperRunStatusEnum.RUNNING);
    expect([ScraperRunStatusEnum.PARTIAL, ScraperRunStatusEnum.FAILED]).toContain(summary.status);
    expect(summary.articlesInserted).toBeGreaterThanOrEqual(1);
    expect(summary.economicCount).toBe(1);
    expect(summary.durationMs).toBeLessThan(500);
    expect(summary.errors.some((e) => e.stage === 'SYSTEM' || e.stage === 'LLM')).toBe(true);

    const lastUpdate = mockLogUpdates.at(-1);
    expect(lastUpdate?.status).toBe(summary.status);
    expect(lastUpdate?.finishedAt).toBeInstanceOf(Date);
  });

  it('workflow hybrid nasional menggabungkan Bing News RSS + Google News RSS serta memproses fallback wrapper CBMi', async () => {
    const now = new Date('2026-10-14T12:00:00.000Z');
    const capturedPrompts: string[] = [];

    const summary = await runScrapePipeline({
      runType: ScraperRunTypeEnum.MANUAL,
      mode: 'NATIONAL_ONLY',
      now,
      keywords: [
        {
          id: 'kw-batubara',
          keyword: 'batubara Kalimantan Utara',
          defaultKbliCategory: KbliCategoryEnum.B,
          defaultExpenditureComponent: ExpenditureComponentEnum.NET_EXPORT,
        },
      ],
      fetchFn: async (url) => {
        if (url.includes('bing.com/news/search')) {
          return {
            finalUrl: url,
            body: `<?xml version="1.0" encoding="utf-8" ?>
              <rss version="2.0" xmlns:News="https://www.bing.com/schema/news">
                <channel>
                  <item>
                    <title>Ekspor Batubara Kalimantan Utara Tumbuh 12 Persen di Kuartal IV</title>
                    <link>http://www.bing.com/news/apiclick.aspx?ref=FexRss&amp;url=https%3a%2f%2fekonomi.bisnis.com%2fread%2f20261014%2fekspor-batubara-kaltara-tumbuh</link>
                    <description>Volume pengapalan batubara dari pelabuhan muat Kalimantan Utara meningkat didorong permintaan ekspor Asia Timur.</description>
                    <pubDate>Wed, 14 Oct 2026 06:00:00 GMT</pubDate>
                    <News:Source>Bisnis.com</News:Source>
                  </item>
                </channel>
              </rss>`,
          };
        }
        if (url.includes('news.google.com/rss/search')) {
          return {
            finalUrl: url,
            body: `<?xml version="1.0" encoding="UTF-8"?>
              <rss version="2.0">
                <channel>
                  <item>
                    <title>Ekspor Batubara Kalimantan Utara Tumbuh 12 Persen di Kuartal IV - Bisnis.com</title>
                    <link>https://news.google.com/rss/articles/CBMiDuplikatJudulSamaDenganBing</link>
                    <pubDate>Wed, 14 Oct 2026 06:05:00 GMT</pubDate>
                    <source url="https://ekonomi.bisnis.com">Bisnis.com</source>
                  </item>
                  <item>
                    <title>Produksi Tambang Batubara KTT Capai Target Tahunan - Katadata</title>
                    <link>https://news.google.com/rss/articles/CBMiUnikHanyaAdaDiGoogleNews</link>
                    <description>Realisasi produksi batubara di Kabupaten Tana Tidung pada triwulan berjalan mencapai target RKAB tahunan.</description>
                    <pubDate>Wed, 14 Oct 2026 07:00:00 GMT</pubDate>
                    <source url="https://databoks.katadata.co.id">Katadata</source>
                  </item>
                </channel>
              </rss>`,
          };
        }
        if (url.includes('news.google.com/rss/articles/CBMiUnikHanyaAdaDiGoogleNews')) {
          // Simulasi wrapper JS Google News tanpa meta/link redirect eksternal
          return {
            finalUrl: url,
            body: '<html><head><title>Google News</title></head><body><div>Loading...</div></body></html>',
          };
        }
        return {
          finalUrl: url,
          body: buildSampleArticleHtml(
            'Ekspor Batubara Kalimantan Utara Tumbuh 12 Persen di Kuartal IV',
            '2026-10-14T06:00:00Z',
          ),
        };
      },
      workerOptions: {
        minIntervalMs: 0,
        invokeFn: async (req) => {
          capturedPrompts.push(req.userInput);
          return {
            outputText: VALID_ECONOMIC_JSON,
            usage: { inputTokens: 320, outputTokens: 110, totalTokens: 430 },
          };
        },
      },
    });

    expect(summary.status).toBe(ScraperRunStatusEnum.SUCCESS);
    // Judul duplikat antara Bing & Google otomatis dideduplikasi ke URL langsung Bisnis.com + 1 artikel unik Google News
    expect(summary.articlesFetched).toBe(2);
    expect(summary.articlesInserted).toBe(2);
    expect(summary.economicCount).toBe(2);
    expect(mockInsertedArticles).toHaveLength(2);
    expect(mockInsertedArticles.map((a) => a.url)).toEqual(
      expect.arrayContaining([
        'https://ekonomi.bisnis.com/read/20261014/ekspor-batubara-kaltara-tumbuh',
        'https://news.google.com/rss/articles/CBMiUnikHanyaAdaDiGoogleNews',
      ]),
    );
    expect(capturedPrompts[0]).toContain('KBLI Default=B');
    expect(capturedPrompts[0]).toContain('Pengeluaran Default=NET_EXPORT');
  });

  it('Phase C.5 geo-filter memblokir berita kabupaten lain dengan 0 panggilan LLM dan routerOptions mencatat providerStats', async () => {
    const now = new Date('2026-10-14T12:00:00.000Z');
    const invokedTitles: string[] = [];

    const summary = await runScrapePipeline({
      runType: ScraperRunTypeEnum.MANUAL,
      mode: 'REGIONAL_ONLY',
      now,
      portals: [
        {
          id: 'koran-kaltara',
          label: 'Koran Kaltara',
          sourcePortal: 'korankaltara.com',
          indexUrl: 'https://korankaltara.com/category/tana-tidung',
          allowedHosts: ['korankaltara.com'],
          itemSelectors: ['article'],
        },
      ],
      fetchFn: async (url) => {
        if (url.includes('/category/')) {
          return {
            finalUrl: url,
            body: `
              <article><h2><a href="https://korankaltara.com/pemkab-nunukan-kucurkan-soa-krayan">Pemkab Nunukan Kucurkan Subsidi Ongkos Angkut Krayan Rp 912 Juta</a></h2><time datetime="2026-10-14T09:00:00+08:00"></time></article>
              <article><h2><a href="https://korankaltara.com/harga-sawit-sesayap-ktt-menguat">Harga TBS Sawit Kecamatan Sesayap Kabupaten Tana Tidung Menguat</a></h2><time datetime="2026-10-14T10:00:00+08:00"></time></article>
            `,
          };
        }
        if (url.includes('nunukan')) {
          return {
            finalUrl: url,
            body: buildSampleArticleHtml(
              'Pemkab Nunukan Kucurkan Subsidi Ongkos Angkut Krayan Rp 912 Juta',
              '2026-10-14T09:00:00+08:00',
            ),
          };
        }
        return {
          finalUrl: url,
          body: buildSampleArticleHtml(
            'Harga TBS Sawit Kecamatan Sesayap Kabupaten Tana Tidung Menguat',
            '2026-10-14T10:00:00+08:00',
          ),
        };
      },
      routerOptions: {
        env: {
          geminiApiKey: 'AIzaTestFakeGeminiKeyForUnitTest001',
          groqApiKey: 'gsk_TestFakeGroqKeyForUnitTest001',
        },
        geminiMinIntervalMs: 0,
        groqMinIntervalMs: 0,
        invokeSlotFn: async (req) => {
          invokedTitles.push(req.userInput);
          if (req.provider === 'gemini') {
            const err = new Error('429 Rate limit exceeded') as Error & { status: number };
            err.status = 429;
            throw err;
          }
          return {
            outputText: VALID_ECONOMIC_JSON,
            usage: { inputTokens: 310, outputTokens: 95, totalTokens: 405 },
          };
        },
      },
    });

    expect(summary.status).toBe(ScraperRunStatusEnum.SUCCESS);
    expect(summary.articlesInserted).toBe(2);
    expect(summary.nonEconomicCount).toBe(1);
    expect(summary.economicCount).toBe(1);
    expect(invokedTitles).toHaveLength(2); // 1 artikel KTT memanggil Gemini (429) -> Groq (sukses), artikel Nunukan = 0 call!

    const geoIgnored = mockInsertedArticles.find((a) => String(a.url).includes('nunukan'));
    expect(geoIgnored?.llmModel).toBe('geo-filter');
    expect(geoIgnored?.verificationStatus).toBe('IGNORED');
    expect(geoIgnored?.isEconomicPhenomenon).toBe(false);

    const kttInserted = mockInsertedArticles.find((a) => String(a.url).includes('sesayap'));
    expect(kttInserted?.llmModel).toBe('groq:llama-3.3-70b-versatile');
    expect(kttInserted?.verificationStatus).toBe('PENDING');

    expect(summary.providerStats['gemini:gemini-3.8-flash']?.rateLimits).toBe(1);
    expect(summary.providerStats['groq:llama-3.3-70b-versatile']?.successes).toBe(1);
  });

  it('harvestRegionalPortals tetap memeriksa additionalIndexUrls setelah >= 5 artikel selama < maxItemsPerPortal', async () => {
    const now = new Date('2026-10-14T12:00:00.000Z');
    const fetchedUrls: string[] = [];

    const portal: RegionalPortalConfig = {
      id: 'kaltara-test',
      label: 'Kaltara Test',
      sourcePortal: 'korankaltara.com',
      indexUrl: 'https://korankaltara.com/utama',
      additionalIndexUrls: ['https://korankaltara.com/ekonomi'],
      allowedHosts: ['korankaltara.com'],
      itemSelectors: ['article'],
    };

    const result = await harvestRegionalPortals({
      portals: [portal],
      now,
      lookbackDays: 3,
      maxItemsPerPortal: 15,
      fetchFn: async (url) => {
        fetchedUrls.push(url);
        if (url.endsWith('/utama')) {
          const articlesHtml = Array.from({ length: 6 }, (_, i) => {
            return `<article><h2><a href="https://korankaltara.com/berita-utama-${i + 1}-tana-tidung">Berita Ekonomi Tana Tidung Utama Ke ${i + 1}</a></h2><time datetime="2026-10-14T09:00:00+08:00"></time></article>`;
          }).join('\n');
          return { finalUrl: url, body: articlesHtml };
        }
        return {
          finalUrl: url,
          body: `
            <article><h2><a href="https://korankaltara.com/ekonomi-subkanal-1-ktt">Ekonomi Subkanal Pertama Kabupaten Tana Tidung</a></h2><time datetime="2026-10-14T10:00:00+08:00"></time></article>
            <article><h2><a href="https://korankaltara.com/ekonomi-subkanal-2-ktt">Ekonomi Subkanal Kedua Kabupaten Tana Tidung</a></h2><time datetime="2026-10-14T10:30:00+08:00"></time></article>
          `,
        };
      },
    });

    expect(fetchedUrls).toContain('https://korankaltara.com/utama');
    expect(fetchedUrls).toContain('https://korankaltara.com/ekonomi');
    expect(result.candidates).toHaveLength(8);
  });

  it('runScrapePipeline mengurutkan query dedup DB (.orderBy), memakai canonicalUrl satu-host, menyimpan geographicScope & menampung overflow maxArticlesPerRun sebagai FAILED DEFERRED_BATCH_CAP', async () => {
    const now = new Date('2026-10-14T12:00:00.000Z');
    const canonicalTarget = 'https://korankaltara.com/investasi-sawit-sesayap-resmi';

    const summary = await runScrapePipeline({
      runType: ScraperRunTypeEnum.MANUAL,
      mode: 'REGIONAL_ONLY',
      now,
      maxArticlesPerRun: 1,
      portals: [
        {
          id: 'koran-kaltara',
          label: 'Koran Kaltara',
          sourcePortal: 'korankaltara.com',
          indexUrl: 'https://korankaltara.com/category/tana-tidung',
          allowedHosts: ['korankaltara.com'],
          itemSelectors: ['article'],
        },
      ],
      fetchFn: async (url) => {
        if (url.includes('/category/')) {
          return {
            finalUrl: url,
            body: `
              <article><h2><a href="https://korankaltara.com/amp/investasi-sawit-sesayap">Investasi Sawit Sesayap Kabupaten Tana Tidung Resmi Beroperasi</a></h2><time datetime="2026-10-14T10:00:00+08:00"></time></article>
              <article><h2><a href="https://korankaltara.com/pelabuhan-tideng-pale-ekspor-kayu">Pelabuhan Tideng Pale KTT Genjot Ekspor Kayu Olahan Triwulan IV</a></h2><time datetime="2026-10-14T08:00:00+08:00"></time></article>
            `,
          };
        }
        if (url.includes('amp/investasi-sawit')) {
          const words = Array.from({ length: 160 }, (_, idx) => `sawit${idx + 1}`).join(' ');
          return {
            finalUrl: url,
            body: `
              <html>
                <head>
                  <title>Investasi Sawit Sesayap KTT Resmi Beroperasi</title>
                  <link rel="canonical" href="${canonicalTarget}?utm_source=amp" />
                  <meta property="article:published_time" content="2026-10-14T10:00:00+08:00" />
                </head>
                <body><article><div class="entry-content"><p>${words}.</p></div></article></body>
              </html>
            `,
          };
        }
        return {
          finalUrl: url,
          body: buildSampleArticleHtml(
            'Pelabuhan Tideng Pale KTT Genjot Ekspor Kayu Olahan Triwulan IV',
            '2026-10-14T08:00:00+08:00',
          ),
        };
      },
      routerOptions: {
        env: { groqApiKey: 'gsk_PipelineOverflowTest001' },
        groqMinIntervalMs: 0,
        invokeSlotFn: async () => ({
          outputText: VALID_ECONOMIC_JSON,
          usage: { inputTokens: 250, outputTokens: 80, totalTokens: 330 },
        }),
      },
    });

    // queryRecentArticleTitles wajib memanggil .orderBy(...)
    expect(mockOrderByCount.value).toBeGreaterThanOrEqual(1);

    // Keduanya tersimpan (1 lewat LLM, 1 overflow disimpan FAILED DEFERRED_BATCH_CAP agar disapu cron 06:30)
    expect(mockInsertedArticles).toHaveLength(2);
    expect(summary.articlesInserted).toBe(2);
    expect(summary.llmFailedCount).toBe(1);

    const processedItem = mockInsertedArticles.find((a) => a.llmStatus === 'SUCCESS');
    expect(processedItem?.url).toBe(canonicalTarget);
    expect(processedItem?.geographicScope).toBe('KTT_LOCAL');

    const deferredItem = mockInsertedArticles.find((a) => a.llmError === 'DEFERRED_BATCH_CAP');
    expect(deferredItem?.llmStatus).toBe('FAILED');
    expect(deferredItem?.verificationStatus).toBe('PENDING');
  });

  it('Phase D mendukung paralelisme terkontrol lintas-provider ketika multi-provider terkonfigurasi', async () => {
    const now = new Date('2026-10-14T12:00:00.000Z');
    let activeWorkers = 0;
    let peakWorkers = 0;

    const summary = await runScrapePipeline({
      runType: ScraperRunTypeEnum.MANUAL,
      mode: 'REGIONAL_ONLY',
      now,
      maxArticlesPerRun: 10,
      portals: [
        {
          id: 'koran-kaltara',
          label: 'Koran Kaltara',
          sourcePortal: 'korankaltara.com',
          indexUrl: 'https://korankaltara.com/category/tana-tidung',
          allowedHosts: ['korankaltara.com'],
          itemSelectors: ['article'],
        },
      ],
      fetchFn: async (url) => {
        if (url.includes('/category/')) {
          return {
            finalUrl: url,
            body: Array.from({ length: 4 }, (_, i) => {
              return `<article><h2><a href="https://korankaltara.com/berita-paralel-${i + 1}-ktt">Proyek Strategis Daerah Tana Tidung Tahap Ke ${i + 1} Berjalan</a></h2><time datetime="2026-10-14T0${i + 5}:00:00+08:00"></time></article>`;
            }).join('\n'),
          };
        }
        return {
          finalUrl: url,
          body: buildSampleArticleHtml(
            `Proyek Strategis Tana Tidung ${url.slice(-6)}`,
            '2026-10-14T09:00:00+08:00',
          ),
        };
      },
      routerOptions: {
        env: {
          geminiApiKey: 'AIzaParallelGemini001',
          groqApiKey: 'gsk_ParallelGroq001',
          cerebrasApiKey: 'csk_ParallelCerebras001',
        },
        geminiMinIntervalMs: 0,
        groqMinIntervalMs: 0,
        cerebrasMinIntervalMs: 0,
        invokeSlotFn: async () => {
          activeWorkers += 1;
          peakWorkers = Math.max(peakWorkers, activeWorkers);
          await new Promise((r) => setTimeout(r, 25));
          activeWorkers -= 1;
          return {
            outputText: VALID_ECONOMIC_JSON,
            usage: { inputTokens: 200, outputTokens: 70, totalTokens: 270 },
          };
        },
      },
    });

    expect(summary.status).toBe(ScraperRunStatusEnum.SUCCESS);
    expect(summary.articlesInserted).toBe(4);
    expect(peakWorkers).toBeGreaterThanOrEqual(2);
    expect(peakWorkers).toBeLessThanOrEqual(3);
  });
});
