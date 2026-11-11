// server/services/llm/gemini-client.ts
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  LLM_CLASSIFICATION_JSON_SCHEMA,
  type LlmClassificationOutput,
} from '../../../shared/schemas/llm-output.schema';
import {
  buildClassificationPrompt,
  parseAndValidateLlmJson,
  SIPENA_SYSTEM_INSTRUCTION,
  type ArticleClassificationInput,
} from './classifier';

export const PRIMARY_GEMINI_MODEL = 'gemini-3.8-flash' as const;
export const FALLBACK_GEMINI_MODEL = 'gemini-3.5-flash-lite' as const;

export const GEMINI_REQUEST_TIMEOUT_MS = 15_000;

export type SupportedGeminiModel = typeof PRIMARY_GEMINI_MODEL | typeof FALLBACK_GEMINI_MODEL;

export interface GeminiTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface GeminiInvokeRequest {
  model: SupportedGeminiModel;
  systemInstruction: string;
  userInput: string;
  abortSignal?: AbortSignal;
}

export interface GeminiInvokeResponse {
  outputText: string;
  usage: GeminiTokenUsage;
}

export type GeminiInvokeFn = (request: GeminiInvokeRequest) => Promise<GeminiInvokeResponse>;

export type ClassificationErrorCode =
  | 'RATE_LIMIT_EXCEEDED'
  | 'SERVICE_UNAVAILABLE'
  | 'INVALID_OUTPUT'
  | 'CONFIG_ERROR'
  | 'TIMEOUT_BUDGET_EXCEEDED'
  | 'API_ERROR';

export type ClassificationResult =
  | {
      ok: true;
      classification: LlmClassificationOutput;
      usage: GeminiTokenUsage;
      modelUsed: SupportedGeminiModel;
      responseTimeMs: number;
    }
  | {
      ok: false;
      errorCode: ClassificationErrorCode;
      isRateLimit: boolean;
      errorMessage: string;
      modelUsed: SupportedGeminiModel;
      usage: GeminiTokenUsage;
      responseTimeMs: number;
    };

export interface GeminiWorkerOptions {
  apiKey?: string;
  minIntervalMs?: number;
  maxCallsPerRun?: number;
  invokeFn?: GeminiInvokeFn;
  sleepFn?: (ms: number) => Promise<void>;
  randomFn?: () => number;
}

export interface ClassifyArticleCallOptions {
  signal?: AbortSignal;
  deadlineAtMs?: number;
}

const RATE_LIMIT_BACKOFFS_MS: ReadonlyArray<{ baseMs: number; jitterMs: number }> = [
  { baseMs: 10_000, jitterMs: 3_000 },
  { baseMs: 25_000, jitterMs: 5_000 },
  { baseMs: 60_000, jitterMs: 8_000 },
];

const TRANSIENT_BACKOFFS_MS = [2_000] as const;

function abortableSleep(ms: number, signal?: AbortSignal): Promise<boolean> {
  if (signal?.aborted) return Promise.resolve(false);
  if (ms <= 0) return Promise.resolve(true);

  return new Promise((resolve) => {
    const onAbort = () => {
      clearTimeout(timer);
      resolve(false);
    };

    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve(true);
    }, ms);

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function getErrorStatusCode(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const candidate = err as { status?: unknown; statusCode?: unknown; code?: unknown };
  if (typeof candidate.status === 'number') return candidate.status;
  if (typeof candidate.statusCode === 'number') return candidate.statusCode;
  if (typeof candidate.code === 'number') return candidate.code;
  return undefined;
}

function extractErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function isAbortSignalError(err: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) return true;
  if (err instanceof Error && err.name === 'AbortError') return true;
  return false;
}

function isRateLimitError(err: unknown): boolean {
  const status = getErrorStatusCode(err);
  if (status === 429) return true;
  const msg = extractErrorMessage(err);
  return /\b429\b|RESOURCE_EXHAUSTED|rate[-_\s]?limit|quota/i.test(msg);
}

