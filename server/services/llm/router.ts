// server/services/llm/router.ts
import { createHash } from 'node:crypto';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import type { ScraperProviderStatEntry } from '../../db/schema';
import {
  buildOpenAiJsonSchemaResponseFormat,
  LLM_CLASSIFICATION_JSON_SCHEMA,
  type LlmClassificationOutput,
} from '../../../shared/schemas/llm-output.schema';
import {
  buildClassificationPrompt,
  parseAndValidateLlmJson,
  SIPENA_SYSTEM_INSTRUCTION_COMPACT,
  SIPENA_SYSTEM_INSTRUCTION_FULL,
  type ArticleClassificationInput,
} from './classifier';
import {
  DEFAULT_GEMINI_MAX_OUTPUT_TOKENS,
  FALLBACK_GEMINI_MODEL,
  GEMINI_REQUEST_TIMEOUT_MS,
  PRIMARY_GEMINI_MODEL,
  type ClassificationErrorCode,
  type GeminiTokenUsage,
} from './gemini-client';
import {
  invokeOpenAiCompatChat,
  OpenAiCompatError,
  sanitizeSecretFromText,
} from './openai-compat';

export type LlmProviderName =
  | 'gemini'
  | 'groq'
  | 'cerebras'
  | 'mistral'
  | 'nvidia'
  | 'openrouter';

export const DEFAULT_GROQ_PRIMARY_MODEL = 'llama-3.3-70b-versatile' as const;
export const DEFAULT_GROQ_FALLBACK_MODEL = 'llama-3.1-8b-instant' as const;
export const DEFAULT_CEREBRAS_MODEL = 'llama-3.3-70b' as const;
export const DEFAULT_MISTRAL_MODEL = 'mistral-small-latest' as const;
export const DEFAULT_NVIDIA_MODEL = 'meta/llama-3.3-70b-instruct' as const;
export const DEFAULT_GEMINI_EMBEDDING_MODEL = 'gemini-embedding-2' as const;

export const OPENROUTER_DEFAULT_FREE_MODELS = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'meta-llama/llama-3.3-70b-instruct:free',
  'qwen/qwen3-coder:free',
  'openrouter/free',
] as const;

export const DEFAULT_LLM_MAX_OUTPUT_TOKENS = DEFAULT_GEMINI_MAX_OUTPUT_TOKENS;
export const DEFAULT_SYNTHESIS_TIMEOUT_MS = 22_000;

export type RouterThinkingLevel = 'MINIMAL' | 'LOW' | 'MEDIUM';

export interface RouterEnvConfig {
  geminiApiKey?: string;
  geminiApiKeys?: string;
  groqApiKey?: string;
  groqApiKeys?: string;
  cerebrasApiKey?: string;
  cerebrasApiKeys?: string;
  mistralApiKey?: string;
  mistralApiKeys?: string;
  nvidiaApiKey?: string;
  nvidiaApiKeys?: string;
  openrouterApiKey?: string;
  openrouterApiKeys?: string;
  openrouterFreeModel?: string;
  llmClassifyChain?: string;
  llmSynthesisChain?: string;
}

export interface RouterSlotInvokeRequest {
  slotId: string;
  provider: LlmProviderName;
  model: string;
  apiKey: string;
  systemInstruction: string;
  userInput: string;
  jsonMode: boolean;
  temperature: number;
  maxOutputTokens: number;
  timeoutMs: number;
  thinkingLevel?: RouterThinkingLevel;
  abortSignal?: AbortSignal;
}

export interface RouterSlotInvokeResponse {
  outputText: string;
  usage: GeminiTokenUsage;
}

export type RouterInvokeSlotFn = (
  req: RouterSlotInvokeRequest,
) => Promise<RouterSlotInvokeResponse>;

export interface MultiLlmRouterOptions {
  env?: RouterEnvConfig;
  task?: 'classify' | 'synthesis';
  maxCallsPerRun?: number;
  geminiMinIntervalMs?: number;
  groqMinIntervalMs?: number;
  cerebrasMinIntervalMs?: number;
  mistralMinIntervalMs?: number;
  nvidiaMinIntervalMs?: number;
  openrouterMinIntervalMs?: number;
  transientRetryDelayMs?: number;
  rateLimitCooldownMs?: number;
  transientCooldownMs?: number;
  nowFn?: () => number;
  sleepFn?: (ms: number) => Promise<void>;
  invokeSlotFn?: RouterInvokeSlotFn;
}

export interface RouterCallOptions {
  signal?: AbortSignal;
  deadlineAtMs?: number;
}

export type RouterClassificationResult =
  | {
      ok: true;
      classification: LlmClassificationOutput;
      usage: GeminiTokenUsage;
      modelUsed: string;
      providerUsed: LlmProviderName;
      responseTimeMs: number;
    }
  | {
      ok: false;
      errorCode: ClassificationErrorCode;
      isRateLimit: boolean;
      errorMessage: string;
      modelUsed: string | null;
      providerUsed: LlmProviderName | null;
      usage: GeminiTokenUsage;
      responseTimeMs: number;
    };

export type RouterSynthesisResult =
  | {
      ok: true;
      narrativeMarkdown: string;
      modelUsed: string;
      providerUsed: LlmProviderName;
      usage: GeminiTokenUsage;
      notice: string | null;
      responseTimeMs: number;
    }
  | {
      ok: false;
      narrativeMarkdown: null;
      modelUsed: null;
      providerUsed: null;
      usage: GeminiTokenUsage;
      notice: string;
      responseTimeMs: number;
    };

export interface LlmProviderSlotStatus {
  slotId: string;
  provider: LlmProviderName;
  model: string;
  configured: boolean;
  keyCount: number;
  priority: number;
  tpmLimit: number;
  rpmLimit: number;
  dailyQuotaNote: string;
}

interface InternalSlotState {
  runtimeKey: string;
  slotId: string;
  provider: LlmProviderName;
  model: string;
  apiKey: string;
  keyIndex: number;
  rpmLimit: number;
  tpmLimit: number;
  minIntervalMs: number;
  disabledForSession: boolean;
  cooldownUntilMs: number;
  lastCallAtMs: number;
  recentCallTimestamps: number[];
  recentTokenUsages: Array<{ atMs: number; tokens: number }>;
}

const PLACEHOLDER_RE = /^(?:ganti_dengan_|your_|placeholder|changeme|example|<)/i;

export function parseCsvValues(raw: string | undefined | null): string[] {
  if (!raw) return [];
  return raw
    .split(/[,\r\n]+/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0 && !PLACEHOLDER_RE.test(item));
}

interface PersistedSlotQuotaState {
  disabledUntilMs: number;
  cooldownUntilMs: number;
}

const persistentSlotQuotaStore = new Map<string, PersistedSlotQuotaState>();

