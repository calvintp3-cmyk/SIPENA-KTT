---
name: mastra
description: "Build TypeScript AI agents, durable multi-step workflows, tool integrations, memory, and RAG pipelines with the Mastra framework (@mastra/core). Activate only when building autonomous agent workflows rather than lightweight scheduled HTTP/JSON classifiers."
---

# Mastra TypeScript AI Framework (`@mastra/core`)

Progressive-disclosure reference bank for **`mastra-ai/mastra`** (`mastra-ai/skills`).

> **Architecture Fit Note:** Prefer simple TypeScript routers + Zod v4 (`llm-routing-and-scraping` + `gemini-api-integration`) for single-turn cron batch classification. Reach for Mastra when evolving toward multi-turn autonomous analyst agents (tool-calling across PostgreSQL + document RAG + persistent thread memory + step-by-step approval workflows).

## References
- **Agents, Workflows, Tools & RAG:** [`references/agents-and-workflows.md`](references/agents-and-workflows.md)

## Official Upstream Sync
If actively building a full Mastra project, install the latest live skills directly:
```bash
npx skills add mastra-ai/skills
```

