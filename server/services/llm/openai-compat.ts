// server/services/llm/openai-compat.ts

export type OpenAiCompatProvider = 'groq' | 'openrouter';

export const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const OPENROUTER_CHAT_COMPLETIONS_URL = 'https://openrouter.ai/api/v1/chat/completions';

export const DEFAULT_OPENAI_COMPAT_TIMEOUT_MS = 15_000;

export interface OpenAiCompatTokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface OpenAiCompatCallRequest {
  provider: OpenAiCompatProvider;
  apiKey: string;
  model: string;
  systemInstruction: string;
  userInput: string;
  jsonMode?: boolean;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  abortSignal?: AbortSignal;
  baseUrl?: string;
}

export interface OpenAiCompatCallResponse {
  outputText: string;
  usage: OpenAiCompatTokenUsage;
  modelResponded?: string;
}

export class OpenAiCompatError extends Error {
  readonly status?: number;
  readonly provider: OpenAiCompatProvider;
  readonly code: string;
  readonly retryAfterMs?: number;
  readonly isRateLimit: boolean;
  readonly isDailyQuota: boolean;
  readonly isTransient: boolean;
  readonly isAuthError: boolean;

  constructor(params: {
    provider: OpenAiCompatProvider;
    message: string;
    status?: number;
    code?: string;
    retryAfterMs?: number;
    isDailyQuota?: boolean;
  }) {
    super(params.message);
    this.name = 'OpenAiCompatError';
    this.provider = params.provider;
    this.status = params.status;
    this.code = params.code ?? 'OPENAI_COMPAT_ERROR';
    this.retryAfterMs = params.retryAfterMs;
    this.isDailyQuota = Boolean(params.isDailyQuota);
    this.isRateLimit = params.status === 429 || /\b429\b|rate[-_\s]?limit|quota/i.test(params.message);
    this.isAuthError = params.status === 401 || params.status === 403;
    this.isTransient =
      params.status === 500 ||
      params.status === 502 ||
      params.status === 503 ||
      params.status === 504 ||
      params.status === 408 ||
      /timeout|timed out|ECONNRESET|ETIMEDOUT|fetch failed/i.test(params.message);
  }
}

export function sanitizeSecretFromText(rawMessage: string, secret?: string): string {
  let clean = rawMessage;
  if (secret && secret.length >= 6) {
    clean = clean.split(secret).join('[REDACTED_KEY]');
  }
  return clean.replace(/(?:gsk|sk-or-v1|AIza)[A-Za-z0-9_-]{8,}/g, '[REDACTED_KEY]');
}

function parseDurationHeaderToMs(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return undefined;

  if (/^\d+(\.\d+)?$/.test(trimmed)) {
    const seconds = Number(trimmed);
    return Number.isFinite(seconds) && seconds > 0 ? Math.ceil(seconds * 1000) : undefined;
  }

  let totalMs = 0;
  let matched = false;
  const partRe = /(\d+(?:\.\d+)?)\s*(ms|s|m|h)/g;
  let m: RegExpExecArray | null;
  while ((m = partRe.exec(trimmed)) !== null) {
    matched = true;
    const val = Number(m[1]);
    const unit = m[2];
    if (!Number.isFinite(val)) continue;
    if (unit === 'ms') totalMs += val;
    else if (unit === 's') totalMs += val * 1_000;
    else if (unit === 'm') totalMs += val * 60_000;
    else if (unit === 'h') totalMs += val * 3_600_000;
  }
  if (matched && totalMs > 0) {
    return Math.ceil(totalMs);
  }

  const parsedDate = Date.parse(trimmed);
  if (!Number.isNaN(parsedDate)) {
    const diff = parsedDate - Date.now();
    return diff > 0 ? diff : undefined;
  }

  return undefined;
}

function detectDailyQuotaExhaustion(message: string): boolean {
  return /per[\s_-]?day|tokens per day|requests per day|TPD|RPD|daily.*(?:limit|quota)|free-models-per-day|credits? exhausted/i.test(
    message,
  );
}

function extractChatMessageText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const record = payload as {
    choices?: Array<{
      message?: {
        content?: unknown;
      };
    }>;
  };
  const content = record.choices?.[0]?.message?.content;
  if (typeof content === 'string') {
    return content.trim();
  }
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') return part;
        if (part && typeof part === 'object' && 'text' in part && typeof part.text === 'string') {
          return part.text;
        }
        return '';
      })
      .join('')
      .trim();
  }
  return '';
}

function extractErrorDetailFromJson(rawBody: string): string {
  const trimmed = rawBody.trim();
  if (!trimmed) return 'Empty HTTP error body';
  try {
    const parsed = JSON.parse(trimmed) as { error?: { message?: string; code?: string } | string; message?: string };
    if (typeof parsed.error === 'string') return parsed.error;
    if (parsed.error && typeof parsed.error === 'object' && typeof parsed.error.message === 'string') {
      return parsed.error.message;
    }
    if (typeof parsed.message === 'string') return parsed.message;
  } catch {
    // Gunakan cuplikan teks mentah bila bukan JSON
  }
  return trimmed.slice(0, 320);
}

function isUnsupportedResponseFormatError(status: number, errorDetail: string): boolean {
  if (status !== 400 && status !== 422) return false;
  return /response_format|json_object|json mode|structured output|unsupported/i.test(errorDetail);
}