function buildSlotPersistenceKey(provider: LlmProviderName, model: string, apiKey: string): string {
  const keyHash = createHash('sha256').update(apiKey).digest('hex').slice(0, 16);
  return `${provider}:${model}:${keyHash}`;
}

function getNextUtcMidnightMs(nowMs: number): number {
  const d = new Date(nowMs);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + 1, 0, 1, 0);
}

function mirrorSlotQuotaToNitroStorage(persistenceKey: string, state: PersistedSlotQuotaState): void {
  try {
    const useStorageFn = (
      globalThis as {
        useStorage?: (name: string) => { setItem?: (k: string, v: unknown) => Promise<void> };
      }
    ).useStorage;
    if (typeof useStorageFn === 'function') {
      const cacheStorage = useStorageFn('cache');
      void cacheStorage?.setItem?.(`llm-quota:${persistenceKey}`, state)?.catch(() => undefined);
    }
  } catch {
    // Abaikan di luar runtime Nitro (mis. Vitest)
  }
}

export function resetRouterCooldownStore(): void {
  persistentSlotQuotaStore.clear();
}

export function resolveConfiguredProviderKeys(env: RouterEnvConfig = {}): {
  gemini: string[];
  groq: string[];
  cerebras: string[];
  mistral: string[];
  nvidia: string[];
  openrouter: string[];
  openrouterFreeModels: string[];
  classifyChainRaw: string;
  synthesisChainRaw: string;
} {
  const dedupe = (items: string[]) => Array.from(new Set(items));

  const geminiSingle = parseCsvValues(env.geminiApiKey ?? process.env.GEMINI_API_KEY);
  const geminiMulti = parseCsvValues(env.geminiApiKeys ?? process.env.GEMINI_API_KEYS);

  const groqSingle = parseCsvValues(env.groqApiKey ?? process.env.GROQ_API_KEY);
  const groqMulti = parseCsvValues(env.groqApiKeys ?? process.env.GROQ_API_KEYS);

  const cerebrasSingle = parseCsvValues(env.cerebrasApiKey ?? process.env.CEREBRAS_API_KEY);
  const cerebrasMulti = parseCsvValues(env.cerebrasApiKeys ?? process.env.CEREBRAS_API_KEYS);

  const mistralSingle = parseCsvValues(env.mistralApiKey ?? process.env.MISTRAL_API_KEY);
  const mistralMulti = parseCsvValues(env.mistralApiKeys ?? process.env.MISTRAL_API_KEYS);

  const nvidiaSingle = parseCsvValues(env.nvidiaApiKey ?? process.env.NVIDIA_API_KEY);
  const nvidiaMulti = parseCsvValues(env.nvidiaApiKeys ?? process.env.NVIDIA_API_KEYS);

  const openrouterSingle = parseCsvValues(env.openrouterApiKey ?? process.env.OPENROUTER_API_KEY);
  const openrouterMulti = parseCsvValues(env.openrouterApiKeys ?? process.env.OPENROUTER_API_KEYS);

  const customOpenrouterModels = dedupe(
    parseCsvValues(env.openrouterFreeModel ?? process.env.OPENROUTER_FREE_MODEL),
  );

  return {
    gemini: dedupe([...geminiSingle, ...geminiMulti]),
    groq: dedupe([...groqSingle, ...groqMulti]),
    cerebras: dedupe([...cerebrasSingle, ...cerebrasMulti]),
    mistral: dedupe([...mistralSingle, ...mistralMulti]),
    nvidia: dedupe([...nvidiaSingle, ...nvidiaMulti]),
    openrouter: dedupe([...openrouterSingle, ...openrouterMulti]),
    openrouterFreeModels:
      customOpenrouterModels.length > 0
        ? customOpenrouterModels
        : [...OPENROUTER_DEFAULT_FREE_MODELS],
    classifyChainRaw: (env.llmClassifyChain ?? process.env.LLM_CLASSIFY_CHAIN ?? '').trim(),
    synthesisChainRaw: (env.llmSynthesisChain ?? process.env.LLM_SYNTHESIS_CHAIN ?? '').trim(),
  };
}

function getSlotRateLimits(provider: LlmProviderName, model: string): {
  rpmLimit: number;
  tpmLimit: number;
  dailyQuotaNote: string;
} {
  if (provider === 'gemini') {
    if (model.includes('lite')) {
      return {
        rpmLimit: 10,
        tpmLimit: 250_000,
        dailyQuotaNote: 'Free tier AI Studio (tinggi RPM/TPM, kuota RPD terbatas per proyek)',
      };
    }
    return {
      rpmLimit: 5,
      tpmLimit: 250_000,
      dailyQuotaNote: '~20 RPD free tier per API key Google AI Studio',
    };
  }
  if (provider === 'groq') {
    if (model.includes('8b')) {
      return {
        rpmLimit: 28,
        tpmLimit: 5_600,
        dailyQuotaNote: '14.400 RPD / 500.000 TPD / 6.000 TPM gratis tanpa kartu kredit',
      };
    }
    return {
      rpmLimit: 28,
      tpmLimit: 11_000,
      dailyQuotaNote: '1.000 RPD / 100.000 TPD / 12.000 TPM gratis tanpa kartu kredit',
    };
  }
  if (provider === 'cerebras') {
    return {
      rpmLimit: 28,
      tpmLimit: 60_000,
      dailyQuotaNote: '14.400 RPD / 1.000.000 TPD inferensi cepat gratis',
    };
  }
  if (provider === 'mistral') {
    return {
      rpmLimit: 25,
      tpmLimit: 450_000,
      dailyQuotaNote: '500.000 TPM Experiment free tier multilingual',
    };
  }
  if (provider === 'nvidia') {
    return {
      rpmLimit: 38,
      tpmLimit: 120_000,
      dailyQuotaNote: '40 RPM free tier developer credits NVIDIA NIM',
    };
  }
  return {
    rpmLimit: 18,
    tpmLimit: 60_000,
    dailyQuotaNote: '50 RPD akun gratis (1.000 RPD bila riwayat kredit >= $10)',
  };
}

function parseSlotToken(rawToken: string): Array<{ provider: LlmProviderName; model: string }> {
  const token = rawToken.trim();
  if (!token) return [];
  const lower = token.toLowerCase();

  if (lower === 'openrouter' || lower === 'openrouter:auto') {
    return OPENROUTER_DEFAULT_FREE_MODELS.map((m) => ({ provider: 'openrouter', model: m }));
  }

  const colonIdx = token.indexOf(':');
  if (colonIdx <= 0) return [];
  const providerRaw = token.slice(0, colonIdx).trim().toLowerCase();
  const model = token.slice(colonIdx + 1).trim();
  if (!model) return [];

  if (
    providerRaw === 'gemini' ||
    providerRaw === 'groq' ||
    providerRaw === 'cerebras' ||
    providerRaw === 'mistral' ||
    providerRaw === 'nvidia' ||
    providerRaw === 'openrouter'
  ) {
    return [{ provider: providerRaw, model }];
  }
  return [];
}

