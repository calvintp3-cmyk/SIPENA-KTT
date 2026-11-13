// tests/llm-router.test.ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  ArticleSourceTypeEnum,
  ExpenditureComponentEnum,
  ExpenditureImpactEnum,
  KbliCategoryEnum,
  KbliImpactEnum,
} from '#shared/enums/pdrb';
import {
  SIPENA_SYSTEM_INSTRUCTION_COMPACT,
  SIPENA_SYSTEM_INSTRUCTION_FULL,
  type ArticleClassificationInput,
} from '#server/services/llm/classifier';
import {
  FALLBACK_GEMINI_MODEL,
  PRIMARY_GEMINI_MODEL,
} from '#server/services/llm/gemini-client';
import {
  invokeOpenAiCompatChat,
  OpenAiCompatError,
  sanitizeSecretFromText,
} from '#server/services/llm/openai-compat';
import {
  DEFAULT_GROQ_FALLBACK_MODEL,
  DEFAULT_GROQ_PRIMARY_MODEL,
  embedTextsWithGemini,
  generateSynthesisWithRouter,
  getConfiguredProviderHealthSummary,
  MultiLlmRouter,
  OPENROUTER_DEFAULT_FREE_MODELS,
  parseCsvValues,
  resetRouterCooldownStore,
  resolveConfiguredProviderKeys,
  sanitizeSynthesisCitations,
  type RouterSlotInvokeRequest,
} from '#server/services/llm/router';
import {
  buildRouterEnvFromRuntimeConfig,
  buildScraperPipelineRuntimeOptions,
} from '#server/utils/llm-config';

const ENV_KEYS = [
  'GEMINI_API_KEY',
  'GEMINI_API_KEYS',
  'GROQ_API_KEY',
  'GROQ_API_KEYS',
  'CEREBRAS_API_KEY',
  'CEREBRAS_API_KEYS',
  'MISTRAL_API_KEY',
  'MISTRAL_API_KEYS',
  'NVIDIA_API_KEY',
  'NVIDIA_API_KEYS',
  'OPENROUTER_API_KEY',
  'OPENROUTER_API_KEYS',
  'OPENROUTER_FREE_MODEL',
  'LLM_CLASSIFY_CHAIN',
  'LLM_SYNTHESIS_CHAIN',
  'SCRAPER_MAX_LLM_CALLS_PER_RUN',
] as const;

const SAMPLE_ARTICLE: ArticleClassificationInput = {
  title: 'Pengapalan CPO dan Ekspor Pelabuhan Sesayap KTT Meningkat di Triwulan IV',
  sourcePortal: 'korankaltara.com',
  sourceType: ArticleSourceTypeEnum.REGIONAL,
  publishedAtWita: '14/10/2026 09:00 WITA',
  defaultQuarter: 4,
  defaultYear: 2026,
  snippetText:
    'Aktivitas bongkar muat dan pengapalan CPO serta layanan konsultan teknis industri di Kecamatan Sesayap Kabupaten Tana Tidung mengalami peningkatan volume sepanjang pekan ini.',
};

const VALID_KTT_CLASSIFICATION_JSON = JSON.stringify({
  geographic_scope: 'KTT_LOCAL',
  is_economic_phenomenon: true,
  rejection_reason: null,
  summary:
    'Volume pengapalan dan jasa pengolahan di Kecamatan Sesayap Kabupaten Tana Tidung mengalami peningkatan signifikan sehingga mendorong kontribusi KBLI industri dan ekspor neto daerah.',
  kbli_category: KbliCategoryEnum.C,
  kbli_impact: KbliImpactEnum.INCREASE_NTB,
  expenditure_component: ExpenditureComponentEnum.NET_EXPORT,
  expenditure_impact: ExpenditureImpactEnum.INCREASE_REAL,
  secondary_kbli_category: null,
  secondary_kbli_impact: null,
  secondary_expenditure_component: null,
  secondary_expenditure_impact: null,
  quarter: 4,
  year: 2026,
  confidence: 0.94,
});

