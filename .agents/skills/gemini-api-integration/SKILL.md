---
name: gemini-api-integration
description: "Use when integrating Google Gemini API in TypeScript/JavaScript or Python via the official @google/genai / google-genai SDKs. Covers model selection (Gemini 3.8 / 3.5 / 4), structured JSON outputs with responseJsonSchema and propertyOrdering, ThinkingConfig, Interactions API streaming, text embeddings (gemini-embedding-2 / gemini-embedding-001) for semantic similarity & RAG, and production rate-limit / error handling."
---

# Gemini API Integration (`@google/genai`)

Guide for production integration using Google's official unified **`@google/genai`** (JS/TS) and **`google-genai`** (Python) SDKs.

> **Critical Rules:**
> - **Never use** deprecated legacy SDKs (`@google/generative-ai` for JS or `google-generativeai` for Python).
> - **Never select** legacy/deprecated models (`gemini-1.5-*`, `gemini-2.0-*`, `gemini-2.5-*`). Use current models: `gemini-3.8-flash`, `gemini-3.5-flash-lite`, `gemini-3.1-flash-lite`, `gemini-4-argon`, or `gemini-4-carbon`.
> - If `gemini-api_gemini-api-docs` MCP tools (`gemini_search_docs`, `gemini_get_doc`) are active in the environment, query them before inventing edge-case parameters.

---

## 1. Installation & Client Initialization

```bash
npm install @google/genai
# Optional for native JSON schema generation (built into Zod v4):
npm install zod
```

```typescript
import { GoogleGenAI } from '@google/genai';

// Automatically reads GEMINI_API_KEY, or pass explicit key per slot:
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
```

---

## 2. Model Selection Guide

| Model ID | Best For | Context | Notes |
| :--- | :--- | :--- | :--- |
| `gemini-3.8-flash` | Default structured extraction, classification, synthesis, multimodal | 1M | Fast & balanced; supports `ThinkingLevel.LOW` / `MEDIUM` / `HIGH` *(do not set `MINIMAL` on 3.8-flash)* |
| `gemini-3.5-flash-lite` | High-throughput batch classification, low latency & lowest cost | 1M | Ideal fallback tier; supports `ThinkingLevel.MINIMAL` |
| `gemini-3.1-flash-lite` | Lightweight high-frequency classification / utility checks | — | Cost-efficient fast tier |
| `gemini-4-argon` | Interactive coding, analytical synthesis, fast reasoning | 1M | Efficient frontier reasoning |
| `gemini-4-carbon` | Complex frontier reasoning, deep multimodal analysis | 1M | Highest reasoning capability |
| `gemini-embedding-2` | Text & multimodal semantic embeddings, dedup, RAG retrieval | 8,192 | Auto-normalizes `outputDimensionality` (`768`/`1536`/`3072`); use task prompt prefixes |
| `gemini-embedding-001` | Text-only batch array embeddings with explicit `taskType` | 2,048 | Supports string arrays in `contents`; manually L2-normalize dims `< 3072` |

---

## 3. Stateless Generation & Structured JSON Outputs (`models.generateContent`)

Use `ai.models.generateContent()` for stateless, single-turn backend pipelines (classification, structured extraction, strict zero-server-state workflows):

```typescript
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import { z } from 'zod';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const OutputZod = z.object({
  reasoningSummary: z.string(),
  category: z.enum(['A', 'B', 'C']),
  confidence: z.number().min(0).max(1),
});

// Zod v4 native JSON Schema + Gemini's propertyOrdering (guides reasoning-before-label)
const responseJsonSchema: Record<string, unknown> = {
  ...z.toJSONSchema(OutputZod),
  propertyOrdering: ['reasoningSummary', 'category', 'confidence'],
};

const response = await ai.models.generateContent({
  model: 'gemini-3.8-flash',
  contents: articleText,
  config: {
    systemInstruction: staticDomainPrompt, // Keep static prefix identical for implicit caching
    responseMimeType: 'application/json',
    responseJsonSchema,
    maxOutputTokens: 3072, // Account for shared thinking + JSON output budget
    temperature: 0.1,
    thinkingConfig: {
      thinkingLevel: ThinkingLevel.LOW, // Use MINIMAL on flash-lite
    },
    abortSignal: controller.signal,
    httpOptions: {
      timeout: 15_000,
      retryOptions: { attempts: 1 }, // Handle failover immediately in your router
    },
  },
});

const text = response.text?.trim() ?? '';
const parsed = OutputZod.parse(JSON.parse(text));

// Accurate token accounting includes thoughts tokens:
const inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
const outputTokens =
  (response.usageMetadata?.candidatesTokenCount ?? 0) +
  (response.usageMetadata?.thoughtsTokenCount ?? 0);
```

### Streaming with `models.generateContentStream`