function isDailyQuotaExhaustedError(err: unknown): boolean {
  const msg = extractErrorMessage(err);
  return /per_day|PerDay|GenerateRequestsPerDay|daily.*(?:limit|quota)/i.test(msg);
}

function isTransientNetworkOr503Error(err: unknown): boolean {
  const status = getErrorStatusCode(err);
  if (status === 503 || status === 502 || status === 504 || status === 500 || status === 408) {
    return true;
  }
  const msg = extractErrorMessage(err);
  return /\b503\b|UNAVAILABLE|timeout|timed out|deadline exceeded|ECONNRESET|ETIMEDOUT|fetch failed|RequestTimeout/i.test(
    msg,
  );
}

function isSchemaOrJsonError(err: unknown): boolean {
  if (err instanceof SyntaxError) return true;
  if (!err || typeof err !== 'object') return false;
  const name = (err as { name?: string }).name;
  return name === 'ZodError' || name === 'EmptyOutputError';
}

class EmptyOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmptyOutputError';
  }
}

export class GeminiClassificationWorker {
  private readonly apiKey?: string;
  private readonly minIntervalMs: number;
  private readonly maxCallsPerRun: number;
  private readonly customSleepFn?: (ms: number) => Promise<void>;
  private readonly randomFn: () => number;
  private readonly customInvokeFn?: GeminiInvokeFn;
  private aiClient: GoogleGenAI | null = null;
  private readonly lastCallStartedAtByModel = new Map<SupportedGeminiModel, number>();
  private callsMade = 0;
  private primaryDisabledForSession = false;
  private consecutivePrimaryFailures = 0;

  constructor(options: GeminiWorkerOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
    this.minIntervalMs = options.minIntervalMs ?? 4_200;
    this.maxCallsPerRun =
      options.maxCallsPerRun ??
      (Number(process.env.SCRAPER_MAX_LLM_CALLS_PER_RUN) || 150);
    this.customSleepFn = options.sleepFn;
    this.randomFn = options.randomFn ?? Math.random;
    this.customInvokeFn = options.invokeFn;
  }

  get remainingBudget(): number {
    return Math.max(0, this.maxCallsPerRun - this.callsMade);
  }

  get totalCallsMade(): number {
    return this.callsMade;
  }

  get isPrimaryModelDisabled(): boolean {
    return this.primaryDisabledForSession;
  }

  private getClient(): GoogleGenAI {
    if (!this.apiKey || this.apiKey.includes('GANTI_DENGAN_GEMINI_API_KEY')) {
      throw new Error('GEMINI_API_KEY belum dikonfigurasi pada environment (.env).');
    }
    if (!this.aiClient) {
      this.aiClient = new GoogleGenAI({ apiKey: this.apiKey });
    }
    return this.aiClient;
  }

  private hasRemainingBudget(requiredBufferMs: number, callOptions?: ClassifyArticleCallOptions): boolean {
    if (callOptions?.signal?.aborted) return false;
    if (callOptions?.deadlineAtMs !== undefined) {
      return Date.now() + requiredBufferMs < callOptions.deadlineAtMs;
    }
    return true;
  }

  private async sleepWithBudget(
    ms: number,
    callOptions?: ClassifyArticleCallOptions,
    minRemainingAfterSleepMs: number = 1_500,
  ): Promise<boolean> {
    if (!this.hasRemainingBudget(minRemainingAfterSleepMs, callOptions)) {
      return false;
    }

    if (callOptions?.deadlineAtMs !== undefined && !this.customSleepFn) {
      const availableMs = callOptions.deadlineAtMs - Date.now() - minRemainingAfterSleepMs;
      if (ms > availableMs) {
        return false;
      }
    }

    if (this.customSleepFn) {
      if (callOptions?.deadlineAtMs !== undefined) {
        const availableMs = callOptions.deadlineAtMs - Date.now() - minRemainingAfterSleepMs;
        if (ms > availableMs) {
          return false;
        }
      }
      await this.customSleepFn(ms);
      return !callOptions?.signal?.aborted;
    }

    return abortableSleep(ms, callOptions?.signal);
  }

