# Crawlee & Resilient Node.js Web Crawling Patterns

Patterns adapted from **`apify/crawlee`** for TypeScript/Node.js backends (`CheerioCrawler`, `PlaywrightCrawler`, `RequestQueue`, `SessionPool`), including lean adaptation for Nuxt / Nitro server routes without heavy storage overhead.

---

## 1. Choosing the Right Crawling Tier

| Strategy | Speed & Cost | When to Use |
| :--- | :--- | :--- |
| **Direct RSS / Atom / WP Feed + HTTP `fetch` (`cheerio`)** | Very fast (`~100–400ms`/page, ~10x faster than browsers) | News portals, WordPress sites (`/feed/`), SSR sites (Nuxt, Next.js), sitemap indexes |
| **`CheerioCrawler` (`crawlee`)** | Fast, supports `RequestQueue`, `SessionPool`, retries | Multi-page / deep recursive Node.js worker scripts running in long-lived CLI or worker processes |
| **`PlaywrightCrawler` (`crawlee`)** | Heavyweight (headless Chromium, ~2–5s/page) | Strictly JS-rendered SPAs where initial HTML payload lacks links or body content |

---

## 2. Core Crawlee Abstractions Worth Applying

### A. Explicit Crawl State (`RequestQueue` / Deduplication Keys)
Never re-crawl already-seen URLs across runs:
- Normalize URLs before hashing (strip `utm_*`, `fbclid`, fragment hashes, trailing slash normalization).
- Check recent database URL hashes + fuzzy title Jaccard/containment similarity (`>= 0.72`) across portals so syndicated wire stories aren't classified multiple times.

### B. `SessionPool`, Block Codes & Graceful Soft-Block Detection
Crawlee treats session health separately from transient network blips:
- **Blocked HTTP statuses:** Treat `401`, `403`, `429` as host blocks/throttles rather than immediately retrying at full speed.
- **Soft-block heuristic (`200 OK` trap):** Some WAFs/paywalls return HTTP `200 OK` containing a challenge wall, `<noscript>` redirect, or empty skeleton instead of the article.
  - Detect short/missing article containers (`wordCount < 30`) or challenge signatures (`cf-browser-verification`, login/paywall overlays).
  - Retire the current fetch attempt cleanly and fall back to RSS `<description>` metadata rather than sending garbled shell HTML to your LLM!
- **Never attempt to defeat CAPTCHAs or access walls:** Respect `403`/paywall limits and keep retry counts bounded (`maxRetries <= 1–2`) with polite per-domain pacing.

### C. Canonical Crawlee Reference Blueprint (Standalone Worker / CLI)

```typescript
import { CheerioCrawler, RequestQueue } from 'crawlee';

const requestQueue = await RequestQueue.open('portal-crawl');
await requestQueue.addRequests([{ url: 'https://portal.example.com/news' }]);

const crawler = new CheerioCrawler({
  requestQueue,
  maxRequestsPerMinute: 60,
  blockedStatusCodes: [401, 403, 429],
  useSessionPool: true,
  maxRequestRetries: 2,
  async requestHandler({ $, request, enqueueLinks, log }) {
    const title = $('meta[property="og:title"]').attr('content') || $('h1').first().text().trim();
    const paragraphs = $('article p').map((_, el) => $(el).text().trim()).get();

    if (paragraphs.join(' ').split(/\s+/).length < 30) {
      log.warning(`Sparse or gated content at ${request.url}; skipping full extraction.`);
      return;
    }

    await enqueueLinks({ strategy: 'same-hostname', globs: ['https://portal.example.com/2026/**'] });
  },
});

await crawler.run();
```

---

## 3. Adapting Crawlee Patterns to Serverless / Nitro API Routes

Full `crawlee` defaults to local disk storage (`./storage/request_queues`, `./storage/datasets`) and process-wide autoscaled pools, which can bloat memory or fail on read-only serverless deployments. In Nitro/Nuxt server pipelines, replicate Crawlee's discipline cleanly with zero extra runtime weight:

1. **Bounded concurrency semaphore:** Replace `AutoscaledPool` with a strict per-run concurrency limiter (e.g. `3–5` concurrent fetches) + hard overall run deadline (`maxDurationMs`).
2. **SSRF guard on every redirect:** Never trust `<link rel="canonical">`, meta refreshes, or decoded aggregator URLs blindly — validate hostnames, block loopback/link-local/RFC1918 IPs, and check redirect targets at every hop.
3. **Domain politeness + global article cap:** Cap per-run candidate volume (e.g., `35` articles prioritized `REGIONAL > DIRECT_NATIONAL > AGGREGATOR`) so cron runs finish predictably inside HTTP/lock budgets.
4. **Sidebar & neighbor-channel isolation:** Strip `aside, nav, footer, header, .sidebar, .related, .popular, .terpopuler` *before* scanning links or extracting body paragraphs so "Most Popular" sidebar widgets never leak unrelated regions or topics.

