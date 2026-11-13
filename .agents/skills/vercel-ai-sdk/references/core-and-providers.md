# Vercel AI SDK Core, Structured Output & Providers

Modern AI SDK patterns (v5/v6). Avoid deprecated `generateObject` / `maxSteps`; prefer `generateText` or `streamText` paired with `Output.object({ schema })`.

---

## 1. Installation

```bash
npm install ai @ai-sdk/vue @ai-sdk/google @ai-sdk/groq @ai-sdk/openai-compatible zod
```

---

## 2. Providers (`@ai-sdk/google`, `@ai-sdk/groq`, `@ai-sdk/openai-compatible`)

```typescript
import { google } from '@ai-sdk/google';
import { groq } from '@ai-sdk/groq';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';

// Dedicated providers
const geminiModel = google('gemini-3.8-flash');
const groqModel = groq('llama-3.3-70b-versatile');

// Any OpenAI-compatible provider (Cerebras, OpenRouter :free, NVIDIA NIM, Mistral)
const cerebras = createOpenAICompatible({
  name: 'cerebras',
  baseURL: 'https://api.cerebras.ai/v1',
  apiKey: process.env.CEREBRAS_API_KEY,
});

const openrouter = createOpenAICompatible({
  name: 'openrouter',
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  headers: {
    'HTTP-Referer': 'https://your-app.example.com',
    'X-Title': 'Your App',
  },
});

const openrouterModel = openrouter.chatModel('google/gemma-4-31b-it:free');
```

---

## 3. Structured JSON Output with Zod v4 (`Output.object`)

Use `Output.object({ schema })` inside `generateText` or `streamText`:

```typescript
import { generateText, Output } from 'ai';
import { groq } from '@ai-sdk/groq';
import { z } from 'zod';

const ClassificationSchema = z.object({
  summary: z.string().min(20),
  kbliCategory: z.enum(['A', 'B', 'C', 'G', 'H']),
  confidence: z.number().min(0).max(1),
});

const { output, usage } = await generateText({
  model: groq('llama-3.3-70b-versatile'),
  system: 'Classify economic news cleanly according to KBLI 2025.',
  prompt: articleSnippet,
  output: Output.object({
    schema: ClassificationSchema,
  }),
  temperature: 0.1,
  maxOutputTokens: 2048,
});
```

*(Note: When calling providers that need explicit field ordering before enum decisions — such as Gemini `propertyOrdering` — check whether the `@ai-sdk/google` adapter exposes provider options or invoke `@google/genai` directly.)*

---

## 4. Tool Calling & Step Limits

Use `stopWhen: stepCountIs(N)` (superseding legacy `maxSteps`) alongside Zod v4 `inputSchema`:

```typescript
import { generateText, stepCountIs, tool } from 'ai';
import { google } from '@ai-sdk/google';
import { z } from 'zod';

const { text } = await generateText({
  model: google('gemini-3.8-flash'),
  tools: {
    lookupSectorCount: tool({
      description: 'Count verified articles for a sector and quarter',
      inputSchema: z.object({
        sector: z.string(),
        quarter: z.number().int().min(1).max(4),
      }),
      execute: async ({ sector, quarter }) => {
        return { sector, quarter, count: 12 };
      },
    }),
  },
  stopWhen: stepCountIs(5),
  prompt: 'How many verified articles does sector A have in Q1?',
});
```

