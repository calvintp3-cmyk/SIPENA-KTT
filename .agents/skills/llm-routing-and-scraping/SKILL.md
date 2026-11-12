---
name: llm-routing-and-scraping
description: "Design resilient free-tier multi-LLM routing (Groq, Cerebras, Mistral, OpenRouter :free, NVIDIA NIM, Gemini), production-grade news crawling (Node.js Cheerio/Crawlee patterns, adaptive DOM extraction from Scrapling, RSS/JSON-LD-first discovery, soft-block detection, SSRF guards), optional macro GDELT 2.0 Doc API feeds, and two-stage lexical-to-embedding semantic deduplication. Use when extending LLM providers, tuning rate-limit failover, deduplicating paraphrased news, or building/debugging news crawlers."
---

# LLM Routing & Resilient News Scraping

Unified engineering skill combining permanent free-tier LLM API routing patterns (`awesome-free-llm-apis`), resilient TypeScript/Node.js & adaptive HTML extraction (`apify/crawlee` + `D4Vinci/Scrapling`), and zero-Python-overhead macro discovery & semantic dedup (`GDELT 2.0 Doc API` + `Gemini Embeddings`).

Load only the reference file matching your task:

| Task / Domain | When to Read | Reference |
| :--- | :--- | :--- |
| **Free-Tier Multi-LLM Routing** | Adding OpenAI-compatible free providers (`Groq`, `Cerebras`, `Mistral`, `OpenRouter :free`, `NVIDIA NIM`), RPM/TPM token buckets, or `0ms` failover logic | [`references/free-llm-apis.md`](references/free-llm-apis.md) |
| **Crawlee & Node.js Crawling** | Structuring `RequestQueue` / `CheerioCrawler` vs `PlaywrightCrawler`, `SessionPool` retry, HTTP block handling (`401/403/429`), polite throttling, or Nitro/Nuxt SSRF guards | [`references/crawlee-nodejs-patterns.md`](references/crawlee-nodejs-patterns.md) |
| **Adaptive Extraction (Scrapling)** | Resilient multi-layer news HTML extraction when portal CSS selectors drift, JSON-LD/OG/paragraph-density scoring, or wiring optional Python `scrapling-official` / MCP | [`references/scrapling-adaptive-patterns.md`](references/scrapling-adaptive-patterns.md) |
| **Macro Feeds & Semantic Dedup** | Pulling national/commodity news via HTTP `GDELT 2.0 Doc API`, two-stage `Lexical -> Gemini Embedding` paraphrase dedup, or offline ML boundaries (`GLiNER`/`BERTopic`) | [`references/macro-feeds-and-semantic-dedup.md`](references/macro-feeds-and-semantic-dedup.md) |

## Non-Negotiable Architecture Rules
1. **Failover over sleep:** On daily quota exhaustion (`RPD`/`TPD`) or minute `429`, cooldown/disable the exhausted slot and fail over immediately (`0ms`) to the next provider instead of blocking batch pipelines in long sleep loops.
2. **RSS & JSON-LD before full HTML fetch:** Prefer structured `<content:encoded>` / feeds and `application/ld+json` metadata before falling back to DOM CSS selectors.
3. **Respect boundaries & soft-blocks cleanly:** Enforce SSRF private-IP blocking on all outbound fetches; if a portal serves `403`, login/challenge shells, or paywalls (`200 OK` soft-block), record/skip or fall back to RSS metadata rather than attempting to circumvent access controls or CAPTCHAs.
4. **Companion skills:** Pair with `gemini-api-integration` for `@google/genai` SDK config and `zod-validation-expert` for Zod v4 schema parsing/JSON output validation.

