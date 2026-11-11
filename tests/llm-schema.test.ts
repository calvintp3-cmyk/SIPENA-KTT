// tests/llm-schema.test.ts
import { describe, expect, it, vi } from 'vitest';
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
  mapClassificationToPersistence,
  parseAndValidateLlmJson,
} from '#server/services/llm/classifier';
import {
  FALLBACK_GEMINI_MODEL,
  GeminiClassificationWorker,
  PRIMARY_GEMINI_MODEL,
  type GeminiInvokeFn,
} from '#server/services/llm/gemini-client';

const SAMPLE_INPUT = {
  title: 'Harga TBS Sawit Tana Tidung Menguat ke Rp 2.980 per Kilogram',
  sourcePortal: 'korankaltara.com',
  sourceType: ArticleSourceTypeEnum.REGIONAL,
  publishedAtWita: '14/10/2026 09:15 WITA',
  defaultQuarter: 4 as const,
  defaultYear: 2026,
  snippetText:
    'Harga tandan buah segar kelapa sawit di Kabupaten Tana Tidung kembali naik seiring tingginya permintaan CPO antarpulau pada awal Oktober 2026.',
};

const VALID_ECONOMIC_JSON = JSON.stringify({
  is_economic_phenomenon: true,
  rejection_reason: null,
  summary:
    'Harga pembelian TBS kelapa sawit di Kabupaten Tana Tidung naik menjadi Rp 2.980/kg pada awal Oktober 2026 karena tingginya permintaan CPO antarpulau.',
  kbli_category: KbliCategoryEnum.A,
  kbli_impact: KbliImpactEnum.INCREASE_PRICE,
  expenditure_component: ExpenditureComponentEnum.NET_EXPORT,
  expenditure_impact: ExpenditureImpactEnum.INCREASE_REAL,
  quarter: 4,
  year: 2026,
  confidence: 0.94,
});

const VALID_NON_ECONOMIC_JSON = JSON.stringify({
  is_economic_phenomenon: false,
  rejection_reason: 'Berita seremonial pelantikan organisasi tanpa dampak output atau harga.',
  summary:
    'Pemerintah daerah menghadiri pengukuhan pengurus organisasi kemasyarakatan tingkat kabupaten tanpa pengumuman proyek maupun alokasi anggaran.',
  kbli_category: null,
  kbli_impact: null,
  expenditure_component: null,
  expenditure_impact: null,
  quarter: 4,
  year: 2026,
  confidence: 0.92,
});

