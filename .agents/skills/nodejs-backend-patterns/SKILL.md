---
name: nodejs-backend-patterns
description: Build production-ready Node.js backend services with Express/Fastify, implementing middleware patterns, error handling, authentication, database integration, and API design best practices. Use when creating Node.js servers, REST APIs, GraphQL backends, or microservices architectures.
---

# Node.js Backend Patterns

Comprehensive guidance for building scalable, maintainable, and production-ready Node.js backend applications with modern frameworks, architectural patterns, and best practices.

## When to Use This Skill

- Building REST APIs or GraphQL servers
- Creating microservices with Node.js
- Implementing authentication and authorization
- Designing scalable backend architectures
- Setting up middleware and error handling
- Integrating databases (SQL and NoSQL)
- Building real-time applications with WebSockets
- Implementing background job processing

## Detailed patterns and worked examples

Detailed pattern documentation lives in [`references/details.md`](references/details.md) (foundations: controllers, services, Zod validation, transactions) and [`references/advanced-patterns.md`](references/advanced-patterns.md) (structured logging, distributed rate limiting, graceful shutdown, health probes, timeouts). For Nuxt/Nitro H3 server routes, PM2 runtime env aliasing, and Drizzle `pg.Pool` singletons, pair with [`nuxt-ui-vue-echarts`](../nuxt-ui-vue-echarts/SKILL.md) and [`drizzle-orm-expert`](../drizzle-orm-expert/SKILL.md).

## Best Practices

1. **Use TypeScript**: Type safety prevents runtime errors
2. **Implement proper error handling**: Use custom error classes
3. **Validate input**: Use libraries like Zod or Joi
4. **Use environment variables**: Never hardcode secrets
5. **Implement logging**: Use structured logging (Pino, Winston)
6. **Add rate limiting**: Prevent abuse
7. **Use HTTPS**: Always in production
8. **Implement CORS properly**: Don't use `*` in production
9. **Use dependency injection**: Easier testing and maintenance
10. **Write tests**: Unit, integration, and E2E tests
11. **Handle graceful shutdown**: Clean up resources
12. **Use connection pooling**: For databases
13. **Implement health checks**: For monitoring
14. **Use compression**: Reduce response size
15. **Monitor performance**: Use APM tools

## Testing Patterns

See [`vitest-skill`](../vitest-skill/SKILL.md) and [`test-driven-development`](../test-driven-development/SKILL.md) (or optional bank skill `javascript-testing-patterns` in `000 - SKILLS_cleaned/`) for unit, H3 handler, and integration testing guidance.
