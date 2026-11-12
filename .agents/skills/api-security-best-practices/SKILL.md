---
name: api-security-best-practices
description: "Implement secure API design patterns including authentication, authorization, input validation, rate limiting, and protection against common API vulnerabilities"
risk: unknown
source: community
date_added: "2026-02-27"
---

# API Security Best Practices

## Overview

Guide developers in building secure APIs by implementing authentication, authorization, input validation, rate limiting, and protection against common vulnerabilities. This skill covers security patterns for REST, GraphQL, and WebSocket APIs.

## When to Use This Skill

- Use when designing new API endpoints
- Use when securing existing APIs
- Use when implementing authentication and authorization
- Use when protecting against API attacks (injection, DDoS, etc.)
- Use when conducting API security reviews
- Use when preparing for security audits
- Use when implementing rate limiting and throttling
- Use when handling sensitive data in APIs

## How It Works

### Step 1: Authentication & Authorization

I'll help you implement secure authentication:
- Choose authentication method (JWT, OAuth 2.0, API keys)
- Implement token-based authentication
- Set up role-based access control (RBAC)
- Secure session management
- Implement multi-factor authentication (MFA)

### Step 2: Input Validation & Sanitization

Protect against injection attacks:
- Validate all input data
- Sanitize user inputs
- Use parameterized queries
- Implement request schema validation
- Prevent SQL injection, XSS, and command injection

### Step 3: Rate Limiting & Throttling

Prevent abuse and DDoS attacks:
- Implement rate limiting per user/IP
- Set up API throttling
- Configure request quotas
- Handle rate limit errors gracefully
- Monitor for suspicious activity

### Step 4: Data Protection

Secure sensitive data:
- Encrypt data in transit (HTTPS/TLS)
- Encrypt sensitive data at rest
- Implement proper error handling (no data leaks)
- Sanitize error messages
- Use secure headers

### Step 5: API Security Testing

Verify security implementation:
- Test authentication and authorization
- Perform penetration testing
- Check for common vulnerabilities (OWASP API Top 10)
- Validate input handling
- Test rate limiting


## Examples & Worked Code

Full Express, Nuxt/Nitro H3, Drizzle ORM, Zod v4, JWT/cookie session, rate-limiting, and security-header worked examples live in [`references/examples-and-patterns.md`](references/examples-and-patterns.md). Load that file when writing or auditing route handlers, schemas, or auth middleware:

- **Boundary validation (Zod v4):** `z.email()`, `z.uuid()`, `z.flattenError(parsed.error)`, rejecting with HTTP `422`.
- **Parameterized DB & IDOR checks:** ORM bindings only (never SQL interpolation) plus explicit resource-ownership/role checks on every read/mutation.
- **Sessions & tokens:** HMAC-signed `httpOnly`/`secure`/`sameSite` cookies (never `localStorage`), `>= 256-bit` env secrets, timing-safe secret comparisons (`crypto.timingSafeEqual`).
- **Response & URL hygiene:** Generic `4xx/5xx` payloads to clients (stack traces stay in server logs), strict `http(s):` URL validation, HTML sanitization if raw markup is unavoidable.
- **Distributed rate limiting:** Redis / shared Postgres counters when more than one worker/instance serves traffic.

## Best Practices

### ✅ Do This

- **Use HTTPS Everywhere** - Never send sensitive data over HTTP
- **Implement Authentication** - Require authentication for protected endpoints
- **Validate All Inputs** - Never trust user input
- **Use Parameterized Queries** - Prevent SQL injection
- **Implement Rate Limiting** - Protect against brute force and DDoS
- **Hash Passwords** - Use bcrypt with salt rounds >= 10
- **Use Short-Lived Tokens** - JWT access tokens should expire quickly
- **Implement CORS Properly** - Only allow trusted origins
- **Log Security Events** - Monitor for suspicious activity
- **Keep Dependencies Updated** - Regularly update packages
- **Use Security Headers** - Implement Helmet.js
- **Sanitize Error Messages** - Don't leak sensitive information

### ❌ Don't Do This

- **Don't Store Passwords in Plain Text** - Always hash passwords
- **Don't Use Weak Secrets** - Use strong, random JWT secrets
- **Don't Trust User Input** - Always validate and sanitize
- **Don't Expose Stack Traces** - Hide error details in production
- **Don't Use String Concatenation for SQL** - Use parameterized queries
- **Don't Store Sensitive Data in JWT** - JWTs are not encrypted
- **Don't Ignore Security Updates** - Update dependencies regularly
- **Don't Use Default Credentials** - Change all default passwords
- **Don't Disable CORS Completely** - Configure it properly instead
- **Don't Log Sensitive Data** - Sanitize logs