function buildDefaultChainSpecs(
  resolved: ReturnType<typeof resolveConfiguredProviderKeys>,
  includeAllOptionalProviders: boolean = false,
): Array<{ provider: LlmProviderName; model: string }> {
  const specs: Array<{ provider: LlmProviderName; model: string }> = [
    { provider: 'gemini', model: PRIMARY_GEMINI_MODEL },
  ];

  if (includeAllOptionalProviders || resolved.cerebras.length > 0) {
    specs.push({ provider: 'cerebras', model: DEFAULT_CEREBRAS_MODEL });
  }

  specs.push(
    { provider: 'groq', model: DEFAULT_GROQ_PRIMARY_MODEL },
    { provider: 'gemini', model: FALLBACK_GEMINI_MODEL },
  );

  if (includeAllOptionalProviders || resolved.mistral.length > 0) {
    specs.push({ provider: 'mistral', model: DEFAULT_MISTRAL_MODEL });
  }

  specs.push({ provider: 'groq', model: DEFAULT_GROQ_FALLBACK_MODEL });

  if (includeAllOptionalProviders || resolved.nvidia.length > 0) {
    specs.push({ provider: 'nvidia', model: DEFAULT_NVIDIA_MODEL });
  }

  for (const model of resolved.openrouterFreeModels) {
    specs.push({ provider: 'openrouter', model });
  }

  return specs;
}

export function getConfiguredProviderHealthSummary(
  env: RouterEnvConfig = {},
  options?: { includeAllOptionalProviders?: boolean },
): LlmProviderSlotStatus[] {
  const resolved = resolveConfiguredProviderKeys(env);
  const specs = resolved.classifyChainRaw
    ? parseCsvValues(resolved.classifyChainRaw).flatMap((t) => parseSlotToken(t))
    : buildDefaultChainSpecs(resolved, Boolean(options?.includeAllOptionalProviders));

  const uniqueSpecs: Array<{ provider: LlmProviderName; model: string }> = [];
  const seen = new Set<string>();
  for (const spec of specs) {
    const id = `${spec.provider}:${spec.model}`;
    if (!seen.has(id)) {
      seen.add(id);
      uniqueSpecs.push(spec);
    }
  }

  return uniqueSpecs.map((spec, idx) => {
    const keyCount =
      spec.provider === 'gemini'
        ? resolved.gemini.length
        : spec.provider === 'groq'
          ? resolved.groq.length
          : spec.provider === 'cerebras'
            ? resolved.cerebras.length
            : spec.provider === 'mistral'
              ? resolved.mistral.length
              : spec.provider === 'nvidia'
                ? resolved.nvidia.length
                : resolved.openrouter.length;
    const limits = getSlotRateLimits(spec.provider, spec.model);

    return {
      slotId: `${spec.provider}:${spec.model}`,
      provider: spec.provider,
      model: spec.model,
      configured: keyCount > 0,
      keyCount,
      priority: idx + 1,
      tpmLimit: limits.tpmLimit,
      rpmLimit: limits.rpmLimit,
      dailyQuotaNote: limits.dailyQuotaNote,
    };
  });
}

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

function estimateTokensFromTexts(systemText: string, userText: string): number {
  return Math.max(120, Math.ceil((systemText.length + userText.length) / 3.4) + 260);
}

function getHttpStatusCode(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const candidate = err as { status?: unknown; statusCode?: unknown; code?: unknown };
  if (typeof candidate.status === 'number') return candidate.status;
  if (typeof candidate.statusCode === 'number') return candidate.statusCode;
  if (typeof candidate.code === 'number') return candidate.code;
  return undefined;
}

function extractErrorMsg(err: unknown, secretToRedact?: string): string {
  const raw = err instanceof Error ? err.message : String(err);
  return sanitizeSecretFromText(raw, secretToRedact);
}

function isAbortErr(err: unknown, signal?: AbortSignal): boolean {
  if (signal?.aborted) return true;
  return err instanceof Error && err.name === 'AbortError';
}

function classifyProviderFailure(
  err: unknown,
  secretToRedact?: string,
): {
  kind: 'RATE_LIMIT' | 'TRANSIENT' | 'AUTH' | 'INVALID_OUTPUT' | 'API';
  isDailyQuota: boolean;
  retryAfterMs?: number;
  message: string;
} {
  const message = extractErrorMsg(err, secretToRedact);

  if (err instanceof OpenAiCompatError) {
    if (err.isAuthError) {
      return { kind: 'AUTH', isDailyQuota: false, message };
    }
    if (err.isRateLimit) {
      return {
        kind: 'RATE_LIMIT',
        isDailyQuota: err.isDailyQuota,
        retryAfterMs: err.retryAfterMs,
        message,
      };
    }
    if (err.isTransient) {
      return { kind: 'TRANSIENT', isDailyQuota: false, message };
    }
    return { kind: 'API', isDailyQuota: false, message };
  }

  if (
    err instanceof SyntaxError ||
    (err &&
      typeof err === 'object' &&
      ((err as { name?: string }).name === 'ZodError' ||
        (err as { name?: string }).name === 'EmptyOutputError'))
  ) {
    return { kind: 'INVALID_OUTPUT', isDailyQuota: false, message };
  }

  const status = getHttpStatusCode(err);
  if (status === 401 || status === 403 || /\b(API_KEY_INVALID|invalid api key)\b/i.test(message)) {
    return { kind: 'AUTH', isDailyQuota: false, message };
  }

  if (
    status === 429 ||
    /\b429\b|RESOURCE_EXHAUSTED|rate[-_\s]?limit|quota/i.test(message)
  ) {
    const isDailyQuota =
      /per[\s_-]?day|PerDay|GenerateRequestsPerDay|tokens per day|requests per day|TPD|RPD|daily.*(?:limit|quota)|free-models-per-day/i.test(
        message,
      );
    return { kind: 'RATE_LIMIT', isDailyQuota, message };
  }

  if (
    status === 503 ||
    status === 502 ||
    status === 504 ||
    status === 500 ||
    status === 408 ||
    /\b503\b|UNAVAILABLE|timeout|timed out|deadline exceeded|ECONNRESET|ETIMEDOUT|fetch failed/i.test(
      message,
    )
  ) {
    return { kind: 'TRANSIENT', isDailyQuota: false, message };
  }

  return { kind: 'API', isDailyQuota: false, message };
}

class EmptyOutputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EmptyOutputError';
  }
}

