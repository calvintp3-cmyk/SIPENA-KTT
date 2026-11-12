# Macro News Discovery (GDELT 2.0 REST), Semantic Deduplication & Local-ML Boundaries

TypeScript/Node.js-native patterns adapting the high-value concepts from **`linwoodc3/gdeltPyR`** and **`huggingface/sentence-transformers`** — plus architectural guardrails against loading heavy Python/ONNX NLP stacks (`GLiNER`, `BERTopic`, `transformers`) inside a memory-capped Node.js server.

---

## 1. Macro & Commodity Signal Discovery via GDELT 2.0 Doc API (Concept from `gdeltPyR`)

Use GDELT as an **optional macro/commodity news supplement** (national fiscal policy, coal/CPO/mineral price shocks, logistics disruptions) rather than relying on `gdeltPyR` (`Python + pandas`) or expecting GDELT to replace hyper-local regency RSS portals.

### Direct REST Query (Zero Python Runtime)
- **Endpoint:** `https://api.gdeltproject.org/api/v2/doc/doc`
- **Important rule:** Filter operators like `sourcelang:ind`, `sourcecountry:ID`, `domain:`, and boolean `OR` clauses belong **inside the `query` string**, not as separate URL query params.

```typescript
import { z } from 'zod';

const GdeltArticleSchema = z.object({
  url: z.string().url(),
  title: z.string().min(1),
  seendate: z.string().optional(),
  domain: z.string().optional(),
  language: z.string().optional(),
  sourcecountry: z.string().optional(),
});

const GdeltDocResponseSchema = z.object({
  articles: z.array(GdeltArticleSchema).default([]),
});

export async function fetchGdeltMacroArticles(params: {
  query: string;       // e.g. '("harga batubara" OR "kelapa sawit" OR inflasi) sourcecountry:ID'
  timespan?: string;   // e.g. '24h', '7d'
  maxRecords?: number; // max 250 for artlist
  signal?: AbortSignal;
}) {
  const url = new URL('https://api.gdeltproject.org/api/v2/doc/doc');
  url.searchParams.set('query', params.query);
  url.searchParams.set('mode', 'artlist');
  url.searchParams.set('format', 'json');
  url.searchParams.set('timespan', params.timespan ?? '48h');
  url.searchParams.set('maxrecords', String(Math.min(params.maxRecords ?? 50, 250)));

  const res = await fetch(url, {
    signal: params.signal ?? AbortSignal.timeout(10_000),
    headers: { Accept: 'application/json' },
  });
  if (!res.ok) {
    throw new Error(`GDELT Doc API HTTP ${res.status}`);
  }

  const parsed = GdeltDocResponseSchema.safeParse(await res.json());
  return parsed.success ? parsed.data.articles : [];
}
```

### Operational Discipline
- Normalize returned URLs, strip tracking parameters, and enforce SSRF/domain validation before fetching full article HTML.
- Prioritize regional RSS / direct local outlets ahead of macro aggregators so regional coverage never gets crowded out by national wire noise.

---

## 2. Two-Stage Paraphrase Deduplication (`Lexical -> Semantic Embedding`, Concept from `sentence-transformers`)

Running local Python/ONNX `SBERT` inside a `~900 MB` Node.js PM2 process wastes RAM. Instead, implement semantic similarity with **zero local model memory** using a bounded two-stage waterfall:

### Stage 1: Fast Lexical Filter (Zero API Cost)
1. Strip portal suffixes (` - Tribun Kaltara`, ` | Antara News`), lowercase, strip stopwords (Indonesian function words + generic units `tahun`, `bulan`, `persen`, `rp`, `pt`).
2. **Numeric-entity guard:** Extract multi-digit non-year numbers (`Rp 50 miliar` vs `Rp 120 miliar`, `15%` vs `8%`). If both texts carry distinct numeric magnitudes with zero overlap, **never merge them as duplicates**.
3. Score `0.35 * jaccard + 0.65 * containment`:
   - `>= 0.72` -> **Duplicate** (drop lower-priority wire/aggregator copy, keeping `REGIONAL > DIRECT > AGGREGATOR`).
   - `< 0.35` -> **Distinct** (skip embedding call).
   - `0.35 <= score < 0.72` (same time window / region) -> **Borderline paraphrase candidate** for Stage 2.

### Stage 2: Bounded Gemini Embedding Tie-Breaker
Embed borderline candidate pairs only via `@google/genai` (`ai.models.embedContent` — see `gemini-api-integration` Section 5):
- Prefer **`gemini-embedding-2`** with `outputDimensionality: 768` (auto-normalized) and symmetric prefix `"task: sentence similarity | query: ${title}. ${leadSentence}"`, OR batch normalized strings via **`gemini-embedding-001`** (`taskType: 'SEMANTIC_SIMILARITY'`).
- Merge as duplicate only when `cosineSimilarity >= 0.85` **and** Stage 1's numeric-entity guard passes.
- Persist normalized `768`-dim vectors in PostgreSQL (`pgvector` if enabled) so historical comparison against the last 10 days requires zero re-embedding.

---

## 3. Architectural Guardrails for Heavy ML / NLP Repos (`GLiNER`, `BERTopic`, `transformers`)

Keep these frameworks **out of the live Nuxt/Nitro Node.js server process**:

| Repo / Concept | Why Not in Live Node Server | Valid Escape Hatch (Only When Actually Needed) |
| :--- | :--- | :--- |
| **`urchade/GLiNER`** (zero-shot NER, including `@lmoe/gliner-onnx`) | Multilingual ONNX weights consume hundreds of MB of RAM and cannot reason about economic impact direction (`POSITIF`/`NEGATIF`) or full taxonomy mapping (`KBLI` / expenditure). | Isolated external worker / pre-filter only if LLM API quotas severely tighten and span-only entity extraction (`commodity`, `location`, `amount`) is sufficient. |
| **`MaartenGr/BERTopic`** (`UMAP + HDBSCAN + c-TF-IDF`) | Requires Python ML stack + hundreds to thousands of articles per batch; produces shifting unsupervised clusters rather than fixed statistical classifications. | **Offline research notebook** (`Jupyter` / `Colab`) on exported historical PostgreSQL articles to discover emerging regional sub-themes beyond fixed categories. |
| **`huggingface/transformers`** | Heavy PyTorch/ONNX runtime and inferior Indonesian analytical reasoning compared with frontier API LLMs (`Gemini` / `Groq` / `OpenRouter`) + `gemini-embedding-2`. | Dedicated GPU/ML microservice outside the Node webapp, never inside PM2 `fork` mode. |