## Common Pitfalls

- **Hardcoded secrets:** Never commit JWT/session signing keys — require high-entropy env vars at startup (`process.env`).
- **Weak password policy & hashes:** Hash passwords with bcrypt (`>= 12` rounds), scrypt, or argon2id; reject short/common passwords at registration.
- **AuthN without AuthZ (IDOR):** Checking a valid session without verifying resource ownership or admin role lets authenticated users read/delete peers' records.
- **Verbose DB/internal errors:** Never leak ORM/PostgreSQL error strings (`error.message`) to API clients; log internals server-side and return generic `4xx/5xx` payloads.

See [`references/examples-and-patterns.md`](references/examples-and-patterns.md) for full code fixes.

## Security Checklist

### Authentication & Authorization
- [ ] Implement strong authentication (JWT, OAuth 2.0)
- [ ] Use HTTPS for all endpoints
- [ ] Hash passwords with bcrypt (salt rounds >= 10)
- [ ] Implement token expiration
- [ ] Add refresh token mechanism
- [ ] Verify user authorization for each request
- [ ] Implement role-based access control (RBAC)

### Input Validation
- [ ] Validate all user inputs
- [ ] Use parameterized queries or ORM
- [ ] Sanitize HTML content
- [ ] Validate file uploads
- [ ] Implement request schema validation
- [ ] Use allowlists, not blocklists

### Rate Limiting & DDoS Protection
- [ ] Implement rate limiting per user/IP
- [ ] Add stricter limits for auth endpoints
- [ ] Use Redis for distributed rate limiting
- [ ] Return proper rate limit headers
- [ ] Implement request throttling

### Data Protection
- [ ] Use HTTPS/TLS for all traffic
- [ ] Encrypt sensitive data at rest
- [ ] Don't store sensitive data in JWT
- [ ] Sanitize error messages
- [ ] Implement proper CORS configuration
- [ ] Use security headers (Helmet.js)

### Monitoring & Logging
- [ ] Log security events
- [ ] Monitor for suspicious activity
- [ ] Set up alerts for failed auth attempts
- [ ] Track API usage patterns
- [ ] Don't log sensitive data

## OWASP API Security Top 10

1. **Broken Object Level Authorization** - Always verify user can access resource
2. **Broken Authentication** - Implement strong authentication mechanisms
3. **Broken Object Property Level Authorization** - Validate which properties user can access
4. **Unrestricted Resource Consumption** - Implement rate limiting and quotas
5. **Broken Function Level Authorization** - Verify user role for each function
6. **Unrestricted Access to Sensitive Business Flows** - Protect critical workflows
7. **Server Side Request Forgery (SSRF)** - Validate and sanitize URLs
8. **Security Misconfiguration** - Use security best practices and headers
9. **Improper Inventory Management** - Document and secure all API endpoints
10. **Unsafe Consumption of APIs** - Validate data from third-party APIs

## Related Skills

- [`security-and-hardening`](../security-and-hardening/SKILL.md) - Threat modeling, OWASP Top 10 & LLM security controls, dependency audits
- [`auth-implementation-patterns`](../auth-implementation-patterns/SKILL.md) - Session cookies, JWT, RBAC, and timing-safe checks
- [`zod-validation-expert`](../zod-validation-expert/SKILL.md) - Zod v4 boundary schema validation & error flattening
- [`nodejs-backend-patterns`](../nodejs-backend-patterns/SKILL.md) - Middleware, error boundaries, and connection pooling
- [`observability-and-instrumentation`](../observability-and-instrumentation/SKILL.md) - Security audit logging & redacted telemetry
- Optional bank skills (`000 - SKILLS_cleaned/`): `sql-injection-testing`, `web-security-testing`, `backend-security-coder`

## Additional Resources

- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Node.js Security Checklist](https://blog.risingstack.com/node-js-security-checklist/)
- [API Security Checklist](https://github.com/shieldfy/API-Security-Checklist)

---

**Pro Tip:** Security is not a one-time task - regularly audit your APIs, keep dependencies updated, and stay informed about new vulnerabilities!

## Limitations
- Use this skill only when the task clearly matches the scope described above.
- Do not treat the output as a substitute for environment-specific validation, testing, or expert review.
- Stop and ask for clarification if required inputs, permissions, safety boundaries, or success criteria are missing.
