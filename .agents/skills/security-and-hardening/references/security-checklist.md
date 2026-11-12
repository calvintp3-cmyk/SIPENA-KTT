# Security Checklist & Worked Patterns

> Local reference companion for `security-and-hardening` and `code-review-and-quality`. Pairs with [`hardening-patterns.md`](hardening-patterns.md).

## 1. Threat Modeling & Pre-Commit Check

- [ ] **Trust boundaries mapped:** Every HTTP body/query/header, file upload, webhook, fetched external HTML/RSS page, and LLM JSON output is parsed as untrusted data.
- [ ] **Authorization enforced per handler:** Both session authentication AND object/role ownership checks run on every mutation and admin/export endpoint (A01).
- [ ] **Stage scan clean before commit:** Verify zero credentials/keys in staged changes (`git diff --cached -i -G'password|secret|api_key|token' --name-only`).
- [ ] **Cookies & sessions hardened:** `httpOnly: true`, `secure: true` in HTTPS prod, `sameSite: 'lax'` or `'strict'`, secret loaded from environment (>= 32 random chars), bounded `maxAge`.

## 2. Security Headers & CORS Baseline

| Header / Control | Baseline Configuration |
| :--- | :--- |
| `Content-Security-Policy` | Start strict (`default-src 'self'; object-src 'none'; frame-ancestors 'none'`); allowlist fonts/CDNs explicitly |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` over HTTPS termination |
| `X-Content-Type-Options` | `nosniff` on all responses and downloads |
| `X-Frame-Options` | `DENY` or `SAMEORIGIN` (plus CSP `frame-ancestors`) |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `CORS` | Explicit allowlisted origins from config; never `*` with `credentials: true` |

## 3. Dependency Package Manager Matrix & Install-Script Gate

1. **Detect one authoritative boundary & manager:** Align `packageManager`, lockfile (`package-lock.json` / `pnpm-lock.yaml` / `yarn.lock`), and CI commands. Stop if competing lockfiles exist in the same package root.
2. **Gate lifecycle scripts before trusting new packages:**
   - **npm:** `npm ci --ignore-scripts` during untrusted inspection; inspect `preinstall`/`postinstall` in newly added packages before allowing execution.
   - **pnpm:** Configure `onlyBuiltDependencies` allowlist; verify frozen lockfile (`pnpm install --frozen-lockfile`).
   - **yarn (Berry):** `enableScripts: false` or selective `dependenciesMeta.*.built: false` + `--immutable`.
3. **Verify advisories & integrity:** Run `npm audit --omit=dev` (or `pnpm audit`), triage critical/high by reachability rather than blind `npm audit fix --force`, and inspect `npm audit signatures` where available.

## 4. Destructive Path Operations

Never delete, move, or overwrite paths derived from payloads, filenames, query parameters, or job configs with only a regex/depth shape check:

```typescript
import fs from 'node:fs/promises';
import path from 'node:path';

export async function safeDeleteOwnedExport(
  allowedRootInput: string,
  userTargetRelative: string,
  expectedOwnerId: string,
  readOwnerFromDb: (fileName: string) => Promise<string | null>,
): Promise<void> {
  // 1. Resolve symlinks on the allowlisted root
  const allowedRoot = await fs.realpath(allowedRootInput);

  // 2. Reject empty, traversal, or root-equivalent targets BEFORE resolving leaf
  const candidate = path.resolve(allowedRoot, userTargetRelative);
  const realCandidateParent = await fs.realpath(path.dirname(candidate));
  const resolvedTarget = path.join(realCandidateParent, path.basename(candidate));

  if (!resolvedTarget.startsWith(allowedRoot + path.sep)) {
    throw new Error(`Refused path outside root: ${resolvedTarget}`);
  }
  const relParts = path.relative(allowedRoot, resolvedTarget).split(path.sep).filter(Boolean);
  if (relParts.length < 1) {
    throw new Error('Refused operating on root directory itself');
  }

  // 3. Verify server-side ownership record (never self-attested marker inside writable folder)
  const recordedOwner = await readOwnerFromDb(path.basename(resolvedTarget));
  if (recordedOwner !== expectedOwnerId) {
    throw new Error(`Ownership mismatch for ${path.basename(resolvedTarget)}`);
  }

  await fs.rm(resolvedTarget, { force: false, recursive: false });
}
```

## 5. OWASP Top 10 (2021) Quick Reference

| ID | Category | Primary Mitigation |
| :--- | :--- | :--- |
| **A01** | Broken Access Control | Default-deny guards + per-resource ownership checks on server handlers |
| **A02** | Cryptographic Failures | TLS in transit, scrypt/argon2/bcrypt (>=12) hashes, env-stored secrets |
| **A03** | Injection | Drizzle/ORM parameterized bindings, Zod schema parsing, safe HTML encoding |
| **A04** | Insecure Design | 5-minute STRIDE threat model + abuse cases before coding |
| **A05** | Security Misconfiguration | Security headers, strict CORS, stack traces suppressed in client JSON |
| **A06** | Vulnerable Components | Lockfile audits + reachable CVE triage + install-script gating |
| **A07** | Auth & Session Failures | Timing-safe comparisons, bounded cookies, strict login rate limiting |
| **A08** | Software & Data Integrity | Locked CI installs, signed webhook/OAuth state (`state` CSRF nonces) |
| **A09** | Logging & Monitoring Failures | Structured security events with correlation IDs and redacted PII/keys |
| **A10** | SSRF | Scheme allowlist (`http`/`https`), DNS resolve all + block private/link-local IPs, disable auto-redirects on untrusted URLs |

## 6. OWASP Top 10 for LLM Applications (2025) Quick Reference

| ID | Risk | Code Control |
| :--- | :--- | :--- |
| **LLM01** | Prompt Injection | Frame fetched HTML/news as `<untrusted_data>`; enforce permissions in backend code |
| **LLM02** | Sensitive Info Disclosure | Never place env secrets, cookies, or unrelated user PII in prompts |
| **LLM03** | Supply Chain | Pin SDK versions (`@google/genai`), validate external model endpoints |
| **LLM05** | Improper Output Handling | Parse LLM JSON through strict Zod `safeParse`; encode before rendering DOM/DOCX/XLSX |
| **LLM06** | Excessive Agency | Restrict DB/shell tools behind explicit allowlists and server validation |
| **LLM07** | System Prompt Leakage | Treat system instructions as non-secret policy; security lives in server code |
| **LLM08** | Vector/Embedding Weakness | Validate & deduplicate ingested documents; isolate multi-tenant namespaces |
| **LLM10** | Unbounded Consumption | Enforce `maxOutputTokens`, request timeouts (`AbortSignal`), per-run call caps, and daily-quota circuit breakers |