export class MultiLlmRouter {
  private readonly slots: InternalSlotState[] = [];
  private readonly maxCallsPerRun: number;
  private readonly transientRetryDelayMs: number;
  private readonly rateLimitCooldownMs: number;
  private readonly transientCooldownMs: number;
  private readonly nowFn: () => number;
  private readonly customSleepFn?: (ms: number) => Promise<void>;
  private readonly customInvokeSlotFn?: RouterInvokeSlotFn;
  private readonly geminiClients = new Map<string, GoogleGenAI>();
  private readonly statsBySlotId = new Map<string, ScraperProviderStatEntry>();
  private callsMade = 0;

  constructor(options: MultiLlmRouterOptions = {}) {
    this.nowFn = options.nowFn ?? (() => Date.now());
    this.customSleepFn = options.sleepFn;
    this.customInvokeSlotFn = options.invokeSlotFn;
    this.maxCallsPerRun =
      options.maxCallsPerRun ??
      (Number(process.env.SCRAPER_MAX_LLM_CALLS_PER_RUN) || 150);
    this.transientRetryDelayMs = options.transientRetryDelayMs ?? 1_500;
    this.rateLimitCooldownMs = options.rateLimitCooldownMs ?? 20_000;
    this.transientCooldownMs = options.transientCooldownMs ?? 60_000;

    const resolved = resolveConfiguredProviderKeys(options.env);
    const task = options.task ?? 'classify';
    const rawChain =
      task === 'synthesis' ? resolved.synthesisChainRaw : resolved.classifyChainRaw;

    const specs = rawChain
      ? parseCsvValues(rawChain).flatMap((token) => {
          if (token.toLowerCase() === 'openrouter' || token.toLowerCase() === 'openrouter:auto') {
            return resolved.openrouterFreeModels.map((m) => ({
              provider: 'openrouter' as const,
              model: m,
            }));
          }
          return parseSlotToken(token);
        })
      : buildDefaultChainSpecs(resolved, false);

    const seenRuntimeKeys = new Set<string>();
    const initNowMs = this.nowFn();
    for (const spec of specs) {
      const keys =
        spec.provider === 'gemini'
          ? resolved.gemini
          : spec.provider === 'groq'
            ? resolved.groq
            : spec.provider === 'cerebras'
              ? resolved.cerebras
              : spec.provider === 'mistral'
                ? resolved.mistral
                : spec.provider === 'nvidia'
                  ? resolved.nvidia
                  : resolved.openrouter;

      if (keys.length === 0) continue;

      keys.forEach((apiKey, keyIndex) => {
        const slotId = `${spec.provider}:${spec.model}`;
        const runtimeKey = `${slotId}#k${keyIndex}`;
        if (seenRuntimeKeys.has(runtimeKey)) return;
        seenRuntimeKeys.add(runtimeKey);

        const limits = getSlotRateLimits(spec.provider, spec.model);
        const minIntervalMs =
          spec.provider === 'gemini'
            ? options.geminiMinIntervalMs ?? (spec.model.includes('lite') ? 2_500 : 4_200)
            : spec.provider === 'groq'
              ? options.groqMinIntervalMs ?? 900
              : spec.provider === 'cerebras'
                ? options.cerebrasMinIntervalMs ?? 800
                : spec.provider === 'mistral'
                  ? options.mistralMinIntervalMs ?? 1_000
                  : spec.provider === 'nvidia'
                    ? options.nvidiaMinIntervalMs ?? 1_600
                    : options.openrouterMinIntervalMs ?? 1_500;

        const persistenceKey = buildSlotPersistenceKey(spec.provider, spec.model, apiKey);
        const persisted = persistentSlotQuotaStore.get(persistenceKey);
        const disabledFromStore = Boolean(persisted && persisted.disabledUntilMs > initNowMs);
        const cooldownFromStore =
          persisted && persisted.cooldownUntilMs > initNowMs ? persisted.cooldownUntilMs : 0;

        this.slots.push({
          runtimeKey,
          slotId,
          provider: spec.provider,
          model: spec.model,
          apiKey,
          keyIndex,
          rpmLimit: limits.rpmLimit,
          tpmLimit: limits.tpmLimit,
          minIntervalMs,
          disabledForSession: disabledFromStore,
          cooldownUntilMs: cooldownFromStore,
          lastCallAtMs: 0,
          recentCallTimestamps: [],
          recentTokenUsages: [],
        });

        if (!this.statsBySlotId.has(slotId)) {
          this.statsBySlotId.set(slotId, {
            slotId,
            provider: spec.provider,
            model: spec.model,
            calls: 0,
            successes: 0,
            rateLimits: 0,
            failures: 0,
            inputTokens: 0,
            outputTokens: 0,
            totalTokens: 0,
            totalLatencyMs: 0,
          });
        }
      });
    }
  }

  get configuredSlotCount(): number {
    return this.slots.length;
  }

  get configuredProviderCount(): number {
    return new Set(this.slots.filter((s) => !s.disabledForSession).map((s) => s.provider)).size;
  }

  get totalCallsMade(): number {
    return this.callsMade;
  }

  private persistSlotQuotaState(slot: InternalSlotState, disabled: boolean): void {
    const persistenceKey = buildSlotPersistenceKey(slot.provider, slot.model, slot.apiKey);
    const nowMs = this.nowFn();
    const state: PersistedSlotQuotaState = {
      disabledUntilMs: disabled ? getNextUtcMidnightMs(nowMs) : 0,
      cooldownUntilMs: slot.cooldownUntilMs,
    };
    persistentSlotQuotaStore.set(persistenceKey, state);
    mirrorSlotQuotaToNitroStorage(persistenceKey, state);
  }

  getProviderStats(): Record<string, ScraperProviderStatEntry> {
    const out: Record<string, ScraperProviderStatEntry> = {};
    for (const [key, entry] of this.statsBySlotId.entries()) {
      out[key] = { ...entry };
    }
    return out;
  }

  private pruneWindow(slot: InternalSlotState, nowMs: number) {
    const windowCutoff = nowMs - 60_000;
    while (slot.recentCallTimestamps.length > 0 && slot.recentCallTimestamps[0]! <= windowCutoff) {
      slot.recentCallTimestamps.shift();
    }
    while (slot.recentTokenUsages.length > 0 && slot.recentTokenUsages[0]!.atMs <= windowCutoff) {
      slot.recentTokenUsages.shift();
    }
  }

