# API Security Worked Examples (Zod v4, H3/Drizzle & Express)

> Reference companion for `../SKILL.md`. Always align validation/DB code with the project's stack (e.g., Nuxt/Nitro H3 + Drizzle ORM + Zod v4, or Express/Fastify).

## 1. Boundary Request Validation with Zod v4

Use `z.email()`, `z.uuid()`, `z.flattenError()`, and typed ORM bindings (never string interpolation):

```typescript
import { z } from 'zod';
import { eq } from 'drizzle-orm';

export const CreateUserSchema = z.object({
  email: z.email({ error: 'Invalid email format' }),
  password: z
    .string()
    .min(12, { error: 'Password must be at least 12 characters' })
    .regex(/[A-Z]/, { error: 'Must contain uppercase letter' })
    .regex(/[a-z]/, { error: 'Must contain lowercase letter' })
    .regex(/[0-9]/, { error: 'Must contain number' }),
  name: z.string().trim().min(2).max(100),
});

// Nitro H3 example:
export default defineEventHandler(async (event) => {
  const raw = await readBody(event);
  const parsed = CreateUserSchema.safeParse(raw);
  if (!parsed.success) {
    throw createError({
      statusCode: 422,
      statusMessage: 'Validation failed',
      data: z.flattenError(parsed.error),
    });
  }
  // Never accept `role` or `ownerId` from unprivileged client body; derive from session!
  return await createAccountWithHashedPassword(parsed.data);
});
```

## 2. Parameterized Queries & Per-Resource Authorization (IDOR Defense)

```typescript
// BAD: string interpolation or trusting auth without ownership check
// await db.query(`SELECT * FROM users WHERE id = '${req.params.id}'`);

// GOOD (Drizzle ORM / SQL):
const idSchema = z.coerce.number().int().positive();
const articleId = idSchema.parse(getRouterParam(event, 'id'));

const [existing] = await db
  .select({ id: articles.id, ownerId: articles.createdBy })
  .from(articles)
  .where(eq(articles.id, articleId))
  .limit(1);

if (!existing) {
  throw createError({ statusCode: 404, statusMessage: 'Not found' });
}
if (existing.ownerId !== session.user.id && session.user.role !== 'ADMIN') {
  throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
}
```

## 3. Authentication & Token Pitfalls

- **JWT vs httpOnly Cookie Sessions:** Store browser admin sessions in HMAC-signed `httpOnly`, `secure`, `sameSite: 'lax'` cookies rather than `localStorage` tokens. For stateless API JWTs, enforce strong `>= 256-bit` secrets via env vars, validate `issuer` + `audience`, and store revocable refresh tokens server-side.
- **Timing-safe secret comparisons:** Compare webhook/cron/bearer secrets using fixed-length HMAC/SHA-256 digests + `crypto.timingSafeEqual` so timing side-channels cannot leak secret prefixes.
- **Safe HTML & download URLs:** Sanitize rich HTML with allowlist tags if raw HTML is unavoidable; verify download/citation URLs start strictly with `http://` or `https://` (`new URL(raw).protocol`) to reject `javascript:` or `data:` payloads.

## 4. Distributed Rate Limiting & Security Headers

When running more than one worker/serverless instance, back auth & expensive-export rate limiters with Redis/shared Postgres counters instead of per-process memory Maps:

```typescript
// Generic Express + Helmet header baseline (or Nitro routeRules headers):
// Content-Security-Policy: default-src 'self'; object-src 'none'; frame-ancestors 'none'
// Strict-Transport-Security: max-age=31536000; includeSubDomains
// X-Content-Type-Options: nosniff
// X-Frame-Options: DENY
```

- Strip `passwordHash`, reset tokens, and upstream API keys before returning JSON or logging errors.
- Map DB constraint errors (`23505` / `P2002`) to generic `409 Conflict` / `400` messages on the wire while logging structured diagnostics internally.

