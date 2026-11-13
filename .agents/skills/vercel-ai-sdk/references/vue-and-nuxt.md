# Nuxt 3 Nitro + Vue 3 Streaming (`@ai-sdk/vue`)

Modern transport-based patterns for `@ai-sdk/vue` + Nitro `defineEventHandler`.

---

## 1. Nitro Server Route (`server/api/assistant/chat.post.ts`)

Nitro/H3 natively supports returning standard Web `Response` objects emitted by `result.toUIMessageStreamResponse()`:

```typescript
import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import { google } from '@ai-sdk/google';

export default defineEventHandler(async (event) => {
  const body = await readBody<{ messages?: UIMessage[] }>(event);
  if (!Array.isArray(body?.messages)) {
    throw createError({ statusCode: 400, statusMessage: 'messages array is required' });
  }

  const result = streamText({
    model: google('gemini-3.8-flash'),
    system: 'You are an objective economic briefing assistant.',
    messages: await convertToModelMessages(body.messages),
    abortSignal: toWebRequest(event).signal,
  });

  return result.toUIMessageStreamResponse();
});
```

---

## 2. Vue Chat Component (`useChat` with `sendMessage` & `message.parts`)

In AI SDK v5/v6, track your input with a local `ref()`, submit via `sendMessage({ text })`, and render `message.parts` safely instead of assuming legacy `handleSubmit` / string `message.content`:

```vue
<script setup lang="ts">
import { useChat } from '@ai-sdk/vue';
import { ref } from 'vue';

const input = ref('');
const { messages, sendMessage, status, error } = useChat({
  // Default endpoint is /api/chat; customize via transport/api options if routed elsewhere
});

function onSubmit() {
  const text = input.value.trim();
  if (!text) return;
  sendMessage({ text });
  input.value = '';
}
</script>

<template>
  <div class="space-y-4">
    <div v-for="message in messages" :key="message.id" class="whitespace-pre-wrap">
      <strong>{{ message.role === 'user' ? 'User' : 'Assistant' }}:</strong>
      <template v-for="(part, idx) in message.parts" :key="idx">
        <span v-if="part.type === 'text'">{{ part.text }}</span>
      </template>
    </div>

    <p v-if="error" class="text-sm text-red-600">{{ error.message }}</p>

    <form class="flex gap-2" @submit.prevent="onSubmit">
      <input v-model="input" class="flex-1 border px-3 py-2" :disabled="status === 'streaming'" />
      <button type="submit" :disabled="status === 'streaming'">Send</button>
    </form>
  </div>
</template>
```

---

## 3. Streaming Structured JSON Objects (`useObject` + `Output.object`)

Great for progressive live-rendering of BRS narrative sections or structured drafts in admin views:

```vue
<script setup lang="ts">
import { useObject } from '@ai-sdk/vue';
import { z } from 'zod';

const BriefSchema = z.object({
  headline: z.string(),
  keyDrivers: z.array(z.string()),
  outlook: z.string(),
});

const { object, submit, isLoading, error } = useObject({
  api: '/api/synthesis/stream',
  schema: BriefSchema,
});
</script>
```