  private async waitForRatePacing(
    model: SupportedGeminiModel,
    callOptions?: ClassifyArticleCallOptions,
  ): Promise<boolean> {
    const prevStarted = this.lastCallStartedAtByModel.get(model) ?? 0;
    if (prevStarted === 0 || this.minIntervalMs <= 0) {
      this.lastCallStartedAtByModel.set(model, Date.now());
      return true;
    }

    const elapsed = Date.now() - prevStarted;
    const waitMs = this.minIntervalMs - elapsed;
    if (waitMs > 0) {
      const ok = await this.sleepWithBudget(waitMs, callOptions, 1_500);
      if (!ok) return false;
    }

    this.lastCallStartedAtByModel.set(model, Date.now());
    return true;
  }

  private async invokeSdk(request: GeminiInvokeRequest): Promise<GeminiInvokeResponse> {
    if (this.customInvokeFn) {
      return this.customInvokeFn(request);
    }

    const ai = this.getClient();
    const response = await ai.models.generateContent({
      model: request.model,
      contents: request.userInput,
      config: {
        systemInstruction: request.systemInstruction,
        responseMimeType: 'application/json',
        responseJsonSchema: LLM_CLASSIFICATION_JSON_SCHEMA as unknown as Record<string, unknown>,
        maxOutputTokens: 1024,
        temperature: 0.1,
        thinkingConfig: {
          thinkingLevel:
            request.model === PRIMARY_GEMINI_MODEL ? ThinkingLevel.LOW : ThinkingLevel.MINIMAL,
        },
        abortSignal: request.abortSignal,
        httpOptions: {
          timeout: GEMINI_REQUEST_TIMEOUT_MS,
          retryOptions: { attempts: 1 },
        },
      },
    });

    const outputText = response.text?.trim() ?? '';
    if (!outputText) {
      const finishReason = response.candidates?.[0]?.finishReason;
      throw new EmptyOutputError(
        `Gemini returned empty text output (model=${request.model}, finishReason=${String(finishReason ?? 'UNKNOWN')})`,
      );
    }

    const inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
    const outputTokens =
      (response.usageMetadata?.candidatesTokenCount ?? 0) +
      (response.usageMetadata?.thoughtsTokenCount ?? 0);
    const totalTokens = response.usageMetadata?.totalTokenCount ?? inputTokens + outputTokens;

    return {
      outputText,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens,
      },
    };
  }

  async classifyArticle(
    article: ArticleClassificationInput,
    callOptions?: ClassifyArticleCallOptions,
  ): Promise<ClassificationResult> {
    if (this.callsMade >= this.maxCallsPerRun) {
      return {
        ok: false,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        isRateLimit: false,
        errorMessage: `Batas pengaman panggilan LLM per sesi tercapai (${this.maxCallsPerRun}).`,
        modelUsed: this.primaryDisabledForSession ? FALLBACK_GEMINI_MODEL : PRIMARY_GEMINI_MODEL,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        responseTimeMs: 0,
      };
    }

    if (!this.hasRemainingBudget(20, callOptions)) {
      return {
        ok: false,
        errorCode: 'TIMEOUT_BUDGET_EXCEEDED',
        isRateLimit: false,
        errorMessage: 'Batas waktu eksekusi crawler tercapai sebelum klasifikasi LLM.',
        modelUsed: this.primaryDisabledForSession ? FALLBACK_GEMINI_MODEL : PRIMARY_GEMINI_MODEL,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        responseTimeMs: 0,
      };
    }

    if (!this.customInvokeFn && (!this.apiKey || this.apiKey.includes('GANTI_DENGAN_GEMINI_API_KEY'))) {
      return {
        ok: false,
        errorCode: 'CONFIG_ERROR',
        isRateLimit: false,
        errorMessage: 'GEMINI_API_KEY belum dikonfigurasi pada environment (.env).',
        modelUsed: PRIMARY_GEMINI_MODEL,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        responseTimeMs: 0,
      };
    }

    const basePrompt = buildClassificationPrompt(article);
    const startMs = Date.now();
    const totalUsage: GeminiTokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };

    type ModelAttemptResult =
      | { ok: true; classification: LlmClassificationOutput }
      | {
          ok: false;
          kind: 'RATE_LIMIT' | 'TRANSIENT' | 'INVALID_OUTPUT' | 'TIMEOUT' | 'API';
          dailyQuotaExhausted?: boolean;
          message: string;
        };

    const tryModelWithRetries = async (
      model: SupportedGeminiModel,
      allowRateLimitRetries: boolean,
    ): Promise<ModelAttemptResult> => {
      let rateAttempt = 0;
      let transientAttempt = 0;
      let schemaAttempt = 0;
      let activePrompt = basePrompt;

      while (true) {
        if (this.callsMade >= this.maxCallsPerRun) {
          return {
            ok: false,
            kind: 'RATE_LIMIT',
            message: `Batas pengaman panggilan LLM per sesi tercapai (${this.maxCallsPerRun}).`,
          };
        }

        const pacingOk = await this.waitForRatePacing(model, callOptions);
        if (!pacingOk) {
          return {
            ok: false,
            kind: 'TIMEOUT',
            message: 'Sisa anggaran waktu tidak mencukupi untuk melanjutkan panggilan Gemini.',
          };
        }

        this.callsMade += 1;

        try {
          const response = await this.invokeSdk({
            model,
            systemInstruction: SIPENA_SYSTEM_INSTRUCTION,
            userInput: activePrompt,
            abortSignal: callOptions?.signal,
          });

          totalUsage.inputTokens += response.usage.inputTokens;
          totalUsage.outputTokens += response.usage.outputTokens;
          totalUsage.totalTokens += response.usage.totalTokens;

          const validated = parseAndValidateLlmJson(response.outputText);
          return { ok: true, classification: validated };
        } catch (err) {
          if (isAbortSignalError(err, callOptions?.signal)) {
            return {
              ok: false,
              kind: 'TIMEOUT',
              message: 'Panggilan Gemini dibatalkan karena batas waktu total eksekusi tercapai.',
            };
          }

          const message = extractErrorMessage(err);

          if (isRateLimitError(err)) {
            const dailyQuotaExhausted = isDailyQuotaExhaustedError(err);
            if (dailyQuotaExhausted) {
              return { ok: false, kind: 'RATE_LIMIT', dailyQuotaExhausted: true, message };
            }

            if (allowRateLimitRetries && rateAttempt < RATE_LIMIT_BACKOFFS_MS.length) {
              const backoff = RATE_LIMIT_BACKOFFS_MS[rateAttempt];
              rateAttempt += 1;
              if (backoff) {
                const delayMs = backoff.baseMs + Math.floor(this.randomFn() * backoff.jitterMs);
                const slept = await this.sleepWithBudget(delayMs, callOptions, 2_000);
                if (!slept) {
                  if (callOptions?.signal?.aborted) {
                    return {
                      ok: false,
                      kind: 'TIMEOUT',
                      message: 'Eksekusi dihentikan oleh batas waktu pipeline saat menunggu backoff rate-limit.',
                    };
                  }
                  return { ok: false, kind: 'RATE_LIMIT', dailyQuotaExhausted: false, message };
                }
                continue;
              }
            }
            return { ok: false, kind: 'RATE_LIMIT', dailyQuotaExhausted: false, message };
          }

          if (isTransientNetworkOr503Error(err)) {
            if (transientAttempt < TRANSIENT_BACKOFFS_MS.length) {
              const delayMs = TRANSIENT_BACKOFFS_MS[transientAttempt] ?? 2_000;
              transientAttempt += 1;
              const slept = await this.sleepWithBudget(delayMs, callOptions, 2_000);
              if (!slept) {
                if (callOptions?.signal?.aborted) {
                  return {
                    ok: false,
                    kind: 'TIMEOUT',
                    message: 'Eksekusi dihentikan oleh batas waktu pipeline saat menunggu retry.',
                  };
                }
                return { ok: false, kind: 'TRANSIENT', message };
              }
              continue;
            }
            return { ok: false, kind: 'TRANSIENT', message };
          }

          if (isSchemaOrJsonError(err)) {
            if (schemaAttempt < 1 && this.hasRemainingBudget(1_500, callOptions)) {
              schemaAttempt += 1;
              activePrompt = `${basePrompt}\n\nCATATAN PERBAIKAN: Respons wajib JSON valid sesuai skema. Jika is_economic_phenomenon = false, seluruh field KBLI dan Pengeluaran wajib null; jika true, seluruh 4 field tersebut wajib terisi dan summary minimal 20 karakter.`;
              continue;
            }
            return { ok: false, kind: 'INVALID_OUTPUT', message };
          }

          return { ok: false, kind: 'API', message };
        }
      }
    };

    if (!this.primaryDisabledForSession) {
      const primaryAttempt = await tryModelWithRetries(PRIMARY_GEMINI_MODEL, true);
      if (primaryAttempt.ok) {
        this.consecutivePrimaryFailures = 0;
        return {
          ok: true,
          classification: primaryAttempt.classification,
          usage: totalUsage,
          modelUsed: PRIMARY_GEMINI_MODEL,
          responseTimeMs: Date.now() - startMs,
        };
      }

      if (primaryAttempt.kind === 'TIMEOUT') {
        return {
          ok: false,
          errorCode: 'TIMEOUT_BUDGET_EXCEEDED',
          isRateLimit: false,
          errorMessage: primaryAttempt.message,
          modelUsed: PRIMARY_GEMINI_MODEL,
          usage: totalUsage,
          responseTimeMs: Date.now() - startMs,
        };
      }

      if (primaryAttempt.kind !== 'RATE_LIMIT' && primaryAttempt.kind !== 'TRANSIENT') {
        return {
          ok: false,
          errorCode: primaryAttempt.kind === 'INVALID_OUTPUT' ? 'INVALID_OUTPUT' : 'API_ERROR',
          isRateLimit: false,
          errorMessage: primaryAttempt.message,
          modelUsed: PRIMARY_GEMINI_MODEL,
          usage: totalUsage,
          responseTimeMs: Date.now() - startMs,
        };
      }

      // Trip primary switch cepat apabila kuota harian habis atau 2x berturut-turut gagal 429/503/timeout
      if (primaryAttempt.dailyQuotaExhausted) {
        this.primaryDisabledForSession = true;
      } else {
        this.consecutivePrimaryFailures += 1;
        if (this.consecutivePrimaryFailures >= 2) {
          this.primaryDisabledForSession = true;
        }
      }
    }

    // Fallback ke gemini-3.5-flash-lite (langsung digunakan pula untuk sisa antrean setelah switch aktif)
    const fallbackAttempt = await tryModelWithRetries(FALLBACK_GEMINI_MODEL, false);
    if (fallbackAttempt.ok) {
      return {
        ok: true,
        classification: fallbackAttempt.classification,
        usage: totalUsage,
        modelUsed: FALLBACK_GEMINI_MODEL,
        responseTimeMs: Date.now() - startMs,
      };
    }

    return {
      ok: false,
      errorCode:
        fallbackAttempt.kind === 'TIMEOUT'
          ? 'TIMEOUT_BUDGET_EXCEEDED'
          : fallbackAttempt.kind === 'RATE_LIMIT'
            ? 'RATE_LIMIT_EXCEEDED'
            : fallbackAttempt.kind === 'INVALID_OUTPUT'
              ? 'INVALID_OUTPUT'
              : fallbackAttempt.kind === 'API'
                ? 'API_ERROR'
                : 'SERVICE_UNAVAILABLE',
      isRateLimit: fallbackAttempt.kind === 'RATE_LIMIT',
      errorMessage: fallbackAttempt.message,
      modelUsed: FALLBACK_GEMINI_MODEL,
      usage: totalUsage,
      responseTimeMs: Date.now() - startMs,
    };
  }
}

export async function classifyArticleWithGemini(
  article: ArticleClassificationInput,
  options?: GeminiWorkerOptions,
  callOptions?: ClassifyArticleCallOptions,
): Promise<ClassificationResult> {
  const worker = new GeminiClassificationWorker(options);
  return worker.classifyArticle(article, callOptions);
}