```typescript
const stream = await ai.models.generateContentStream({
  model: 'gemini-3.8-flash',
  contents: prompt,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.text ?? '');
}
```

---

## 4. Stateful Chat, Streaming & Background Tasks (`interactions`)

For multi-turn assistant UIs, server-managed state, or long-running background agents, use the modern Interactions API:

```typescript
const interaction1 = await ai.interactions.create({
  model: 'gemini-3.8-flash',
  input: 'Summarize economic indicators from Q1.',
});

const interaction2 = await ai.interactions.create({
  model: 'gemini-3.8-flash',
  input: 'Compare that with Q2.',
  previous_interaction_id: interaction1.id,
});

// Streaming events:
const events = await ai.interactions.create({
  model: 'gemini-3.8-flash',
  input: 'Draft a short briefing.',
  stream: true,
});
for await (const ev of events) {
  if (ev.event_type === 'step.delta' && ev.delta?.type === 'text') {
    process.stdout.write(ev.delta.text ?? '');
  }
}
```

---

## 5. Text Embeddings & Semantic Similarity (`models.embedContent`)

Prefer **Gemini Embedding API** over running local Python/ONNX sentence-transformer models on memory-constrained Node.js servers (`0 MB` local ML model weight).

### Choosing Between `gemini-embedding-2` and `gemini-embedding-001`
- **`gemini-embedding-2`** (8,192 tokens, text & multimodal): Auto-normalizes truncated dimensions (`768`, `1536`, `3072`). Use **prompt task prefixes** (`task: sentence similarity | query: ...`, `task: classification | query: ...`, or asymmetric `task: search result | query: ...` vs `title: {title} | text: {content}`). **Important:** passing multiple items in `contents: [...]` produces **one aggregated embedding** (`embeddings[0]`), so embed each article/query individually (or via Batch API).
- **`gemini-embedding-001`** (2,048 tokens, text): Supports passing an array of strings in `contents` to receive **one vector per input string** (`response.embeddings[i].values`) and accepts `config.taskType` (`'SEMANTIC_SIMILARITY'`, `'RETRIEVAL_DOCUMENT'`, `'RETRIEVAL_QUERY'`). Must be manually L2-normalized when `outputDimensionality < 3072`.

```typescript
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function embedForSimilarity(text: string): Promise<number[]> {
  const res = await ai.models.embedContent({
    model: 'gemini-embedding-2',
    contents: `task: sentence similarity | query: ${text}`,
    config: { outputDimensionality: 768 }, // Auto-normalized by gemini-embedding-2
  });
  return res.embeddings?.[0]?.values ?? [];
}

// Batch array embedding helper (gemini-embedding-001 returns 1 vector per string)
export async function embedBatchNormalized(texts: string[]): Promise<number[][]> {
  const res = await ai.models.embedContent({
    model: 'gemini-embedding-001',
    contents: texts,
    config: { taskType: 'SEMANTIC_SIMILARITY', outputDimensionality: 768 },
  });
  return (res.embeddings ?? []).map((item) => {
    const v = item.values ?? [];
    const norm = Math.hypot(...v) || 1;
    return v.map((x) => x / norm);
  });
}

export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  const len = Math.min(a.length, b.length);
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < len; i += 1) {
    dot += a[i]! * b[i]!;
    normA += a[i]! * a[i]!;
    normB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}
```

---

## 6. Production Best Practices & Error Triage

1. **Distinguish quota types on HTTP `429` (`RESOURCE_EXHAUSTED`):**
   - If the error matches daily quota (`PerDay`, `GenerateRequestsPerDay`, `RPD`, `TPD`), **trip a session circuit-breaker** (`disabledForSession = true`) and immediately fail over to another key/provider (`groq`, `openrouter`, `cerebras`) instead of sleeping in retry loops.
   - If transient per-minute limit (`429` without daily quota markers), apply a slot cooldown (`~20s`) and fail over `0ms` to the next available provider.
2. **Handle `503 UNAVAILABLE` / timeouts:** Allow at most 1 fast retry (`~1.5s`), then fail over to a secondary slot rather than blocking batch queues.
3. **Reserve budget for `thinkingConfig`:** Thinking tokens count toward `maxOutputTokens`. Use at least `2048–3072` `maxOutputTokens` on structured JSON tasks so reasoning never truncates closing braces.
4. **Never leak secrets or expose keys:** Keep keys in server env vars only, disable SDK multi-retry when using a multi-LLM router, and strip key patterns from error logs before persisting telemetry.

## Related Skills
- Paired multi-provider free-tier failover (`Groq`, `Cerebras`, `OpenRouter`, `Mistral`) & web extraction: `llm-routing-and-scraping`.
- Zod v4 schema authoring & `z.toJSONSchema`: `zod-validation-expert`.
- Full API reference & advanced features (`TTS`, `Omni`, `Live API`): plugin skill `gemini-api-dev`.
