// server/api/admin/portals/ping.post.ts
import { defineEventHandler } from 'h3';
import { z } from 'zod';
import { REGIONAL_PORTALS, parseRegionalPortalIndex, parseRegionalRssFeed } from '../../../services/scraper/portals';
import { detectSoftBlockPage } from '../../../services/scraper/extractor';
import { DEFAULT_BROWSER_HEADERS, DEFAULT_BROWSER_USER_AGENT, safeFetchText } from '../../../utils/ssrf';
import { parseBodyWithSchema } from '../../../utils/request';
import { requireAdminSession } from '../../../utils/session';

const PingPortalSchema = z.object({
  portalId: z.string().trim().min(1).max(60),
});

export default defineEventHandler(async (event) => {
  await requireAdminSession(event);
  const body = await parseBodyWithSchema(event, PingPortalSchema);

  const portal = REGIONAL_PORTALS.find((p) => p.id === body.portalId);
  if (!portal) {
    return {
      ok: false,
      portalId: body.portalId,
      status: 404,
      latencyMs: 0,
      isSoftBlocked: false,
      itemsFound: 0,
      resolvedUrl: null,
      error: 'Konfigurasi portal regional tidak ditemukan.',
    };
  }

  const targetUrl = portal.feedUrls?.[0] ?? portal.indexUrl;
  const isFeed = Boolean(portal.feedUrls?.[0]);
  const startedAt = Date.now();

  try {
    const response = await safeFetchText(targetUrl, {
      timeoutMs: 7_000,
      maxBytes: 1024 * 1024,
      accept: isFeed
        ? 'application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.5'
        : DEFAULT_BROWSER_HEADERS.accept,
      userAgent: DEFAULT_BROWSER_USER_AGENT,
      headers: DEFAULT_BROWSER_HEADERS,
    });

    const latencyMs = Date.now() - startedAt;
    const softBlock = detectSoftBlockPage(response.body);
    if (softBlock.isSoftBlocked) {
      return {
        ok: false,
        portalId: portal.id,
        status: response.status,
        latencyMs,
        isSoftBlocked: true,
        itemsFound: 0,
        resolvedUrl: response.finalUrl,
        error: softBlock.reason ?? 'Terdeteksi soft-block anti-bot.',
      };
    }

    const candidates = isFeed
      ? parseRegionalRssFeed(response.body, portal, { feedUrl: targetUrl, maxItems: 10 })
      : parseRegionalPortalIndex(response.body, portal, { baseUrl: targetUrl, maxItems: 10 });

    return {
      ok: true,
      portalId: portal.id,
      status: response.status,
      latencyMs,
      isSoftBlocked: false,
      itemsFound: candidates.length,
      resolvedUrl: response.finalUrl,
      error: null,
    };
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : String(err);
    let friendlyError = rawMsg;
    if (rawMsg.includes('ENOTFOUND')) {
      friendlyError = portal.inactiveReason
        ? `${portal.inactiveReason}`
        : 'Domain tidak dapat dihubungi (DNS ENOTFOUND). Host kemungkinan tidak aktif atau telah dilebur.';
    } else if (rawMsg.includes('403')) {
      friendlyError = 'Akses Ditolak (HTTP 403 Forbidden). Web server/WAF memblokir crawler otomatis dari server.';
    }

    return {
      ok: false,
      portalId: portal.id,
      status: rawMsg.includes('403') ? 403 : 0,
      latencyMs: Date.now() - startedAt,
      isSoftBlocked: false,
      itemsFound: 0,
      resolvedUrl: targetUrl,
      error: friendlyError,
    };
  }
});

