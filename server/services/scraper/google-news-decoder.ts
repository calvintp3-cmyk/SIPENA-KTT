// server/services/scraper/google-news-decoder.ts
import { load } from 'cheerio';
import {
  DEFAULT_BROWSER_USER_AGENT,
  DEFAULT_FETCH_TIMEOUT_MS,
  validateExternalUrl,
} from '../../utils/ssrf';
import { isSafeHttpUrl } from '../../utils/url-hash';

const GOOGLE_NEWS_BATCHEXECUTE_URL =
  'https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je';

export const DEFAULT_GOOGLE_NEWS_DECODE_CAP_PER_RUN = 20;
export const DEFAULT_GOOGLE_NEWS_DECODE_DELAY_MS = 250;

export interface GoogleNewsDecodeParams {
  id: string;
  ts: string;
  sg: string;
}

export interface GoogleNewsDecodeOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
  validateUrlFn?: typeof validateExternalUrl;
  fetchFn?: typeof fetch;
}

export function extractGoogleNewsDecodeParams(html: string): GoogleNewsDecodeParams | null {
  if (!html) return null;
  const $ = load(html);
  const el = $('[data-n-a-id][data-n-a-ts][data-n-a-sg]').first();
  if (el.length > 0) {
    const id = el.attr('data-n-a-id')?.trim();
    const ts = el.attr('data-n-a-ts')?.trim();
    const sg = el.attr('data-n-a-sg')?.trim();
    if (id && ts && sg) {
      return { id, ts, sg };
    }
  }

  const idMatch = /data-n-a-id=["']([^"']+)["']/i.exec(html);
  const tsMatch = /data-n-a-ts=["']([^"']+)["']/i.exec(html);
  const sgMatch = /data-n-a-sg=["']([^"']+)["']/i.exec(html);
  if (idMatch?.[1] && tsMatch?.[1] && sgMatch?.[1]) {
    return {
      id: idMatch[1].trim(),
      ts: tsMatch[1].trim(),
      sg: sgMatch[1].trim(),
    };
  }

  return null;
}

export function buildFbv4jeFormBody(params: GoogleNewsDecodeParams): string {
  const garturlReq = [
    'garturlreq',
    [
      ['X', 'X', ['X', 'X'], null, null, 1, 1, 'ID:id', null, 1, null, null, null, null, null, 0, 1],
      'X',
      'X',
      1,
      [1, 1, 1],
      1,
      1,
      null,
      0,
      0,
      null,
      0,
    ],
    params.id,
    params.ts,
    params.sg,
  ];

  const fReq = [[['Fbv4je', JSON.stringify(garturlReq), null, 'generic']]];
  return `f.req=${encodeURIComponent(JSON.stringify(fReq))}`;
}

export function parseGarturlFromBatchexecuteBody(rawBody: string): string | null {
  if (!rawBody) return null;

  // Format umum: ["garturlres","https://domain.com/...",1] (atau ter-escape di dalam string JSON)
  const patterns = [
    /\["garturlres","(https?:\/\/[^"]+)"/i,
    /\[\\"garturlres\\",\\"(https?:\/\/[^"\\]+)\\"/i,
  ];

  for (const re of patterns) {
    const m = re.exec(rawBody);
    if (m?.[1]) {
      try {
        const unescaped = JSON.parse(`"${m[1]}"`) as string;
        if (isSafeHttpUrl(unescaped)) {
          return unescaped;
        }
      } catch {
        const fallback = m[1].replace(/\\u003d/gi, '=').replace(/\\u0026/gi, '&');
        if (isSafeHttpUrl(fallback)) {
          return fallback;
        }
      }
    }
  }

  return null;
}

function isGoogleOwnedUrlHost(rawUrl: string): boolean {
  try {
    const hostname = new URL(rawUrl).hostname.toLowerCase();
    return (
      hostname === 'news.google.com' ||
      hostname === 'google.com' ||
      hostname.endsWith('.google.com')
    );
  } catch {
    return true;
  }
}

/**
 * Mendekode URL artikel Google News JS wrapper (`CBMi...`) menjadi URL penerbit asli
 * melalui endpoint `batchexecute?rpcids=Fbv4je`, dengan validasi SSRF penuh pada endpoint maupun URL hasil.
 */
export async function decodeGoogleNewsUrlFromHtml(
  wrapperHtml: string,
  options: GoogleNewsDecodeOptions = {},
): Promise<string | null> {
  const decodeParams = extractGoogleNewsDecodeParams(wrapperHtml);
  if (!decodeParams) return null;

  const validateUrl = options.validateUrlFn ?? validateExternalUrl;
  const fetchFn = options.fetchFn ?? fetch;
  const timeoutMs = options.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => {
    controller.abort(new Error(`Timeout >${timeoutMs}ms saat mendekode Google News Fbv4je.`));
  }, timeoutMs);

  const onExternalAbort = () => {
    controller.abort(options.signal?.reason ?? new Error('Pipeline dibatalkan.'));
  };
  if (options.signal) {
    if (options.signal.aborted) {
      clearTimeout(timeoutHandle);
      return null;
    }
    options.signal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    const validatedRpcUrl = await validateUrl(GOOGLE_NEWS_BATCHEXECUTE_URL);
    const response = await fetchFn(validatedRpcUrl.toString(), {
      method: 'POST',
      redirect: 'error',
      signal: controller.signal,
      headers: {
        'content-type': 'application/x-www-form-urlencoded;charset=UTF-8',
        'user-agent': DEFAULT_BROWSER_USER_AGENT,
        referer: 'https://news.google.com/',
      },
      body: buildFbv4jeFormBody(decodeParams),
    });

    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      return null;
    }

    const bodyText = await response.text();
    const targetUrl = parseGarturlFromBatchexecuteBody(bodyText);
    if (!targetUrl || isGoogleOwnedUrlHost(targetUrl)) {
      return null;
    }

    await validateUrl(targetUrl);
    return targetUrl;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutHandle);
    if (options.signal) {
      options.signal.removeEventListener('abort', onExternalAbort);
    }
  }
}

