# Mastra Agents, Tools & Workflows Reference

Core TypeScript patterns for **`@mastra/core`** with Zod v4 schemas.

---

## 1. Installation

```bash
npm install @mastra/core zod
```

---

## 2. Defining Tools & Agents (`@mastra/core/agent`, `@mastra/core/tools`)

Keep tools narrow, strongly typed with Zod v4, and bounded to read/query operations unless explicit mutation scopes apply:

```typescript
import { Agent } from '@mastra/core/agent';
import { createTool } from '@mastra/core/tools';
import { z } from 'zod';

const querySectorSummaryTool = createTool({
  id: 'query-sector-summary',
  description: 'Fetch verified PDRB article counts by KBLI 2025 category and quarter',
  inputSchema: z.object({
    year: z.number().int().min(2000).max(2100),
    quarter: z.number().int().min(1).max(4),
    kbliCategory: z.enum(['A', 'B', 'C', 'F', 'G', 'H']).optional(),
  }),
  outputSchema: z.object({
    totalVerified: z.number().int(),
    highlights: z.array(z.string()),
  }),
  execute: async ({ context }) => {
    // Query Drizzle / PostgreSQL cleanly here
    return { totalVerified: 0, highlights: [] };
  },
});

export const analystAgent = new Agent({
  id: 'pdrb-analyst',
  name: 'PDRB Economic Analyst',
  instructions:
    'Analyze verified regional economic phenomena strictly grounded in database records returned by tools. Never fabricate figures.',
  model: 'google/gemini-3.8-flash',
  tools: { querySectorSummaryTool },
});
```

---

## 3. Graph / Step Workflows (`createStep`, `createWorkflow`)

Use `createWorkflow` for deterministic multi-stage pipelines (e.g., fetch -> classify -> verify -> synthesize) with strict Zod contracts between steps:

```typescript
import { createStep, createWorkflow } from '@mastra/core/workflows';
import { z } from 'zod';

const fetchStep = createStep({
  id: 'fetch-articles',
  inputSchema: z.object({ lookbackDays: z.number().int().min(1).default(7) }),
  outputSchema: z.object({ urls: z.array(z.url()) }),
  execute: async ({ inputData }) => {
    return { urls: [] };
  },
});

const classifyStep = createStep({
  id: 'classify-articles',
  inputSchema: z.object({ urls: z.array(z.url()) }),
  outputSchema: z.object({ processedCount: z.number().int() }),
  execute: async ({ inputData }) => {
    return { processedCount: inputData.urls.length };
  },
});

export const harvestWorkflow = createWorkflow({
  id: 'news-harvest-workflow',
  inputSchema: z.object({ lookbackDays: z.number().int().min(1).default(7) }),
  outputSchema: z.object({ processedCount: z.number().int() }),
})
  .then(fetchStep)
  .then(classifyStep)
  .commit();
```

---

## 4. When to Escalate Beyond Nitro Scripts to Mastra
- Need persistent multi-turn conversation **Memory** + semantic recall across sessions.
- Need **Human-in-the-Loop workflow suspend/resume** gates before publishing executive reports.
- Need **RAG chunking/vector ingestion** over large static policy manuals (e.g., PDF `pedoman_pdrb` + `KBLI` catalogs) paired with tool-grounded QA.
- Need built-in **Evals / Observability** across agent steps.