export async function invokeOpenAiCompatChat(
  req: OpenAiCompatCallRequest,
): Promise<OpenAiCompatCallResponse> {
  const baseUrl =
    req.baseUrl ??
    (req.provider === 'groq' ? GROQ_CHAT_COMPLETIONS_URL : OPENROUTER_CHAT_COMPLETIONS_URL);
  const timeoutMs = req.timeoutMs ?? DEFAULT_OPENAI_COMPAT_TIMEOUT_MS;

  const sendOnce = async (useResponseFormat: boolean): Promise<OpenAiCompatCallResponse> => {
    const controller = new AbortController();
    let timedOut = false;
    const timeoutHandle = setTimeout(() => {
      timedOut = true;
      controller.abort(new Error(`Timeout >${timeoutMs}ms saat memanggil ${req.provider}:${req.model}`));
    }, timeoutMs);

    const onExternalAbort = () => {
      controller.abort(req.abortSignal?.reason ?? new Error('Aborted by caller'));
    };
    if (req.abortSignal) {
      if (req.abortSignal.aborted) {
        clearTimeout(timeoutHandle);
        const abortErr = new Error('Panggilan dibatalkan oleh batas waktu pipeline.');
        abortErr.name = 'AbortError';
        throw abortErr;
      }
      req.abortSignal.addEventListener('abort', onExternalAbort, { once: true });
    }

    try {
      const headers: Record<string, string> = {
        'content-type': 'application/json',
        authorization: `Bearer ${req.apiKey}`,
      };
      if (req.provider === 'openrouter') {
        headers['HTTP-Referer'] = 'https://sipena-ktt.bps.go.id';
        headers['X-Title'] = 'SIPENA KTT';
      }

      const userContent =
        req.jsonMode && !useResponseFormat
          ? `${req.userInput}\n\nPENTING: Keluarkan HANYA 1 objek JSON valid sesuai skema tanpa teks pembuka atau penutup.`
          : req.userInput;

      const bodyPayload: Record<string, unknown> = {
        model: req.model,
        messages: [
          { role: 'system', content: req.systemInstruction },
          { role: 'user', content: userContent },
        ],
        temperature: req.temperature ?? 0.1,
        max_tokens: req.maxTokens ?? 3072,
      };
      if (useResponseFormat) {
        bodyPayload.response_format = { type: 'json_object' };
      }

      const response = await fetch(baseUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyPayload),
        signal: controller.signal,
      });

      const rawText = await response.text();

      if (!response.ok) {
        const detail = sanitizeSecretFromText(extractErrorDetailFromJson(rawText), req.apiKey);
        if (useResponseFormat && isUnsupportedResponseFormatError(response.status, detail)) {
          return sendOnce(false);
        }

        const retryAfterMs =
          parseDurationHeaderToMs(response.headers.get('retry-after')) ??
          parseDurationHeaderToMs(response.headers.get('x-ratelimit-reset-requests')) ??
          parseDurationHeaderToMs(response.headers.get('x-ratelimit-reset-tokens'));

        throw new OpenAiCompatError({
          provider: req.provider,
          status: response.status,
          code:
            response.status === 429
              ? 'RATE_LIMIT_EXCEEDED'
              : response.status === 401 || response.status === 403
                ? 'AUTH_ERROR'
                : 'HTTP_ERROR',
          message: `${req.provider.toUpperCase()} HTTP ${response.status} (${req.model}): ${detail}`,
          retryAfterMs,
          isDailyQuota: detectDailyQuotaExhaustion(detail),
        });
      }

      let parsedPayload: unknown;
      try {
        parsedPayload = JSON.parse(rawText);
      } catch {
        throw new OpenAiCompatError({
          provider: req.provider,
          status: response.status,
          code: 'INVALID_HTTP_JSON',
          message: `${req.provider.toUpperCase()} (${req.model}) mengembalikan respons non-JSON.`,
        });
      }

      const outputText = extractChatMessageText(parsedPayload);
      if (!outputText) {
        throw new OpenAiCompatError({
          provider: req.provider,
          status: response.status,
          code: 'EMPTY_OUTPUT',
          message: `${req.provider.toUpperCase()} (${req.model}) mengembalikan output teks kosong.`,
        });
      }

      const usageRaw = (parsedPayload as {
        usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number };
        model?: string;
      }).usage;
      const inputTokens = Number(usageRaw?.prompt_tokens ?? 0) || 0;
      const outputTokens = Number(usageRaw?.completion_tokens ?? 0) || 0;
      const totalTokens = Number(usageRaw?.total_tokens ?? inputTokens + outputTokens) || 0;

      return {
        outputText,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens,
        },
        modelResponded: (parsedPayload as { model?: string }).model,
      };
    } catch (err) {
      if (err instanceof OpenAiCompatError) {
        throw err;
      }
      if (req.abortSignal?.aborted) {
        const abortErr = new Error('Panggilan LLM dibatalkan oleh batas waktu pipeline.');
        abortErr.name = 'AbortError';
        throw abortErr;
      }
      const cleanMsg = sanitizeSecretFromText(
        err instanceof Error ? err.message : String(err),
        req.apiKey,
      );
      if (timedOut) {
        throw new OpenAiCompatError({
          provider: req.provider,
          status: 504,
          code: 'TIMEOUT',
          message: `Timeout >${timeoutMs}ms (${req.provider}:${req.model}): ${cleanMsg}`,
        });
      }
      throw new OpenAiCompatError({
        provider: req.provider,
        code: 'NETWORK_ERROR',
        message: cleanMsg,
      });
    } finally {
      clearTimeout(timeoutHandle);
      if (req.abortSignal) {
        req.abortSignal.removeEventListener('abort', onExternalAbort);
      }
    }
  };

  return sendOnce(Boolean(req.jsonMode));
}