  private getSlotAvailabilityWait(
    slot: InternalSlotState,
    estimatedTokens: number,
  ): { totalWaitMs: number; isBlockedByCooldownOrBucket: boolean } {
    const nowMs = this.nowFn();
    this.pruneWindow(slot, nowMs);

    const cooldownWaitMs = Math.max(0, slot.cooldownUntilMs - nowMs);
    const intervalWaitMs =
      slot.lastCallAtMs > 0 && slot.minIntervalMs > 0
        ? Math.max(0, slot.lastCallAtMs + slot.minIntervalMs - nowMs)
        : 0;

    let rpmWaitMs = 0;
    if (slot.recentCallTimestamps.length >= slot.rpmLimit) {
      const oldestCall = slot.recentCallTimestamps[0]!;
      rpmWaitMs = Math.max(0, oldestCall + 60_000 - nowMs);
    }

    let tpmWaitMs = 0;
    const usedTokens = slot.recentTokenUsages.reduce((acc, item) => acc + item.tokens, 0);
    if (usedTokens > 0 && usedTokens + estimatedTokens > slot.tpmLimit) {
      let reclaimed = 0;
      for (const item of slot.recentTokenUsages) {
        reclaimed += item.tokens;
        if (usedTokens - reclaimed + estimatedTokens <= slot.tpmLimit) {
          tpmWaitMs = Math.max(0, item.atMs + 60_000 - nowMs);
          break;
        }
      }
      if (tpmWaitMs === 0 && slot.recentTokenUsages.length > 0) {
        tpmWaitMs = Math.max(0, slot.recentTokenUsages[0]!.atMs + 60_000 - nowMs);
      }
    }

    const totalWaitMs = Math.max(cooldownWaitMs, intervalWaitMs, rpmWaitMs, tpmWaitMs);
    const isBlockedByCooldownOrBucket = cooldownWaitMs > 0 || rpmWaitMs > 0 || tpmWaitMs > 0;
    return { totalWaitMs, isBlockedByCooldownOrBucket };
  }

  private hasRemainingBudget(requiredBufferMs: number, callOptions?: RouterCallOptions): boolean {
    if (callOptions?.signal?.aborted) return false;
    if (callOptions?.deadlineAtMs !== undefined) {
      return this.nowFn() + requiredBufferMs < callOptions.deadlineAtMs;
    }
    return true;
  }

  private async sleepWithBudget(
    ms: number,
    callOptions?: RouterCallOptions,
    minBufferMs: number = 1_500,
  ): Promise<boolean> {
    if (ms <= 0) return !callOptions?.signal?.aborted;
    if (!this.hasRemainingBudget(minBufferMs, callOptions)) return false;

    if (callOptions?.deadlineAtMs !== undefined) {
      const availableMs = callOptions.deadlineAtMs - this.nowFn() - minBufferMs;
      if (ms > availableMs) return false;
    }

    if (this.customSleepFn) {
      await this.customSleepFn(ms);
      return !callOptions?.signal?.aborted;
    }

    return abortableSleep(ms, callOptions?.signal);
  }

  private getGeminiClient(apiKey: string): GoogleGenAI {
    let client = this.geminiClients.get(apiKey);
    if (!client) {
      client = new GoogleGenAI({ apiKey });
      this.geminiClients.set(apiKey, client);
    }
    return client;
  }

  private async invokeProviderSlot(req: RouterSlotInvokeRequest): Promise<RouterSlotInvokeResponse> {
    if (this.customInvokeSlotFn) {
      return this.customInvokeSlotFn(req);
    }

    if (req.provider === 'gemini') {
      const ai = this.getGeminiClient(req.apiKey);
      const isFlashLite = req.model.includes('lite');
      const resolvedThinkingLevel =
        req.thinkingLevel === 'MEDIUM'
          ? ThinkingLevel.MEDIUM
          : req.thinkingLevel === 'MINIMAL'
            ? ThinkingLevel.MINIMAL
            : isFlashLite
              ? ThinkingLevel.MINIMAL
              : ThinkingLevel.LOW;
      const response = await ai.models.generateContent({
        model: req.model,
        contents: req.userInput,
        config: {
          systemInstruction: req.systemInstruction,
          ...(req.jsonMode
            ? {
                responseMimeType: 'application/json',
                responseJsonSchema: LLM_CLASSIFICATION_JSON_SCHEMA as unknown as Record<
                  string,
                  unknown
                >,
              }
            : {}),
          maxOutputTokens: req.maxOutputTokens,
          temperature: req.temperature,
          thinkingConfig: {
            thinkingLevel: resolvedThinkingLevel,
          },
          abortSignal: req.abortSignal,
          httpOptions: {
            timeout: req.timeoutMs,
            retryOptions: { attempts: 1 },
          },
        },
      });

      const outputText = response.text?.trim() ?? '';
      if (!outputText) {
        const finishReason = response.candidates?.[0]?.finishReason;
        throw new EmptyOutputError(
          `Gemini returned empty text output (model=${req.model}, finishReason=${String(finishReason ?? 'UNKNOWN')})`,
        );
      }

      const inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
      const outputTokens =
        (response.usageMetadata?.candidatesTokenCount ?? 0) +
        (response.usageMetadata?.thoughtsTokenCount ?? 0);
      const totalTokens = response.usageMetadata?.totalTokenCount ?? inputTokens + outputTokens;

      return {
        outputText,
        usage: { inputTokens, outputTokens, totalTokens },
      };
    }

    const res = await invokeOpenAiCompatChat({
      provider: req.provider,
      apiKey: req.apiKey,
      model: req.model,
      systemInstruction: req.systemInstruction,
      userInput: req.userInput,
      jsonMode: req.jsonMode,
      jsonSchema: req.jsonMode ? buildOpenAiJsonSchemaResponseFormat().json_schema : undefined,
      temperature: req.temperature,
      maxTokens: req.maxOutputTokens,
      timeoutMs: req.timeoutMs,
      abortSignal: req.abortSignal,
    });

    return {
      outputText: res.outputText,
      usage: res.usage,
    };
  }

  private pickNextSlot(
    triedRuntimeKeys: Set<string>,
    estimatedTokens: number,
  ): { slot: InternalSlotState; waitMs: number; skipOthersWereBlocked: boolean } | null {
    const eligible = this.slots.filter(
      (s) => !s.disabledForSession && !triedRuntimeKeys.has(s.runtimeKey),
    );
    if (eligible.length === 0) return null;

    // 1. Prioritaskan slot pertama dalam urutan prioritas yang tidak terblokir cooldown/TPM/RPM.
    //    Jika ada slot berikutnya yang benar-benar siap 0ms saat slot di atas sedang cooldown/kena TPM bucket,
    //    langsung lompat 0ms ke slot tersebut.
    const immediateReady = eligible.find((s) => {
      const avail = this.getSlotAvailabilityWait(s, estimatedTokens);
      return avail.totalWaitMs === 0;
    });
    if (immediateReady) {
      return { slot: immediateReady, waitMs: 0, skipOthersWereBlocked: false };
    }

    const notHardBlocked = eligible.find((s) => {
      const avail = this.getSlotAvailabilityWait(s, estimatedTokens);
      return !avail.isBlockedByCooldownOrBucket;
    });
    if (notHardBlocked) {
      const avail = this.getSlotAvailabilityWait(notHardBlocked, estimatedTokens);
      return {
        slot: notHardBlocked,
        waitMs: avail.totalWaitMs,
        skipOthersWereBlocked: false,
      };
    }

    // 2. Semua slot sedang cooldown/bucket limit -> pilih slot dengan waktu tunggu terpendek
    let best: { slot: InternalSlotState; waitMs: number } | null = null;
    for (const s of eligible) {
      const avail = this.getSlotAvailabilityWait(s, estimatedTokens);
      if (!best || avail.totalWaitMs < best.waitMs) {
        best = { slot: s, waitMs: avail.totalWaitMs };
      }
    }

    return best ? { ...best, skipOthersWereBlocked: true } : null;
  }