describe('LLM Classifier Schema & Gemini Worker Resilience', () => {
  it('memvalidasi JSON ekonomi termasuk saat terbungkus markdown code fence dan memetakannya ke PENDING', () => {
    const parsed = parseAndValidateLlmJson(`\`\`\`json\n${VALID_ECONOMIC_JSON}\n\`\`\``);
    expect(parsed.is_economic_phenomenon).toBe(true);
    expect(parsed.kbli_category).toBe(KbliCategoryEnum.A);

    const persistence = mapClassificationToPersistence(parsed, PRIMARY_GEMINI_MODEL);
    expect(persistence.verificationStatus).toBe(VerificationStatusEnum.PENDING);
    expect(persistence.llmStatus).toBe(LlmStatusEnum.SUCCESS);
    expect(persistence.kbliCategory).toBe(KbliCategoryEnum.A);
  });

  it('memvalidasi JSON non-ekonomi dan langsung memetakannya ke IGNORED serta menolak field KBLI non-null', () => {
    const parsed = parseAndValidateLlmJson(VALID_NON_ECONOMIC_JSON);
    expect(parsed.is_economic_phenomenon).toBe(false);

    const persistence = mapClassificationToPersistence(parsed, PRIMARY_GEMINI_MODEL);
    expect(persistence.verificationStatus).toBe(VerificationStatusEnum.IGNORED);
    expect(persistence.kbliCategory).toBeNull();
    expect(persistence.llmError).toContain('seremonial');

    // Invalid: non-economic tapi kbli_category terisi
    expect(() =>
      parseAndValidateLlmJson(
        JSON.stringify({
          ...JSON.parse(VALID_NON_ECONOMIC_JSON),
          kbli_category: 'O',
        }),
      ),
    ).toThrow();

    // Invalid: economic = true tapi expenditure_component null
    expect(() =>
      parseAndValidateLlmJson(
        JSON.stringify({
          ...JSON.parse(VALID_ECONOMIC_JSON),
          expenditure_component: null,
        }),
      ),
    ).toThrow();
  });

  it('melakukan exponential backoff + jitter pada HTTP 429 dan fallback ke gemini-3.5-flash-lite', async () => {
    const delays: number[] = [];
    const modelsCalled: string[] = [];

    const mockInvoke: GeminiInvokeFn = vi.fn(async (req) => {
      modelsCalled.push(req.model);
      if (req.model === PRIMARY_GEMINI_MODEL) {
        const err = new Error('429 RESOURCE_EXHAUSTED: Quota exceeded') as Error & { status: number };
        err.status = 429;
        throw err;
      }
      return {
        outputText: VALID_ECONOMIC_JSON,
        usage: { inputTokens: 610, outputTokens: 135, totalTokens: 745 },
      };
    });

    const worker = new GeminiClassificationWorker({
      minIntervalMs: 0,
      invokeFn: mockInvoke,
      sleepFn: async (ms) => {
        delays.push(ms);
      },
      randomFn: () => 0.5,
    });

    const res = await worker.classifyArticle(SAMPLE_INPUT);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.modelUsed).toBe(FALLBACK_GEMINI_MODEL);
      expect(res.usage.totalTokens).toBe(745);
    }

    // 4 panggilan primary (1 awal + 3 retry 429) lalu 1 panggilan fallback lite
    expect(modelsCalled).toEqual([
      PRIMARY_GEMINI_MODEL,
      PRIMARY_GEMINI_MODEL,
      PRIMARY_GEMINI_MODEL,
      PRIMARY_GEMINI_MODEL,
      FALLBACK_GEMINI_MODEL,
    ]);
    // Backoff exact: 10000 + 0.5*3000, 25000 + 0.5*5000, 60000 + 0.5*8000
    expect(delays).toEqual([11_500, 27_500, 64_000]);
  });

  it('melakukan retry 1x saat output JSON/Zod cacat dan berhasil pada percobaan ke-2', async () => {
    let attempt = 0;
    const mockInvoke: GeminiInvokeFn = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) {
        return {
          outputText: '{"is_economic_phenomenon": true, "summary": "Terlalu pendek"}',
          usage: { inputTokens: 500, outputTokens: 20, totalTokens: 520 },
        };
      }
      return {
        outputText: VALID_ECONOMIC_JSON,
        usage: { inputTokens: 580, outputTokens: 140, totalTokens: 720 },
      };
    });

    const worker = new GeminiClassificationWorker({
      minIntervalMs: 0,
      invokeFn: mockInvoke,
      sleepFn: async () => {},
    });

    const res = await worker.classifyArticle(SAMPLE_INPUT);
    expect(res.ok).toBe(true);
    expect(attempt).toBe(2);
    expect(res.usage.totalTokens).toBe(520 + 720);
  });

  it('menghormati batas maxCallsPerRun dan melaporkan kegagalan secara bersih', async () => {
    const worker = new GeminiClassificationWorker({
      minIntervalMs: 0,
      maxCallsPerRun: 1,
      invokeFn: async () => ({
        outputText: VALID_ECONOMIC_JSON,
        usage: { inputTokens: 400, outputTokens: 100, totalTokens: 500 },
      }),
      sleepFn: async () => {},
    });

    const first = await worker.classifyArticle(SAMPLE_INPUT);
    expect(first.ok).toBe(true);

    const second = await worker.classifyArticle(SAMPLE_INPUT);
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.errorCode).toBe('RATE_LIMIT_EXCEEDED');
    }
  });
});

