// server/services/llm/gemini-client.ts
import { GoogleGenAI } from '@google/genai';
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
}

export interface GeminiInvokeResponse {
  outputText: string;
  usage: GeminiTokenUsage;
}

export type GeminiInvokeFn = (request: GeminiInvokeRequest) => Promise<GeminiInvokeResponse>;

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
      errorCode: 'RATE_LIMIT_EXCEEDED' | 'SERVICE_UNAVAILABLE' | 'INVALID_OUTPUT' | 'CONFIG_ERROR' | 'API_ERROR';
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

const RATE_LIMIT_BACKOFFS_MS: ReadonlyArray<{ baseMs: number; jitterMs: number }> = [
  { baseMs: 10_000, jitterMs: 3_000 },
  { baseMs: 25_000, jitterMs: 5_000 },
  { baseMs: 60_000, jitterMs: 8_000 },
];

const TRANSIENT_BACKOFFS_MS = [5_000, 15_000] as const;

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
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

function isRateLimitError(err: unknown): boolean {
  const status = getErrorStatusCode(err);
  if (status === 429) return true;
  const msg = extractErrorMessage(err);
  return /\b429\b|RESOURCE_EXHAUSTED|rate[-_\s]?limit|quota/i.test(msg);
}

function isTransientNetworkOr503Error(err: unknown): boolean {
  const status = getErrorStatusCode(err);
  if (status === 503 || status === 502 || status === 504 || status === 500) return true;
  const msg = extractErrorMessage(err);
  return /\b503\b|UNAVAILABLE|timeout|timed out|ECONNRESET|ETIMEDOUT|fetch failed|RequestTimeout/i.test(
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
  private readonly sleepFn: (ms: number) => Promise<void>;
  private readonly randomFn: () => number;
  private readonly customInvokeFn?: GeminiInvokeFn;
  private aiClient: GoogleGenAI | null = null;
  private lastCallStartedAt = 0;
  private callsMade = 0;

  constructor(options: GeminiWorkerOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.GEMINI_API_KEY;
    this.minIntervalMs = options.minIntervalMs ?? 4_500;
    this.maxCallsPerRun =
      options.maxCallsPerRun ??
      (Number(process.env.SCRAPER_MAX_LLM_CALLS_PER_RUN) || 150);
    this.sleepFn = options.sleepFn ?? defaultSleep;
    this.randomFn = options.randomFn ?? Math.random;
    this.customInvokeFn = options.invokeFn;
  }

  get remainingBudget(): number {
    return Math.max(0, this.maxCallsPerRun - this.callsMade);
  }

  get totalCallsMade(): number {
    return this.callsMade;
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

  private async waitForRatePacing(): Promise<void> {
    if (this.lastCallStartedAt === 0 || this.minIntervalMs <= 0) {
      this.lastCallStartedAt = Date.now();
      return;
    }

    const elapsed = Date.now() - this.lastCallStartedAt;
    const waitMs = this.minIntervalMs - elapsed;
    if (waitMs > 0) {
      await this.sleepFn(waitMs);
    }
    this.lastCallStartedAt = Date.now();
  }

  private async invokeSdk(request: GeminiInvokeRequest): Promise<GeminiInvokeResponse> {
    if (this.customInvokeFn) {
      return this.customInvokeFn(request);
    }

    const ai = this.getClient();
    const interaction = await ai.interactions.create(
      {
        model: request.model,
        system_instruction: request.systemInstruction,
        input: request.userInput,
        response_format: {
          type: 'text',
          mime_type: 'application/json',
          schema: LLM_CLASSIFICATION_JSON_SCHEMA as unknown as Record<string, unknown>,
        },
        generation_config: {
          max_output_tokens: 1536,
          ...(request.model === PRIMARY_GEMINI_MODEL ? { thinking_level: 'low' as const } : {}),
        },
        store: false,
      },
      {
        retries: { strategy: 'none' },
        timeout_ms: 35_000,
      },
    );

    if (interaction.status === 'failed' || !interaction.output_text) {
      const apiErrMsg = interaction.errors?.[0]?.message;
      throw new EmptyOutputError(
        apiErrMsg
          ? `Gemini interaction status=${interaction.status}: ${apiErrMsg}`
          : `Gemini returned empty output_text (status=${interaction.status})`,
      );
    }

    const inputTokens = interaction.usage?.total_input_tokens ?? 0;
    const outputTokens = interaction.usage?.total_output_tokens ?? 0;
    const totalTokens = interaction.usage?.total_tokens ?? inputTokens + outputTokens;

    return {
      outputText: interaction.output_text,
      usage: {
        inputTokens,
        outputTokens,
        totalTokens,
      },
    };
  }

  async classifyArticle(article: ArticleClassificationInput): Promise<ClassificationResult> {
    if (this.callsMade >= this.maxCallsPerRun) {
      return {
        ok: false,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        isRateLimit: false,
        errorMessage: `Batas pengaman panggilan LLM per sesi tercapai (${this.maxCallsPerRun}).`,
        modelUsed: PRIMARY_GEMINI_MODEL,
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

    const tryModelWithRetries = async (
      model: SupportedGeminiModel,
      allowRateLimitRetries: boolean,
    ): Promise<
      | { ok: true; classification: LlmClassificationOutput }
      | { ok: false; kind: 'RATE_LIMIT' | 'TRANSIENT' | 'INVALID_OUTPUT' | 'API'; message: string }
    > => {
      let rateAttempt = 0;
      let transientAttempt = 0;
      let schemaAttempt = 0;
      let activePrompt = basePrompt;

      while (true) {
        await this.waitForRatePacing();
        this.callsMade += 1;

        try {
          const response = await this.invokeSdk({
            model,
            systemInstruction: SIPENA_SYSTEM_INSTRUCTION,
            userInput: activePrompt,
          });

          totalUsage.inputTokens += response.usage.inputTokens;
          totalUsage.outputTokens += response.usage.outputTokens;
          totalUsage.totalTokens += response.usage.totalTokens;

          const validated = parseAndValidateLlmJson(response.outputText);
          return { ok: true, classification: validated };
        } catch (err) {
          const message = extractErrorMessage(err);

          if (isRateLimitError(err)) {
            if (allowRateLimitRetries && rateAttempt < RATE_LIMIT_BACKOFFS_MS.length) {
              const backoff = RATE_LIMIT_BACKOFFS_MS[rateAttempt];
              rateAttempt += 1;
              if (backoff) {
                const delayMs = backoff.baseMs + Math.floor(this.randomFn() * backoff.jitterMs);
                await this.sleepFn(delayMs);
                continue;
              }
            }
            return { ok: false, kind: 'RATE_LIMIT', message };
          }

          if (isTransientNetworkOr503Error(err)) {
            if (transientAttempt < TRANSIENT_BACKOFFS_MS.length) {
              const delayMs = TRANSIENT_BACKOFFS_MS[transientAttempt] ?? 5_000;
              transientAttempt += 1;
              await this.sleepFn(delayMs);
              continue;
            }
            return { ok: false, kind: 'TRANSIENT', message };
          }

          if (isSchemaOrJsonError(err)) {
            if (schemaAttempt < 1) {
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

    const primaryAttempt = await tryModelWithRetries(PRIMARY_GEMINI_MODEL, true);
    if (primaryAttempt.ok) {
      return {
        ok: true,
        classification: primaryAttempt.classification,
        usage: totalUsage,
        modelUsed: PRIMARY_GEMINI_MODEL,
        responseTimeMs: Date.now() - startMs,
      };
    }

    // Fallback 1x ke gemini-3.5-flash-lite jika model utama gagal karena 429 atau 503
    if (primaryAttempt.kind === 'RATE_LIMIT' || primaryAttempt.kind === 'TRANSIENT') {
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
          fallbackAttempt.kind === 'RATE_LIMIT'
            ? 'RATE_LIMIT_EXCEEDED'
            : fallbackAttempt.kind === 'INVALID_OUTPUT'
              ? 'INVALID_OUTPUT'
              : 'SERVICE_UNAVAILABLE',
        isRateLimit: fallbackAttempt.kind === 'RATE_LIMIT',
        errorMessage: fallbackAttempt.message,
        modelUsed: FALLBACK_GEMINI_MODEL,
        usage: totalUsage,
        responseTimeMs: Date.now() - startMs,
      };
    }

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
}

export async function classifyArticleWithGemini(
  article: ArticleClassificationInput,
  options?: GeminiWorkerOptions,
): Promise<ClassificationResult> {
  const worker = new GeminiClassificationWorker(options);
  return worker.classifyArticle(article);
}