  private recordAttemptStart(slot: InternalSlotState, startedAtMs: number) {
    slot.lastCallAtMs = startedAtMs;
    slot.recentCallTimestamps.push(startedAtMs);
    const stat = this.statsBySlotId.get(slot.slotId);
    if (stat) {
      stat.calls += 1;
    }
  }

  private recordSuccess(slot: InternalSlotState, usage: GeminiTokenUsage, latencyMs: number) {
    slot.recentTokenUsages.push({
      atMs: this.nowFn(),
      tokens: Math.max(1, usage.totalTokens),
    });
    const stat = this.statsBySlotId.get(slot.slotId);
    if (stat) {
      stat.successes += 1;
      stat.inputTokens += usage.inputTokens;
      stat.outputTokens += usage.outputTokens;
      stat.totalTokens += usage.totalTokens;
      stat.totalLatencyMs += Math.max(0, latencyMs);
    }
  }

  private recordFailure(
    slot: InternalSlotState,
    kind: 'RATE_LIMIT' | 'TRANSIENT' | 'AUTH' | 'INVALID_OUTPUT' | 'API',
    latencyMs: number,
  ) {
    const stat = this.statsBySlotId.get(slot.slotId);
    if (stat) {
      stat.failures += 1;
      if (kind === 'RATE_LIMIT') {
        stat.rateLimits += 1;
      }
      stat.totalLatencyMs += Math.max(0, latencyMs);
    }
  }

  async classifyArticle(
    article: ArticleClassificationInput,
    callOptions?: RouterCallOptions,
  ): Promise<RouterClassificationResult> {
    if (this.slots.length === 0) {
      return {
        ok: false,
        errorCode: 'CONFIG_ERROR',
        isRateLimit: false,
        errorMessage:
          'Belum ada API key penyedia LLM (GEMINI_API_KEY / GROQ_API_KEY / OPENROUTER_API_KEY) yang terkonfigurasi.',
        modelUsed: null,
        providerUsed: null,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        responseTimeMs: 0,
      };
    }

    if (this.callsMade >= this.maxCallsPerRun) {
      return {
        ok: false,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        isRateLimit: false,
        errorMessage: `Batas pengaman panggilan LLM per sesi tercapai (${this.maxCallsPerRun}).`,
        modelUsed: null,
        providerUsed: null,
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
        modelUsed: null,
        providerUsed: null,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        responseTimeMs: 0,
      };
    }

    const basePrompt = buildClassificationPrompt(article);
    const totalUsage: GeminiTokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    const startMs = this.nowFn();
    const triedRuntimeKeys = new Set<string>();

    let lastErrorCode: ClassificationErrorCode = 'SERVICE_UNAVAILABLE';
    let lastErrorMessage = 'Semua penyedia LLM gagal merespons.';
    let lastIsRateLimit = false;
    let lastSlotId: string | null = null;
    let lastProvider: LlmProviderName | null = null;

    while (this.callsMade < this.maxCallsPerRun) {
      const previewInstruction = SIPENA_SYSTEM_INSTRUCTION_COMPACT;
      const estimatedTokens = estimateTokensFromTexts(previewInstruction, basePrompt);
      const picked = this.pickNextSlot(triedRuntimeKeys, estimatedTokens);
      if (!picked) break;

      const { slot, waitMs } = picked;
      const systemInstruction =
        slot.provider === 'gemini'
          ? SIPENA_SYSTEM_INSTRUCTION_FULL
          : SIPENA_SYSTEM_INSTRUCTION_COMPACT;

      if (waitMs > 0) {
        const slept = await this.sleepWithBudget(waitMs, callOptions, 1_500);
        if (!slept) {
          return {
            ok: false,
            errorCode: callOptions?.signal?.aborted ? 'TIMEOUT_BUDGET_EXCEEDED' : 'RATE_LIMIT_EXCEEDED',
            isRateLimit: !callOptions?.signal?.aborted,
            errorMessage: callOptions?.signal?.aborted
              ? 'Eksekusi dibatalkan karena batas waktu pipeline tercapai.'
              : `Seluruh slot LLM sedang cooldown / penuh kuota (${Math.round(waitMs / 1000)}s melampaui sisa waktu).`,
            modelUsed: slot.slotId,
            providerUsed: slot.provider,
            usage: totalUsage,
            responseTimeMs: Math.max(0, this.nowFn() - startMs),
          };
        }
      }

      triedRuntimeKeys.add(slot.runtimeKey);
      lastSlotId = slot.slotId;
      lastProvider = slot.provider;

      let transientAttempts = 0;
      let schemaAttempts = 0;
      let activePrompt = basePrompt;

      slotLoop: while (this.callsMade < this.maxCallsPerRun) {
        this.callsMade += 1;
        const callStartedAt = this.nowFn();
        this.recordAttemptStart(slot, callStartedAt);

        try {
          const response = await this.invokeProviderSlot({
            slotId: slot.slotId,
            provider: slot.provider,
            model: slot.model,
            apiKey: slot.apiKey,
            systemInstruction,
            userInput: activePrompt,
            jsonMode: true,
            temperature: 0.1,
            maxOutputTokens: DEFAULT_LLM_MAX_OUTPUT_TOKENS,
            timeoutMs: GEMINI_REQUEST_TIMEOUT_MS,
            thinkingLevel:
              slot.provider === 'gemini'
                ? slot.model.includes('lite')
                  ? 'MINIMAL'
                  : 'LOW'
                : undefined,
            abortSignal: callOptions?.signal,
          });

          const callLatencyMs = Math.max(0, this.nowFn() - callStartedAt);
          totalUsage.inputTokens += response.usage.inputTokens;
          totalUsage.outputTokens += response.usage.outputTokens;
          totalUsage.totalTokens += response.usage.totalTokens;

          const validated = parseAndValidateLlmJson(response.outputText);
          this.recordSuccess(slot, response.usage, callLatencyMs);

          return {
            ok: true,
            classification: validated,
            usage: totalUsage,
            modelUsed: slot.slotId,
            providerUsed: slot.provider,
            responseTimeMs: Math.max(0, this.nowFn() - startMs),
          };
        } catch (err) {
          const callLatencyMs = Math.max(0, this.nowFn() - callStartedAt);

          if (isAbortErr(err, callOptions?.signal)) {
            return {
              ok: false,
              errorCode: 'TIMEOUT_BUDGET_EXCEEDED',
              isRateLimit: false,
              errorMessage: 'Panggilan LLM dibatalkan karena batas waktu pipeline tercapai.',
              modelUsed: slot.slotId,
              providerUsed: slot.provider,
              usage: totalUsage,
              responseTimeMs: Math.max(0, this.nowFn() - startMs),
            };
          }

          const failure = classifyProviderFailure(err, slot.apiKey);
          this.recordFailure(slot, failure.kind, callLatencyMs);
          lastErrorMessage = failure.message;

          if (failure.kind === 'AUTH') {
            slot.disabledForSession = true;
            this.persistSlotQuotaState(slot, true);
            lastErrorCode = 'CONFIG_ERROR';
            lastIsRateLimit = false;
            break slotLoop;
          }

          if (failure.kind === 'RATE_LIMIT') {
            lastErrorCode = 'RATE_LIMIT_EXCEEDED';
            lastIsRateLimit = true;
            if (failure.isDailyQuota) {
              slot.disabledForSession = true;
              this.persistSlotQuotaState(slot, true);
            } else {
              const cooldown = Math.max(failure.retryAfterMs ?? this.rateLimitCooldownMs, 5_000);
              slot.cooldownUntilMs = this.nowFn() + cooldown;
              this.persistSlotQuotaState(slot, false);
            }
            // Failover 0ms ke slot berikutnya!
            break slotLoop;
          }

          if (failure.kind === 'TRANSIENT') {
            lastErrorCode = 'SERVICE_UNAVAILABLE';
            lastIsRateLimit = false;
            if (transientAttempts < 1 && this.hasRemainingBudget(2_000, callOptions)) {
              transientAttempts += 1;
              const slept = await this.sleepWithBudget(
                this.transientRetryDelayMs,
                callOptions,
                1_500,
              );
              if (slept) {
                continue slotLoop;
              }
            }
            slot.cooldownUntilMs = this.nowFn() + this.transientCooldownMs;
            break slotLoop;
          }

          if (failure.kind === 'INVALID_OUTPUT') {
            lastErrorCode = 'INVALID_OUTPUT';
            lastIsRateLimit = false;
            if (schemaAttempts < 1 && this.hasRemainingBudget(1_500, callOptions)) {
              schemaAttempts += 1;
              activePrompt = `${basePrompt}\n\nCATATAN PERBAIKAN: Respons wajib JSON valid sesuai skema (sertakan geographic_scope). Jika is_economic_phenomenon = false atau geographic_scope = OTHER_REGION_IRRELEVANT, seluruh field KBLI dan Pengeluaran wajib null; jika true, seluruh 4 field tersebut wajib terisi dan summary minimal 20 karakter.`;
              continue slotLoop;
            }
            // Lanjutkan ke slot cadangan berikutnya apabila satu model konsisten mengeluarkan JSON rusak
            break slotLoop;
          }

          lastErrorCode = 'API_ERROR';
          lastIsRateLimit = false;
          slot.cooldownUntilMs = this.nowFn() + this.transientCooldownMs;
          break slotLoop;
        }
      }
    }

    return {
      ok: false,
      errorCode: lastErrorCode,
      isRateLimit: lastIsRateLimit,
      errorMessage: lastErrorMessage,
      modelUsed: lastSlotId,
      providerUsed: lastProvider,
      usage: totalUsage,
      responseTimeMs: Math.max(0, this.nowFn() - startMs),
    };
  }

