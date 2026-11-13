---
name: vercel-ai-sdk
description: "Build TypeScript/Nuxt/Vue AI streaming UIs and multi-provider structured outputs with the Vercel AI SDK (ai v5/v6, @ai-sdk/vue, @ai-sdk/google, @ai-sdk/groq, @ai-sdk/openai-compatible). Covers generateText, streamText, Output.object(), convertToModelMessages, and reactive Vue useChat/useObject composables."
---

# Vercel AI SDK (`ai` + `@ai-sdk/vue`)

Progressive-disclosure reference bank for **`vercel/ai`**, tailored for TypeScript / Nitro / Nuxt 3 + Vue 3 applications.

> **When to Activate vs Keep Custom Router:**
> - **Keep custom routers** (like token-bucket `MultiLlmRouter` + `@google/genai`) when running tight free-tier cron batches that depend on `propertyOrdering`, per-provider TPM sliding buckets, and `0ms` cooldown failover.
> - **Use Vercel AI SDK** when building interactive chat assistants, streaming synthesis drafts to Vue UIs (`useChat`, `useObject`), or unified tool-calling endpoints across `@ai-sdk/google`, `@ai-sdk/groq`, and `@ai-sdk/openai-compatible`.

## References

| Scope | What's Covered | Read Reference |
| :--- | :--- | :--- |
| **Core, Structured Outputs & Providers** | `generateText`, `streamText`, `Output.object({ schema })` with Zod v4, `@ai-sdk/google`, `@ai-sdk/groq`, `createOpenAICompatible` | [`references/core-and-providers.md`](references/core-and-providers.md) |
| **Nuxt Nitro & Vue 3 UI (`@ai-sdk/vue`)** | `defineEventHandler` + `convertToModelMessages` + `toUIMessageStreamResponse()`, `useChat` (`sendMessage`, `message.parts`), `useObject` | [`references/vue-and-nuxt.md`](references/vue-and-nuxt.md) |