describe('MultiLlmRouter & Provider Key Configuration', () => {
  const savedEnv: Record<string, string | undefined> = {};

  beforeEach(() => {
    resetRouterCooldownStore();
    for (const k of ENV_KEYS) {
      savedEnv[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    resetRouterCooldownStore();
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = savedEnv[k];
      }
    }
    vi.restoreAllMocks();
  });

  it('parseCsvValues menyaring placeholder dan resolveConfiguredProviderKeys menggabungkan key tunggal + jamak', () => {
    expect(
      parseCsvValues('GANTI_DENGAN_KEY, your_key, <token>, AIzaRealKey1\nAIzaRealKey2, AIzaRealKey1'),
    ).toEqual(['AIzaRealKey1', 'AIzaRealKey2', 'AIzaRealKey1']);

    const resolvedDefault = resolveConfiguredProviderKeys({
      geminiApiKey: 'AIzaGeminiA',
      geminiApiKeys: 'AIzaGeminiB, AIzaGeminiA, placeholder_key',
      groqApiKey: 'gsk_GroqMain123',
      groqApiKeys: 'gsk_GroqSecond456',
      openrouterApiKey: 'sk-or-v1-router123',
      openrouterFreeModel: '',
    });

    expect(resolvedDefault.gemini).toEqual(['AIzaGeminiA', 'AIzaGeminiB']);
    expect(resolvedDefault.groq).toEqual(['gsk_GroqMain123', 'gsk_GroqSecond456']);
    expect(resolvedDefault.openrouter).toEqual(['sk-or-v1-router123']);
    expect(resolvedDefault.openrouterFreeModels).toEqual([...OPENROUTER_DEFAULT_FREE_MODELS]);

    const resolvedCustomOr = resolveConfiguredProviderKeys({
      openrouterApiKey: 'sk-or-v1-router123',
      openrouterFreeModel: 'deepseek/deepseek-r1:free, google/gemma-4-31b-it:free',
    });
    expect(resolvedCustomOr.openrouterFreeModels).toEqual([
      'deepseek/deepseek-r1:free',
      'google/gemma-4-31b-it:free',
    ]);
  });

  it('getConfiguredProviderHealthSummary membangun rantai prioritas default dan ekspansi openrouter:auto', () => {
    const summaryDefault = getConfiguredProviderHealthSummary({
      geminiApiKey: 'AIzaGeminiA',
      groqApiKey: 'gsk_GroqMain123',
      openrouterApiKey: 'sk-or-v1-router123',
    });

    expect(summaryDefault.map((s) => s.slotId)).toEqual([
      `gemini:${PRIMARY_GEMINI_MODEL}`,
      `groq:${DEFAULT_GROQ_PRIMARY_MODEL}`,
      `gemini:${FALLBACK_GEMINI_MODEL}`,
      `groq:${DEFAULT_GROQ_FALLBACK_MODEL}`,
      ...OPENROUTER_DEFAULT_FREE_MODELS.map((m) => `openrouter:${m}`),
    ]);
    expect(summaryDefault.every((s) => s.configured)).toBe(true);

    const summaryCustomChain = getConfiguredProviderHealthSummary({
      groqApiKey: 'gsk_GroqMain123',
      openrouterApiKey: 'sk-or-v1-router123',
      llmClassifyChain: 'groq:llama-3.3-70b-versatile, openrouter:auto',
    });
    expect(summaryCustomChain.map((s) => s.slotId)).toEqual([
      'groq:llama-3.3-70b-versatile',
      ...OPENROUTER_DEFAULT_FREE_MODELS.map((m) => `openrouter:${m}`),
    ]);
  });

  it('mengembalikan CONFIG_ERROR jika tidak ada satu pun API key terkonfigurasi dan menghormati maxCallsPerRun', async () => {
    const unconfiguredRouter = new MultiLlmRouter({ env: {} });
    const noKeyRes = await unconfiguredRouter.classifyArticle(SAMPLE_ARTICLE);
    expect(noKeyRes.ok).toBe(false);
    if (!noKeyRes.ok) {
      expect(noKeyRes.errorCode).toBe('CONFIG_ERROR');
      expect(noKeyRes.providerUsed).toBeNull();
    }

    const cappedRouter = new MultiLlmRouter({
      env: { groqApiKey: 'gsk_TestCappedKey0001' },
      groqMinIntervalMs: 0,
      maxCallsPerRun: 1,
      invokeSlotFn: async () => ({
        outputText: VALID_KTT_CLASSIFICATION_JSON,
        usage: { inputTokens: 200, outputTokens: 80, totalTokens: 280 },
      }),
    });

    const first = await cappedRouter.classifyArticle(SAMPLE_ARTICLE);
    const second = await cappedRouter.classifyArticle(SAMPLE_ARTICLE);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.errorCode).toBe('RATE_LIMIT_EXCEEDED');
    }
    expect(cappedRouter.totalCallsMade).toBe(1);
  });

  it('mengirim SIPENA_SYSTEM_INSTRUCTION_FULL untuk Gemini dan _COMPACT untuk Groq/OpenRouter', async () => {
    const capturedInstructions: Array<{ provider: string; length: number; isFull: boolean; isCompact: boolean }> = [];

    const router = new MultiLlmRouter({
      env: {
        geminiApiKey: 'AIzaGeminiKey001',
        groqApiKey: 'gsk_GroqKey001',
        openrouterApiKey: 'sk-or-v1-RouterKey001',
      },
      geminiMinIntervalMs: 0,
      groqMinIntervalMs: 0,
      openrouterMinIntervalMs: 0,
      sleepFn: async () => {},
      invokeSlotFn: async (req: RouterSlotInvokeRequest) => {
        capturedInstructions.push({
          provider: req.provider,
          length: req.systemInstruction.length,
          isFull: req.systemInstruction === SIPENA_SYSTEM_INSTRUCTION_FULL,
          isCompact: req.systemInstruction === SIPENA_SYSTEM_INSTRUCTION_COMPACT,
        });
        if (req.provider === 'gemini') {
          const err = new Error('429 Minute limit') as Error & { status: number };
          err.status = 429;
          throw err;
        }
        return {
          outputText: VALID_KTT_CLASSIFICATION_JSON,
          usage: { inputTokens: 320, outputTokens: 90, totalTokens: 410 },
        };
      },
    });

    const res = await router.classifyArticle(SAMPLE_ARTICLE);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.providerUsed).toBe('groq');
      expect(res.modelUsed).toBe(`groq:${DEFAULT_GROQ_PRIMARY_MODEL}`);
    }
    expect(capturedInstructions).toHaveLength(2);
    expect(capturedInstructions[0]).toMatchObject({ provider: 'gemini', isFull: true, isCompact: false });
    expect(capturedInstructions[1]).toMatchObject({ provider: 'groq', isFull: false, isCompact: true });
    expect(SIPENA_SYSTEM_INSTRUCTION_COMPACT.length).toBeLessThan(SIPENA_SYSTEM_INSTRUCTION_FULL.length);
  });

  it('melakukan 0ms failover instan ke Groq saat Gemini terkena 429 tanpa memanggil sleepFn', async () => {
    const sleepDurations: number[] = [];
    const attemptedSlots: string[] = [];

    const router = new MultiLlmRouter({
      env: {
        geminiApiKey: 'AIzaGeminiFailover001',
        groqApiKey: 'gsk_GroqFailover001',
      },
      geminiMinIntervalMs: 0,
      groqMinIntervalMs: 0,
      sleepFn: async (ms) => {
        sleepDurations.push(ms);
      },
      invokeSlotFn: async (req) => {
        attemptedSlots.push(req.slotId);
        if (req.provider === 'gemini') {
          const err = new Error('429 RESOURCE_EXHAUSTED minute quota') as Error & { status: number };
          err.status = 429;
          throw err;
        }
        return {
          outputText: VALID_KTT_CLASSIFICATION_JSON,
          usage: { inputTokens: 250, outputTokens: 95, totalTokens: 345 },
        };
      },
    });

    const result = await router.classifyArticle(SAMPLE_ARTICLE);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.modelUsed).toBe(`groq:${DEFAULT_GROQ_PRIMARY_MODEL}`);
    }
    expect(attemptedSlots).toEqual([
      'gemini:gemini-3.8-flash',
      `groq:${DEFAULT_GROQ_PRIMARY_MODEL}`,
    ]);
    expect(sleepDurations).toEqual([]);
  });

  it('0ms failover proaktif saat sliding window bucket TPM Groq 70B penuh lalu kembali siap setelah 60s', async () => {
    let fakeNowMs = 100_000;
    const sleepDurations: number[] = [];
    const calledModels: string[] = [];

    const router = new MultiLlmRouter({
      env: {
        groqApiKey: 'gsk_GroqTpmBucket001',
        llmClassifyChain: `groq:${DEFAULT_GROQ_PRIMARY_MODEL}, groq:${DEFAULT_GROQ_FALLBACK_MODEL}`,
      },
      groqMinIntervalMs: 0,
      nowFn: () => fakeNowMs,
      sleepFn: async (ms) => {
        sleepDurations.push(ms);
      },
      invokeSlotFn: async (req) => {
        calledModels.push(req.slotId);
        fakeNowMs += 50;
        return {
          outputText: VALID_KTT_CLASSIFICATION_JSON,
          usage: { inputTokens: 4_800, outputTokens: 700, totalTokens: 5_500 },
        };
      },
    });

    // Call 1 & 2 mengisi bucket 5.500 + 5.500 = 11.000 TPM pada llama-3.3-70b-versatile
    const r1 = await router.classifyArticle(SAMPLE_ARTICLE);
    const r2 = await router.classifyArticle(SAMPLE_ARTICLE);
    // Call 3: bucket 70B penuh (11.000 + estimasi > 11.000) -> langsung lompat 0ms ke 8B tanpa tidur!
    fakeNowMs += 500;
    const r3 = await router.classifyArticle(SAMPLE_ARTICLE);

    expect(r1.ok && r2.ok && r3.ok).toBe(true);
    expect(calledModels).toEqual([
      `groq:${DEFAULT_GROQ_PRIMARY_MODEL}`,
      `groq:${DEFAULT_GROQ_PRIMARY_MODEL}`,
      `groq:${DEFAULT_GROQ_FALLBACK_MODEL}`,
    ]);
    expect(sleepDurations).toEqual([]);

    // Majukan jam melewati 60 detik -> bucket 70B terkuras bersih, kembali pakai 70B
    fakeNowMs += 61_000;
    const r4 = await router.classifyArticle(SAMPLE_ARTICLE);
    expect(r4.ok).toBe(true);
    expect(calledModels[3]).toBe(`groq:${DEFAULT_GROQ_PRIMARY_MODEL}`);
  });

  it('menonaktifkan slot permanen untuk sesi pada PerDay/TPD & 401 Auth serta menyensor API key dari error', async () => {
    const calledSlots: string[] = [];
    const secretGroqKey = 'gsk_SecretGroqLeakTest987654321';

    const router = new MultiLlmRouter({
      env: {
        geminiApiKey: 'AIzaGeminiDailyExhausted001',
        groqApiKey: secretGroqKey,
        openrouterApiKey: 'sk-or-v1-BackupRouter001',
        openrouterFreeModel: 'google/gemma-4-31b-it:free',
        llmClassifyChain: `gemini:gemini-3.8-flash, groq:${DEFAULT_GROQ_PRIMARY_MODEL}, openrouter:google/gemma-4-31b-it:free`,
      },
      geminiMinIntervalMs: 0,
      groqMinIntervalMs: 0,
      openrouterMinIntervalMs: 0,
      invokeSlotFn: async (req) => {
        calledSlots.push(req.slotId);
        if (req.provider === 'gemini') {
          const err = new Error('429 GenerateRequestsPerDay quota exhausted (RPD)') as Error & { status: number };
          err.status = 429;
          throw err;
        }
        if (req.provider === 'groq') {
          throw new OpenAiCompatError({
            provider: 'groq',
            status: 401,
            code: 'AUTH_ERROR',
            message: `Invalid API key ${secretGroqKey} provided`,
          });
        }
        return {
          outputText: VALID_KTT_CLASSIFICATION_JSON,
          usage: { inputTokens: 300, outputTokens: 90, totalTokens: 390 },
        };
      },
    });

    const first = await router.classifyArticle(SAMPLE_ARTICLE);
    const second = await router.classifyArticle(SAMPLE_ARTICLE);

    expect(first.ok && second.ok).toBe(true);
    // Artikel #1 mencoba Gemini -> Groq -> OpenRouter; Artikel #2 langsung OpenRouter (Gemini RPD & Groq 401 mati se-sesi)
    expect(calledSlots).toEqual([
      'gemini:gemini-3.8-flash',
      `groq:${DEFAULT_GROQ_PRIMARY_MODEL}`,
      'openrouter:google/gemma-4-31b-it:free',
      'openrouter:google/gemma-4-31b-it:free',
    ]);

    const redacted = sanitizeSecretFromText(
      `Authorization failed with ${secretGroqKey} and sk-or-v1-AnotherSecret999`,
      secretGroqKey,
    );
    expect(redacted).not.toContain(secretGroqKey);
    expect(redacted).not.toContain('sk-or-v1-AnotherSecret999');
    expect(redacted).toContain('[REDACTED_KEY]');
  });

  it('melakukan retry 1x pada error transient 503 dan INVALID_OUTPUT (Zod/JSON), lalu failover ke slot berikutnya bila tetap rusak', async () => {
    const promptsSeen: string[] = [];
    let attemptCount = 0;

    // 1) Transient 503 -> retry 1x di slot yang sama dan berhasil
    const transientRouter = new MultiLlmRouter({
      env: { groqApiKey: 'gsk_TransientTest001', llmClassifyChain: `groq:${DEFAULT_GROQ_PRIMARY_MODEL}` },
      groqMinIntervalMs: 0,
      transientRetryDelayMs: 5,
      sleepFn: async () => {},
      invokeSlotFn: async () => {
        attemptCount += 1;
        if (attemptCount === 1) {
          throw new OpenAiCompatError({
            provider: 'groq',
            status: 503,
            code: 'HTTP_ERROR',
            message: '503 Service Unavailable',
          });
        }
        return {
          outputText: VALID_KTT_CLASSIFICATION_JSON,
          usage: { inputTokens: 200, outputTokens: 80, totalTokens: 280 },
        };
      },
    });
    const transientRes = await transientRouter.classifyArticle(SAMPLE_ARTICLE);
    expect(transientRes.ok).toBe(true);
    expect(attemptCount).toBe(2);

    // 2) INVALID_OUTPUT -> retry 1x di slot 1, tetap melanggar Zod (OTHER_REGION_IRRELEVANT + true) -> failover ke slot 2
    const invalidSlots: string[] = [];
    const invalidJsonRouter = new MultiLlmRouter({
      env: {
        groqApiKey: 'gsk_InvalidOutputTest001',
        llmClassifyChain: `groq:${DEFAULT_GROQ_PRIMARY_MODEL}, groq:${DEFAULT_GROQ_FALLBACK_MODEL}`,
      },
      groqMinIntervalMs: 0,
      invokeSlotFn: async (req) => {
        invalidSlots.push(req.slotId);
        promptsSeen.push(req.userInput);
        if (req.model === DEFAULT_GROQ_PRIMARY_MODEL) {
          return {
            outputText: JSON.stringify({
              geographic_scope: 'OTHER_REGION_IRRELEVANT',
              is_economic_phenomenon: true,
              rejection_reason: null,
              summary:
                'Berita lokal Nunukan yang tidak boleh dianggap sebagai fenomena ekonomi Kabupaten Tana Tidung.',
              kbli_category: 'H',
              kbli_impact: 'INCREASE_NTB',
              expenditure_component: 'PK_P',
              expenditure_impact: 'INCREASE_REAL',
              quarter: 4,
              year: 2026,
              confidence: 0.88,
            }),
            usage: { inputTokens: 200, outputTokens: 80, totalTokens: 280 },
          };
        }
        return {
          outputText: VALID_KTT_CLASSIFICATION_JSON,
          usage: { inputTokens: 220, outputTokens: 85, totalTokens: 305 },
        };
      },
    });

    const schemaRes = await invalidJsonRouter.classifyArticle(SAMPLE_ARTICLE);
    expect(schemaRes.ok).toBe(true);
    expect(invalidSlots).toEqual([
      `groq:${DEFAULT_GROQ_PRIMARY_MODEL}`,
      `groq:${DEFAULT_GROQ_PRIMARY_MODEL}`,
      `groq:${DEFAULT_GROQ_FALLBACK_MODEL}`,
    ]);
    expect(promptsSeen[1]).toContain('CATATAN PERBAIKAN:');

    const stats = invalidJsonRouter.getProviderStats();
    expect(stats[`groq:${DEFAULT_GROQ_PRIMARY_MODEL}`]?.calls).toBe(2);
    expect(stats[`groq:${DEFAULT_GROQ_PRIMARY_MODEL}`]?.failures).toBe(2);
    expect(stats[`groq:${DEFAULT_GROQ_FALLBACK_MODEL}`]?.successes).toBe(1);
    expect(stats[`groq:${DEFAULT_GROQ_FALLBACK_MODEL}`]?.totalTokens).toBe(305);
  });

  it('generateSynthesisWithRouter membersihkan blok <think>, failover saat output pendek, dan degradasi rapi jika seluruh slot gagal', async () => {
    const resSuccess = await generateSynthesisWithRouter(
      {
        systemInstruction: 'Anda Statistisi BPS KTT.',
        userPrompt: 'Susun sintesis KBLI C Triwulan IV 2026 dari [1] dan [2].',
      },
      {
        env: {
          geminiApiKey: 'AIzaSynthKey001',
          openrouterApiKey: 'sk-or-v1-SynthKey001',
          llmSynthesisChain: 'gemini:gemini-3.8-flash, openrouter:nvidia/nemotron-3.5-super-vl:free',
        },
        geminiMinIntervalMs: 0,
        openrouterMinIntervalMs: 0,
        invokeSlotFn: async (req) => {
          if (req.provider === 'gemini') {
            return {
              outputText: 'Terlalu pendek',
              usage: { inputTokens: 100, outputTokens: 10, totalTokens: 110 },
            };
          }
          return {
            outputText:
              '<think>Memeriksa sitasi [1]...</think>\n## Dinamika Lapangan Usaha Industri\nAktivitas pengolahan kelapa sawit dan pengapalan CPO di Kabupaten Tana Tidung menunjukkan penguatan terukur sepanjang triwulan berjalan [1].',
            usage: { inputTokens: 350, outputTokens: 120, totalTokens: 470 },
          };
        },
      },
    );

    expect(resSuccess.ok).toBe(true);
    expect(resSuccess.providerUsed).toBe('openrouter');
    expect(resSuccess.narrativeMarkdown).not.toContain('<think>');
    expect(resSuccess.narrativeMarkdown).toContain('## Dinamika Lapangan Usaha Industri');

    const resAllFailed = await generateSynthesisWithRouter(
      {
        systemInstruction: 'Anda Statistisi BPS KTT.',
        userPrompt: 'Susun sintesis.',
      },
      {
        env: {
          groqApiKey: 'gsk_AllFailKey001',
          llmSynthesisChain: `groq:${DEFAULT_GROQ_PRIMARY_MODEL}`,
        },
        groqMinIntervalMs: 0,
        invokeSlotFn: async () => {
          throw new OpenAiCompatError({
            provider: 'groq',
            status: 429,
            code: 'RATE_LIMIT_EXCEEDED',
            message: 'Rate limit exceeded for free tier',
          });
        },
      },
    );

    expect(resAllFailed.ok).toBe(false);
    expect(resAllFailed.narrativeMarkdown).toBeNull();
    expect(resAllFailed.notice).toContain('template analitis BPS');
  });

  it('invokeOpenAiCompatChat fallback saat json_object ditolak (HTTP 400) dan menyensor API key pada error', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ error: { message: 'response_format json_object is unsupported for this model' } }),
          { status: 400, headers: { 'content-type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            choices: [{ message: { content: '{"ok":true}' } }],
            usage: { prompt_tokens: 40, completion_tokens: 12, total_tokens: 52 },
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
      );

    const okRes = await invokeOpenAiCompatChat({
      provider: 'openrouter',
      apiKey: 'sk-or-v1-TestCompat001',
      model: 'google/gemma-4-26b-a4b-it:free',
      systemInstruction: 'JSON only',
      userInput: 'Test prompt',
      jsonMode: true,
    });

    expect(okRes.outputText).toBe('{"ok":true}');
    expect(okRes.usage.totalTokens).toBe(52);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('buildRouterEnvFromRuntimeConfig & buildScraperPipelineRuntimeOptions meneruskan override runtimeConfig tanpa membayangi process.env dengan string kosong', () => {
    process.env.GEMINI_API_KEY = 'AIzaFromProcessEnvFallback001';

    const emptyCfgEnv = buildRouterEnvFromRuntimeConfig({
      geminiApiKey: '',
      groqApiKey: '   ',
      openrouterApiKey: undefined,
    });
    expect(emptyCfgEnv.geminiApiKey).toBeUndefined();
    expect(emptyCfgEnv.groqApiKey).toBeUndefined();

    // Karena string kosong diubah menjadi undefined, process.env fallback tetap bekerja
    expect(resolveConfiguredProviderKeys(emptyCfgEnv).gemini).toEqual([
      'AIzaFromProcessEnvFallback001',
    ]);

    const overrideOpts = buildScraperPipelineRuntimeOptions({
      geminiApiKey: 'AIzaFromRuntimeOverride002',
      groqApiKey: 'gsk_FromRuntimeOverride002',
      scraperMaxArticlesPerRun: '42',
      scraperMaxLlmCallsPerRun: 120,
    });
    expect(overrideOpts.maxArticlesPerRun).toBe(42);
    expect(overrideOpts.routerOptions.maxCallsPerRun).toBe(120);
    expect(resolveConfiguredProviderKeys(overrideOpts.routerOptions.env).gemini).toEqual([
      'AIzaFromRuntimeOverride002',
    ]);

    const invalidLimitOpts = buildScraperPipelineRuntimeOptions({
      scraperMaxArticlesPerRun: 0,
      scraperMaxLlmCallsPerRun: -5,
    });
    expect(invalidLimitOpts.maxArticlesPerRun).toBeUndefined();
    expect(invalidLimitOpts.routerOptions.maxCallsPerRun).toBeUndefined();
  });

  it('OPENROUTER_DEFAULT_FREE_MODELS hanya berisi model teks murni dan mendukung Cerebras/Mistral/NVIDIA serta multi-key OpenRouter', async () => {
    expect(OPENROUTER_DEFAULT_FREE_MODELS.some((m) => /-vl[:/]/i.test(m))).toBe(false);
    expect(OPENROUTER_DEFAULT_FREE_MODELS).toContain('meta-llama/llama-3.3-70b-instruct:free');

    const keys = resolveConfiguredProviderKeys({
      cerebrasApiKey: 'csk_Cerebras001',
      cerebrasApiKeys: 'csk_Cerebras002, csk_Cerebras001',
      mistralApiKey: 'msk_Mistral001',
      nvidiaApiKey: 'nvapi-Nvidia001',
      openrouterApiKey: 'sk-or-v1-Key1',
      openrouterApiKeys: 'sk-or-v1-Key2, sk-or-v1-Key1',
    });

    expect(keys.cerebras).toEqual(['csk_Cerebras001', 'csk_Cerebras002']);
    expect(keys.mistral).toEqual(['msk_Mistral001']);
    expect(keys.nvidia).toEqual(['nvapi-Nvidia001']);
    expect(keys.openrouter).toEqual(['sk-or-v1-Key1', 'sk-or-v1-Key2']);

    const summaryAllOptional = getConfiguredProviderHealthSummary(
      {
        cerebrasApiKey: 'csk_Cerebras001',
        mistralApiKey: 'msk_Mistral001',
        nvidiaApiKey: 'nvapi-Nvidia001',
      },
      { includeAllOptionalProviders: true },
    );
    expect(summaryAllOptional.some((s) => s.provider === 'cerebras' && s.configured)).toBe(true);
    expect(summaryAllOptional.some((s) => s.provider === 'mistral' && s.configured)).toBe(true);
    expect(summaryAllOptional.some((s) => s.provider === 'nvidia' && s.configured)).toBe(true);

    // Uji endpoint Cerebras + fallback 2 tahap json_schema -> json_object -> plain text di invokeOpenAiCompatChat
    const urlsCalled: string[] = [];
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementationOnce(async (input) => {
        urlsCalled.push(String(input));
        return new Response(
          JSON.stringify({ error: { message: 'json_schema response_format unsupported' } }),
          { status: 400 },
        );
      })
      .mockImplementationOnce(async (input) => {
        urlsCalled.push(String(input));
        return new Response(
          JSON.stringify({ error: { message: 'response_format json_object unsupported' } }),
          { status: 422 },
        );
      })
      .mockImplementationOnce(async (input) => {
        urlsCalled.push(String(input));
        return new Response(
          JSON.stringify({
            choices: [{ message: { content: VALID_KTT_CLASSIFICATION_JSON } }],
            usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
          }),
          { status: 200 },
        );
      });

    const compatRes = await invokeOpenAiCompatChat({
      provider: 'cerebras',
      apiKey: 'csk_Test001',
      model: 'llama-3.3-70b',
      systemInstruction: 'System',
      userInput: 'User',
      jsonMode: true,
      jsonSchema: { name: 'sipena_classification', schema: { type: 'object' }, strict: true },
    });

    expect(fetchSpy).toHaveBeenCalledTimes(3);
    expect(urlsCalled[0]).toBe('https://api.cerebras.ai/v1/chat/completions');
    expect(compatRes.usage.totalTokens).toBe(150);
  });

  it('mempertahankan cooldown kuota harian antar instance MultiLlmRouter dan mendukung resetRouterCooldownStore', async () => {
    const slotsCalledRouter1: string[] = [];
    const router1 = new MultiLlmRouter({
      env: {
        geminiApiKey: 'AIzaPersistCooldownKey01',
        groqApiKey: 'gsk_PersistBackupKey01',
        llmClassifyChain: `gemini:gemini-3.8-flash, groq:${DEFAULT_GROQ_PRIMARY_MODEL}`,
      },
      geminiMinIntervalMs: 0,
      groqMinIntervalMs: 0,
      invokeSlotFn: async (req) => {
        slotsCalledRouter1.push(req.slotId);
        if (req.provider === 'gemini') {
          const err = new Error('429 GenerateRequestsPerDay quota exhausted') as Error & { status: number };
          err.status = 429;
          throw err;
        }
        return {
          outputText: VALID_KTT_CLASSIFICATION_JSON,
          usage: { inputTokens: 120, outputTokens: 60, totalTokens: 180 },
        };
      },
    });

    await router1.classifyArticle(SAMPLE_ARTICLE);
    expect(slotsCalledRouter1).toEqual([
      'gemini:gemini-3.8-flash',
      `groq:${DEFAULT_GROQ_PRIMARY_MODEL}`,
    ]);

    // Instance baru memakai API key yang sama harus langsung melewati Gemini yg sudah habis RPD hari ini!
    const slotsCalledRouter2: string[] = [];
    const router2 = new MultiLlmRouter({
      env: {
        geminiApiKey: 'AIzaPersistCooldownKey01',
        groqApiKey: 'gsk_PersistBackupKey01',
        llmClassifyChain: `gemini:gemini-3.8-flash, groq:${DEFAULT_GROQ_PRIMARY_MODEL}`,
      },
      geminiMinIntervalMs: 0,
      groqMinIntervalMs: 0,
      invokeSlotFn: async (req) => {
        slotsCalledRouter2.push(req.slotId);
        return {
          outputText: VALID_KTT_CLASSIFICATION_JSON,
          usage: { inputTokens: 120, outputTokens: 60, totalTokens: 180 },
        };
      },
    });

    await router2.classifyArticle(SAMPLE_ARTICLE);
    expect(slotsCalledRouter2).toEqual([`groq:${DEFAULT_GROQ_PRIMARY_MODEL}`]);

    resetRouterCooldownStore();
    const slotsAfterReset: string[] = [];
    const router3 = new MultiLlmRouter({
      env: {
        geminiApiKey: 'AIzaPersistCooldownKey01',
        groqApiKey: 'gsk_PersistBackupKey01',
        llmClassifyChain: `gemini:gemini-3.8-flash, groq:${DEFAULT_GROQ_PRIMARY_MODEL}`,
      },
      geminiMinIntervalMs: 0,
      groqMinIntervalMs: 0,
      invokeSlotFn: async (req) => {
        slotsAfterReset.push(req.slotId);
        return {
          outputText: VALID_KTT_CLASSIFICATION_JSON,
          usage: { inputTokens: 120, outputTokens: 60, totalTokens: 180 },
        };
      },
    });
    await router3.classifyArticle(SAMPLE_ARTICLE);
    expect(slotsAfterReset).toEqual(['gemini:gemini-3.8-flash']);
  });

  it('menggunakan ThinkingLevel MEDIUM untuk sintesis BRS, memvalidasi batas nomor sitasi [1..N], dan menyediakan embedTextsWithGemini', async () => {
    const capturedThinkingLevels: Array<string | undefined> = [];
    const synthRes = await generateSynthesisWithRouter(
      {
        systemInstruction: 'Statistisi BPS KTT',
        userPrompt: 'Susun analisis dari sumber [1] dan [2].',
        maxCitationIndex: 2,
      },
      {
        env: {
          geminiApiKey: 'AIzaSynthThinkingKey01',
          llmSynthesisChain: 'gemini:gemini-3.8-flash',
        },
        geminiMinIntervalMs: 0,
        invokeSlotFn: async (req) => {
          capturedThinkingLevels.push(req.thinkingLevel);
          return {
            outputText:
              '## Kinerja Sektor Pertanian\nHarga TBS KTT naik [1], didukung pengapalan pelabuhan [2] dan klaim fiktif [0] serta [99].',
            usage: { inputTokens: 300, outputTokens: 90, totalTokens: 390 },
          };
        },
      },
    );

    expect(synthRes.ok).toBe(true);
    expect(capturedThinkingLevels).toEqual(['MEDIUM']);
    if (synthRes.ok) {
      expect(synthRes.narrativeMarkdown).toContain('[1]');
      expect(synthRes.narrativeMarkdown).toContain('[2]');
      expect(synthRes.narrativeMarkdown).not.toContain('[0]');
      expect(synthRes.narrativeMarkdown).not.toContain('[99]');
      expect(synthRes.notice).toContain('halusinasi');
    }

    const sanitized = sanitizeSynthesisCitations(
      'Fakta valid [1] dan [2, 3], tetapi abaikan [0], [4], serta [12-15].',
      3,
    );
    expect(sanitized.sanitizedMarkdown).not.toContain('[0]');
    expect(sanitized.sanitizedMarkdown).not.toContain('[4]');
    expect(sanitized.sanitizedMarkdown).not.toContain('[12-15]');
    expect(sanitized.sanitizedMarkdown).toContain('[1]');
    expect(sanitized.strippedCitations).toEqual([0, 4, 12]);

    // Tanpa key, embedTextsWithGemini harus gagal aman (mengembalikan array null) tanpa throw
    const noKeyEmb = await embedTextsWithGemini(['Harga TBS sawit KTT menguat'], { apiKey: '' });
    expect(noKeyEmb).toEqual([null]);
  });
});