  async generateSynthesis(
    params: { systemInstruction: string; userPrompt: string; maxCitationIndex?: number },
    callOptions?: RouterCallOptions,
    onChunk?: (delta: string) => void,
  ): Promise<RouterSynthesisResult> {
    if (this.slots.length === 0) {
      return {
        ok: false,
        narrativeMarkdown: null,
        modelUsed: null,
        providerUsed: null,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        notice:
          'Belum ada API key penyedia LLM yang terkonfigurasi. Draf disusun otomatis dari template BRS deterministik yang terikat pada artikel terpilih.',
        responseTimeMs: 0,
      };
    }

    const startMs = this.nowFn();
    const totalUsage: GeminiTokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
    const triedRuntimeKeys = new Set<string>();
    const estimatedTokens = estimateTokensFromTexts(params.systemInstruction, params.userPrompt);
    const failedMessages: string[] = [];

    while (true) {
      const picked = this.pickNextSlot(triedRuntimeKeys, estimatedTokens);
      if (!picked) break;

      const { slot, waitMs } = picked;
      if (waitMs > 0) {
        const slept = await this.sleepWithBudget(waitMs, callOptions, 1_500);
        if (!slept) break;
      }

      triedRuntimeKeys.add(slot.runtimeKey);
      const callStartedAt = this.nowFn();
      this.recordAttemptStart(slot, callStartedAt);

      try {
        const thinkingLevel: RouterThinkingLevel | undefined =
          slot.provider === 'gemini'
            ? slot.model.includes('lite')
              ? 'LOW'
              : 'MEDIUM'
            : undefined;

        let res: RouterSlotInvokeResponse;
        if (onChunk && !this.customInvokeSlotFn && slot.provider === 'gemini') {
          const ai = this.getGeminiClient(slot.apiKey);
          const stream = await ai.models.generateContentStream({
            model: slot.model,
            contents: params.userPrompt,
            config: {
              systemInstruction: params.systemInstruction,
              maxOutputTokens: DEFAULT_LLM_MAX_OUTPUT_TOKENS,
              temperature: 0.25,
              thinkingConfig: {
                thinkingLevel:
                  thinkingLevel === 'MEDIUM' ? ThinkingLevel.MEDIUM : ThinkingLevel.LOW,
              },
              abortSignal: callOptions?.signal,
              httpOptions: {
                timeout: DEFAULT_SYNTHESIS_TIMEOUT_MS,
                retryOptions: { attempts: 1 },
              },
            },
          });

          let streamedText = '';
          let lastUsage: GeminiTokenUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0 };
          for await (const chunk of stream) {
            const delta = chunk.text ?? '';
            if (delta) {
              streamedText += delta;
              onChunk(delta);
            }
            if (chunk.usageMetadata) {
              const inp = chunk.usageMetadata.promptTokenCount ?? 0;
              const outp =
                (chunk.usageMetadata.candidatesTokenCount ?? 0) +
                (chunk.usageMetadata.thoughtsTokenCount ?? 0);
              const tot = chunk.usageMetadata.totalTokenCount ?? inp + outp;
              lastUsage = { inputTokens: inp, outputTokens: outp, totalTokens: tot };
            }
          }
          res = { outputText: streamedText.trim(), usage: lastUsage };
        } else {
          res = await this.invokeProviderSlot({
            slotId: slot.slotId,
            provider: slot.provider,
            model: slot.model,
            apiKey: slot.apiKey,
            systemInstruction: params.systemInstruction,
            userInput: params.userPrompt,
            jsonMode: false,
            temperature: 0.25,
            maxOutputTokens: DEFAULT_LLM_MAX_OUTPUT_TOKENS,
            timeoutMs: DEFAULT_SYNTHESIS_TIMEOUT_MS,
            thinkingLevel,
            abortSignal: callOptions?.signal,
          });
          if (onChunk && res.outputText) {
            onChunk(res.outputText);
          }
        }

        const latencyMs = Math.max(0, this.nowFn() - callStartedAt);
        totalUsage.inputTokens += res.usage.inputTokens;
        totalUsage.outputTokens += res.usage.outputTokens;
        totalUsage.totalTokens += res.usage.totalTokens;

        let cleanMarkdown = res.outputText
          .replace(/<think>[\s\S]*?<\/think>/gi, '')
          .trim();

        if (cleanMarkdown.length < 40) {
          throw new EmptyOutputError(
            `${slot.slotId} mengembalikan narasi terlalu pendek (${cleanMarkdown.length} karakter).`,
          );
        }

        let citationNotice: string | null = null;
        if (typeof params.maxCitationIndex === 'number' && params.maxCitationIndex >= 1) {
          const sanitized = sanitizeSynthesisCitations(cleanMarkdown, params.maxCitationIndex);
          cleanMarkdown = sanitized.sanitizedMarkdown;
          if (sanitized.strippedCitations.length > 0) {
            citationNotice = `Sebanyak ${sanitized.strippedCitations.length} nomor sitasi di luar rentang [1..${params.maxCitationIndex}] dibersihkan otomatis untuk mencegah halusinasi referensi.`;
          }
        }

        this.recordSuccess(slot, res.usage, latencyMs);
        return {
          ok: true,
          narrativeMarkdown: cleanMarkdown,
          modelUsed: slot.slotId,
          providerUsed: slot.provider,
          usage: totalUsage,
          notice: citationNotice,
          responseTimeMs: Math.max(0, this.nowFn() - startMs),
        };
      } catch (err) {
        const latencyMs = Math.max(0, this.nowFn() - callStartedAt);
        const failure = classifyProviderFailure(err, slot.apiKey);
        this.recordFailure(slot, failure.kind, latencyMs);
        failedMessages.push(`${slot.slotId}: ${failure.message.slice(0, 80)}`);

        if (failure.kind === 'AUTH' || (failure.kind === 'RATE_LIMIT' && failure.isDailyQuota)) {
          slot.disabledForSession = true;
          this.persistSlotQuotaState(slot, true);
        } else {
          slot.cooldownUntilMs = this.nowFn() + (failure.retryAfterMs ?? this.rateLimitCooldownMs);
          this.persistSlotQuotaState(slot, false);
        }
      }
    }

