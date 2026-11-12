# Permanent Free-Tier LLM APIs & Multi-Provider Routing

Patterns distilled from **`mnfst/awesome-free-llm-apis`** combined with production TypeScript token-bucket routing for structured JSON & synthesis pipelines.

---

## 1. OpenAI-Compatible Free-Tier Provider Matrix

Nearly every free inference API implements OpenAI's `/chat/completions` contract (`Authorization: Bearer <KEY>`, JSON body `{ model, messages, temperature, max_tokens }`), making adapters easy to swap by changing `baseUrl`, `apiKey`, and `model`:

| Provider | OpenAI-Compatible Base URL | Typical Free-Tier Profile* | Operational & Privacy Notes |
| :--- | :--- | :--- | :--- |
| **Google AI Studio (`@google/genai`)** | Native SDK (`@google/genai`) | High RPM/TPM on Flash-Lite; tight RPD (`~20 RPD`) on Flash | Best multilingual/Indonesian reasoning & `propertyOrdering` JSON Schema; pair with fallbacks for daily bursts |
| **Groq** | `https://api.groq.com/openai/v1` | Fast LPU inference; e.g., `llama-3.3-70b-versatile` (~1K RPD / 12K TPM) & `llama-3.1-8b-instant` (~14.4K RPD / 6K TPM) | Very tight per-minute **TPM** cap — requires token-bucket pacing & compact system prompts |
| **Cerebras** | `https://api.cerebras.ai/v1` | Extremely fast token/s (`Llama 3.3 70B`, `Qwen` variants); generous RPM/RPD evaluation tiers | Verify active free model IDs and TPM ceilings in dashboard |
| **OpenRouter (`:free`)** | `https://openrouter.ai/api/v1` | Rotating `:free` models (~20 RPM; 50 RPD pure free, 1K RPD with $\ge\$10$ historical credit) | Send optional `HTTP-Referer` & `X-Title`; not all upstream `:free` models honor `response_format: json_object` |
| **Mistral AI (`La Plateforme`)** | `https://api.mistral.ai/v1` | Free experimentation tier (~1 req/s, high monthly token budget) | **Privacy check:** free experimental tiers may permit training unless opted out / on paid tier; avoid sending sensitive private data |
| **NVIDIA NIM** | `https://integrate.api.nvidia.com/v1` | Broad open-weight catalog (Llama, Nemotron, Mistral); ~40 evaluation RPM (phone verification) | Great as secondary evaluation fallback slot |
| **Cloudflare Workers AI** | `https://api.cloudflare.com/client/v4/accounts/{ID}/ai/v1` | Daily free neuron allocation (edge open-weight models) | Good lightweight classifier fallback if already using Cloudflare |

*\*Limits change frequently; treat numbers as sizing baselines and verify current model availability before hardcoding chains.*

---

## 2. Production OpenAI-Compatible Client Checklist

When calling third-party `/chat/completions` endpoints with native `fetch` (zero SDK bloat):

1. **Per-call `AbortController` timeout + caller budget:** Enforce bounded timeouts (`15s` JSON classification, `22s` long synthesis) AND abort cleanly when the batch pipeline deadline approaches.
2. **Automatic `response_format` downgrade:** Send `response_format: { type: 'json_object' }` for JSON tasks, but if the upstream returns `HTTP 400 / 422` mentioning `response_format` / `json_object` / `unsupported`, automatically retry once without `response_format` and append an explicit "output raw JSON only" footer.
3. **Fence-stripping + Zod v4 repair:** Strip ```` ```json ```` wrappers and extraneous preamble/postscript before `JSON.parse()` + `Schema.safeParse()`.
4. **Secret redaction in telemetry & logs:** Scrub keys (`gsk_*`, `sk-or-v1-*`, `AIza*`, raw bearer tokens) before storing error strings in database logs or HTTP responses.

---

## 3. Router Architecture: Dual Prompts, TPM Pacing & `0ms` Failover

### A. Dual System Prompt (`FULL` vs `COMPACT`)
- **`FULL` prompt** (for high-TPM providers like Gemini): Include rich domain taxonomies, boundary disambiguations, and few-shot calibration examples. Keep static prefix identical across calls for implicit prefix caching.
- **`COMPACT` prompt** (`<= ~950 tokens`, for tight-TPM providers like Groq `12K TPM`): Strip prose redundancy while keeping core rules and exact schema enums so each article fits comfortably (~1,350–1,550 input tokens total).

### B. Sliding-Window RPM + TPM Token-Bucket Pacer
Before picking a slot, prune timestamps older than `60_000ms`, estimate request tokens (`ceil((system.length + user.length) / 3.4) + expectedOutput`), and check whether `(usedTokensLast60s + estimatedTokens) > slot.tpmLimit`:
- If **any lower-priority slot has `0ms` wait**, jump to it immediately (`0ms` failover) instead of sleeping on the blocked primary slot.
- Sleep only when **all** remaining eligible slots are cooling down, choosing the slot with the minimum wait time (if still within pipeline deadline).

### C. Failure Classification & Circuit Breaker
| Error Signal | Classification | Action |
| :--- | :--- | :--- |
| `429` + `PerDay` / `RPD` / `TPD` / `free-models-per-day` / `credits exhausted` | `DAILY_QUOTA` | Set `slot.disabledForSession = true`; fail over `0ms` to next provider |
| `429` without daily markers | `RATE_LIMIT_MINUTE` | Read `retry-after` / `x-ratelimit-reset-*` header (default `20s`), set `cooldownUntilMs`, fail over `0ms` |
| `503` / `502` / `504` / `408` / network timeout | `TRANSIENT` | Max `1x` fast retry (`~1.5s`), then apply `60s` cooldown and route remaining items to secondary provider |
| `401` / `403` / `API_KEY_INVALID` | `AUTH` | Disable slot permanently for the session + log sanitized diagnostic |
| Non-JSON or Zod validation error | `INVALID_OUTPUT` | Retry `1x` (or failover slot) before marking item `FAILED` |

