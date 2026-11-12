---
name: zod-validation-expert
description: "Expert in Zod v4 — TypeScript-first schema validation. Covers top-level string formats, z.enum(), native z.toJSONSchema(), z.treeifyError()/z.flattenError(), metadata (.meta), refinements, transforms, and Nuxt/Nitro/API validation patterns."
---

# Zod v4 Validation Expert

Build type-safe runtime validation schemas using **Zod v4** (`zod@^4.x`). Zod is for **parsing, not just checking**: `safeParse` and `parse` return clean, typed data and strip unknown keys by default.

> **Critical v4 rule:** Avoid legacy Zod v3 syntax when targeting Zod v4 (`^4.0.0`):
> - Use top-level `z.email()`, `z.uuid()`, `z.url()`, `z.iso.datetime()` instead of deprecated `z.string().email()` / `.uuid()` / `.url()`.
> - Use `z.enum(MyTsEnumOrConstObj)` instead of deprecated `z.nativeEnum(...)`.
> - Use `{ error: '...' }` instead of `{ message: '...' }`, and `z.config(...)` instead of `z.setErrorMap(...)`.
> - Use `z.flattenError(err)`, `z.treeifyError(err)`, or `z.prettifyError(err)` instead of removed `.flatten()` / `.format()` methods.
> - Use native **`z.toJSONSchema(schema)`** instead of the third-party `zod-to-json-schema` package.

---

## Schema Definition & Type Inference (Zod v4)

### Primitives, Top-Level Formats & Coercion

```typescript
import { z } from 'zod';

const StringSchema = z.string().trim().min(3).max(255);
const IntSchema = z.number().int().positive();

// Top-level format validators (tree-shakeable in Zod v4)
const EmailSchema = z.email({ error: 'Format email tidak valid' });
const UuidSchema = z.uuid();
const UrlSchema = z.url();
const IsoDateSchema = z.iso.datetime({ offset: true });

// Coercion for query params / FormData / env vars
const PageSchema = z.coerce.number().int().min(1).default(1);
const EnvPortSchema = z.coerce.number().int().default(3000);
// Tip: avoid z.coerce.boolean() on string "false"/"0" — parse explicitly:
const StringBoolSchema = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1');
```

### Objects, Enums & Metadata

```typescript
import { z } from 'zod';

const Role = {
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR',
} as const;

export const CreateUserSchema = z.object({
  id: z.uuid(),
  email: z.email(),
  role: z.enum(Role).default(Role.OPERATOR),
  tags: z.array(z.string().min(1)).min(1).meta({
    description: 'Kategori keyword atau sektor terkait',
  }),
  notes: z.string().max(500).nullable().optional(),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
```

### Discriminated Unions & Records

```typescript
const EventSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('created'), id: z.uuid() }),
  z.object({ kind: z.literal('deleted'), id: z.uuid(), reason: z.string() }),
]);

const MetricsRecordSchema = z.record(z.string(), z.number().nonnegative());
```

---

## Parsing & Zod v4 Error Helpers

Prefer `safeParse` at API boundaries and use top-level Zod v4 error formatters:

```typescript
const result = CreateUserSchema.safeParse(payload);

if (!result.success) {
  // Structured per-field error map for forms / API 400 responses
  const flat = z.flattenError(result.error);
  // Hierarchical tree for nested objects/arrays
  const tree = z.treeifyError(result.error);
  // Readable single-string summary for logs
  const readable = z.prettifyError(result.error);
  return { ok: false as const, flat, tree, readable };
}

const validData = result.data;
```

### Cross-Field & Super-Refinements

```typescript
const DateRangeSchema = z
  .object({
    startDate: z.iso.date(),
    endDate: z.iso.date(),
  })
  .superRefine((data, ctx) => {
    if (data.startDate > data.endDate) {
      ctx.addIssue({
        code: 'custom',
        path: ['endDate'],
        message: 'endDate must be on or after startDate',
      });
    }
  });
```

---

## Native JSON Schema & LLM Integration

Zod v4 emits standard JSON Schema natively via `z.toJSONSchema()`:

```typescript
import { z } from 'zod';

const ArticleSummarySchema = z.object({
  title: z.string().meta({ description: 'Judul ringkas peristiwa' }),
  isRelevant: z.boolean().meta({ description: 'Relevan atau tidak' }),
  confidence: z.number().min(0).max(1),
});

// Standard Draft-2020-12 JSON Schema directly from Zod
const jsonSchema = z.toJSONSchema(ArticleSummarySchema);

// For Gemini @google/genai, optionally attach Gemini's propertyOrdering:
const geminiSchema: Record<string, unknown> = {
  ...jsonSchema,
  propertyOrdering: ['title', 'isRelevant', 'confidence'],
};
```

> **Note:** When an LLM schema relies heavily on custom extensions (such as Gemini `propertyOrdering` + bilingual conditional rules), keep either a derived `z.toJSONSchema()` object augmented with `propertyOrdering` or an explicit JSON schema constant paired with a `LlmOutputSchema.safeParse()` + `.superRefine()` repair gate.

---

## Nuxt / Nitro H3 & Environment Validation

### Nitro API Route Validation

```typescript
import { z } from 'zod';

const QuerySchema = z.object({
  quarter: z.coerce.number().int().min(1).max(4).optional(),
  page: z.coerce.number().int().min(1).default(1),
});

export default defineEventHandler(async (event) => {
  const query = await getValidatedQuery(event, (raw) => QuerySchema.parse(raw));
  // Or readValidatedBody(event, (body) => BodySchema.parse(body))
  return { query };
});
```

### Runtime Environment Validation

```typescript
const EnvSchema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().int().default(3000),
  GEMINI_API_KEY: z.string().min(10).optional(),
});

export function parseEnv(raw: NodeJS.ProcessEnv) {
  const res = EnvSchema.safeParse(raw);
  if (!res.success) {
    throw new Error(`Invalid environment:\n${z.prettifyError(res.error)}`);
  }
  return res.data;
}
```

## Best Practices
- Co-locate shared request/response/LLM schemas (e.g., `shared/schemas/*.ts`) so frontend and backend infer exact types from one source of truth (`z.infer<typeof Schema>`).
- Handle empty HTML form inputs intentionally (`z.string().transform((v) => v === '' ? undefined : v).optional()`) instead of expecting `.optional()` to strip `""`.
- Avoid mutating `.partial()` blindly on create schemas when update endpoints have distinct nullable/immutable constraints; derive explicitly via `.pick()` or dedicated schemas.
- Always specify `path` inside `.refine()` / `.superRefine()` so UI forms and API diagnostics pinpoint the offending field.
