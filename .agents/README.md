# Workspace Agent Skills (`.agents/`)

Struktur skill workspace menggunakan pola **Bank + Aktif** agar selaras dengan stack **SIPENA KTT** (Nuxt 3 `compatibilityVersion: 4`, Vue 3, `@nuxt/ui` v3 / Reka UI, Tailwind CSS v4, `echarts` / `vue-echarts`, `motion-v`, Nitro H3 + `scheduledTasks`, PostgreSQL + `drizzle-orm` / `drizzle-kit`, `zod` v4, `@google/genai`, `exceljs`, zero-dep TypeScript OOXML/PKZIP DOCX exporter, `vitest` v3, dan `vue-tsc`) tanpa membebani *context budget*:

- **`.agents/skills/<nama-skill>/`** — Berisi **57 skill inti aktif** (~10.28 MB, tidak termasuk `node_modules` runtime lokal Playwright) yang terdiri atas **56 skill terkurasi** dari bank + **1 skill custom workspace** ([`nuxt-ui-vue-echarts`](skills/nuxt-ui-vue-echarts/SKILL.md)).
- **[`000 - SKILLS_cleaned/`](../000%20-%20SKILLS_cleaned/CATALOG.md)** — Bank library berisi **169 skill terkurasi** (67.68 MB) lintas 8 kategori (`01-planning-architecture` s.d. `08-writing-copy-docs`). Skill React/Next.js/Shadcn tersimpan opsional di sini agar roster aktif fokus pada stack SIPENA KTT.

## Peta 57 Skill Aktif

| Kategori | Skill Aktif |
| :--- | :--- |
| **Planning & Architecture (7)** | `idea-refine`, `brainstorming`, `spec-driven-development`, `planning-and-task-breakdown`, `context-engineering`, `frontend-blueprint`, `architecture-patterns` |
| **UI/UX, Design System & Anti-Slop (17)** | `nuxt-ui-vue-echarts` *(custom)*, `ui-ux-pro-max`, `design-system`, `impeccable`, `frontend-design`, `frontend-ui-engineering`, `tailwind-patterns`, `responsive-design`, `kpi-dashboard-design`, `visual-critique`, `design-judge-qa`, `improve-ui`, `antislop-ui`, `antislop-human`, `antislop-layoutmobile`, `kill-ai-slop`, `web-design-guidelines` |
| **A11y, Performance & Metadata (5)** | `fixing-accessibility`, `wcag-audit-patterns`, `fixing-motion-performance`, `core-web-vitals`, `fixing-metadata` |
| **TS, Backend, API & PostgreSQL/Drizzle (10)** | `typescript-expert`, `nodejs-backend-patterns`, `api-and-interface-design`, `zod-validation-expert`, `error-handling-patterns`, `postgresql-table-design`, `sql-optimization-patterns`, `drizzle-orm-expert`, `drizzle-migration-conflict`, `auth-implementation-patterns` |
| **AI (Gemini/Multi-LLM), Scraping & Office Export (6)** | `gemini-api-integration`, `llm-routing-and-scraping`, `prompt-engineering-patterns`, `llm-evaluation`, `xlsx-export`, `docx-tools` |
| **Testing, Debugging & Quality Gates (7)** | `test-driven-development`, `vitest-skill`, `playwright-skill`, `browser-testing-with-devtools`, `code-review-and-quality`, `debugging-and-error-recovery`, `verification-before-completion` |
| **Security, Observability & Web Audit (5)** | `security-and-hardening`, `api-security-best-practices`, `secrets-management`, `observability-and-instrumentation`, `web-quality-audit` |

## Menambah atau Mengurangi Skill Aktif

- **Aktifkan skill tambahan dari bank**: salin folder skill dari `000 - SKILLS_cleaned/<kategori>/<nama-skill>/` ke `.agents/skills/<nama-skill>/`, pastikan `name:` pada frontmatter YAML sama dengan nama foldernya dan semua path/link internal valid.
- **Nonaktifkan skill**: hapus folder tersebut dari `.agents/skills/` (salinan utamanya tetap aman di `000 - SKILLS_cleaned/`, kecuali skill bespoke workspace seperti `nuxt-ui-vue-echarts`).
- **Sinkronisasi dokumentasi**: setelah mengubah roster, perbarui ringkasan ini serta kolom `Aktif Default` pada [`000 - SKILLS_cleaned/CATALOG.md`](../000%20-%20SKILLS_cleaned/CATALOG.md).