    const noticeSuffix =
      failedMessages.length > 0
        ? ` (${failedMessages.slice(0, 2).join('; ')})`
        : '';

    return {
      ok: false,
      narrativeMarkdown: null,
      modelUsed: null,
      providerUsed: null,
      usage: totalUsage,
      notice: `Seluruh penyedia LLM sementara tidak tersedia${noticeSuffix}. Draf disusun otomatis dari template analitis BPS berakar data terverifikasi.`,
      responseTimeMs: Math.max(0, this.nowFn() - startMs),
    };
  }
}

export function sanitizeSynthesisCitations(
  markdown: string,
  maxCitationIndex: number,
): { sanitizedMarkdown: string; strippedCitations: number[] } {
  const strippedCitations: number[] = [];
  const citationRe = /\[(\d+(?:\s*[-–,]\s*\d+)*)\](?!\()/g;

  const replaced = markdown.replace(citationRe, (fullMatch, innerRaw: string) => {
    const trimmed = innerRaw.trim();
    const rangeMatch = /^(\d+)\s*[-–]\s*(\d+)$/.exec(trimmed);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (start < 1 || start > maxCitationIndex || end < start) {
        strippedCitations.push(start);
        return '';
      }
      if (end > maxCitationIndex) {
        strippedCitations.push(end);
        return start === maxCitationIndex ? `[${start}]` : `[${start}-${maxCitationIndex}]`;
      }
      return fullMatch;
    }

    const parts = trimmed
      .split(',')
      .map((s) => Number(s.trim()))
      .filter((n) => Number.isFinite(n));

    const valid: number[] = [];
    for (const num of parts) {
      if (num >= 1 && num <= maxCitationIndex) {
        valid.push(num);
      } else {
        strippedCitations.push(num);
      }
    }

    if (valid.length === parts.length) {
      return fullMatch;
    }
    if (valid.length === 0) {
      return '';
    }
    return `[${valid.join(', ')}]`;
  });

  const sanitizedMarkdown = replaced
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/ ([.,;:!?])/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return {
    sanitizedMarkdown,
    strippedCitations,
  };
}

export async function embedTextsWithGemini(
  texts: ReadonlyArray<string>,
  options: {
    apiKey?: string;
    env?: RouterEnvConfig;
    model?: string;
    outputDimensionality?: number;
    abortSignal?: AbortSignal;
  } = {},
): Promise<Array<number[] | null>> {
  if (texts.length === 0) return [];

  const keys =
    options.apiKey !== undefined
      ? parseCsvValues(options.apiKey)
      : resolveConfiguredProviderKeys(options.env).gemini;

  if (keys.length === 0) {
    return texts.map(() => null);
  }

  const ai = new GoogleGenAI({ apiKey: keys[0]! });
  const model = options.model ?? DEFAULT_GEMINI_EMBEDDING_MODEL;
  const outputDimensionality = options.outputDimensionality ?? 768;
  const results: Array<number[] | null> = [];

  for (const rawText of texts) {
    const cleaned = rawText.replace(/\s+/g, ' ').trim();
    if (!cleaned || options.abortSignal?.aborted) {
      results.push(null);
      continue;
    }
    try {
      const response = await ai.models.embedContent({
        model,
        contents: `task: sentence similarity | query: ${cleaned}`,
        config: {
          outputDimensionality,
          abortSignal: options.abortSignal,
        },
      });
      const vec = response.embeddings?.[0]?.values;
      if (!vec || vec.length === 0) {
        results.push(null);
        continue;
      }
      const norm = Math.hypot(...vec) || 1;
      results.push(vec.map((x) => x / norm));
    } catch {
      results.push(null);
    }
  }

  return results;
}

export async function generateSynthesisWithRouter(
  params: { systemInstruction: string; userPrompt: string; maxCitationIndex?: number },
  options?: MultiLlmRouterOptions,
  callOptions?: RouterCallOptions,
  onChunk?: (delta: string) => void,
): Promise<RouterSynthesisResult> {
  const router = new MultiLlmRouter({
    ...options,
    task: 'synthesis',
  });
  return router.generateSynthesis(params, callOptions, onChunk);
}
