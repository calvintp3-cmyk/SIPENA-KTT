# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Analis PDRB (`editor`) & Admin Nerwilis (`admin`)** at Badan Pusat Statistik (BPS) Kabupaten Tana Tidung (Kode Wilayah 65.04, Kalimantan Utara): compile quarterly and annual PDRB indicators, verify AI-extracted economic phenomena against original news articles, adjust KBLI 2025 sectors and expenditure components, and export reconciliation workbooks.
- **Pimpinan / Pemeriksa (`viewer`)**: monitor quarterly economic coverage, sector dominance, pending verification backlogs, and verified phenomena summaries in read-only mode.
- **Usage Scene**: Bright modern office workstations and laptops during daytime compilation hours (08:00-17:00 WITA), requiring an airy, high-contrast Light-First SaaS interface with generous breathing room, soft surface layering, and effortless split-view reading comfort.

## Product Purpose

**SIPENA-KTT** (*Sistem Informasi Fenomena Ekonomi dan Neraca Tana Tidung*) replaces fragmented manual media monitoring and spreadsheet compilation by ingesting regional Kalimantan Utara and scoped national news, structuring economic shocks with Google Gemini Flash into BPS KBLI (A-U) and PDRB Expenditure categories, supporting traceable human-in-the-loop curation, and exporting standardized multi-sheet Excel workbooks (`.xlsx`).

## Positioning

A modern, high-craft Light-First SaaS curation workstation inspired by **Sapick Astro** and **SyncMaster Astro**: combines a clean top navigation bar, direct-to-curation workflow, borderless hairline list rows, pastel semantic status chips, and an inline split-view inspection panel so analysts can read, classify, and verify regional economic phenomena without modal fatigue or bureaucratic clutter.

## Operating Context

- **Monitored Sources**: Koran Kaltara, Radar Tarakan, Tribun Kaltara, Benuanta, Antara Kaltara, and filtered Media Nasional.
- **Scheduled Ingestion & AI Extraction**: Automated daily pipeline (`05:00` / `05:30 WITA`) plus manual trigger (`Tarik Berita`) restricted to `admin` and `editor` roles.
- **Period Cadence**: Quarterly compilation (`Q1`, `Q2`, `Q3`, `Q4`) by fiscal year (`2024`, `2025`, `2026`).
- **Accessibility & Speed**: Keyboard-first analyst triage (`Ctrl/Cmd+K` search, `J`/`K` row navigation, `[A]` approve / `[R]` reject inside the inspection pane) with strict RBAC protection and session cookies over HTTPS (`sipena-ktt.caplinlab.my.id`).

## Capabilities and Constraints

- **Framework & Constraints**: Next.js 15 App Router (`output: "standalone"`), React 19, TypeScript 5.7, Tailwind CSS 3.4, TanStack Table v8, Drizzle ORM + PostgreSQL 16, ExcelJS. Strict CSP in `next.config.ts` forbids external `<link>` stylesheets, unapproved script origins, and untrusted `<img>` origins (`self`/`data:`/`blob:` only); fonts must use `next/font/google` and custom graphics must use inline SVG.
- **Four Core Surfaces**:
  1. **Authenticated SaaS Gateway (`/login`)**: Crisp daylight canvas with a soft emerald-mint radial wash, centered modern `rounded-2xl` authentication card, `rounded-xl` inputs, and Obsidian Ink primary CTA.
  2. **Top Navigation Bar + Meja Kurasi Split-View (Default Landing Surface)**: Full-width top navigation bar (`Meja Kurasi`, `Ringkasan Analitik`, `Ekspor Excel`), interactive 4-stat metric strip, unified search/filter bar, SyncMaster-style clean phenomenon list on the left, and persistent side-by-side Split Inspection & Verification Panel on the right (with native `<dialog>` sheet fallback on smaller viewports).
  3. **Ringkasan Analitik (`Analytics Overview`)**: Sapick-inspired clean analytical cards with generous whitespace, interactive 17-sector KBLI proportion bars, PDRB Expenditure transmission matrix, and media source coverage.
  4. **Pusat Ekspor Excel (`Export Studio`)**: Streamlined parameter configurator, 3-sheet workbook specification cards, and clean live preview table.
- **Hard Guardrails**: Retain all existing API contracts (`/api/auth/*`, `/api/stats`, `/api/phenomena/*`, `/api/cron/*`, `/api/export/excel`, `/api/health`), Drizzle queries, RBAC role gates (`viewer` read-only), and Zod schemas validated by Vitest.

## Brand Commitments

- Official institution identifier: **Badan Pusat Statistik Kabupaten Tana Tidung (`65.04`)**, Provinsi Kalimantan Utara.
- Visual direction: **Sapick & SyncMaster Modern Light-First SaaS** (Pure White `#FFFFFF` + Soft Neutral `#F7F8FA` surfaces, Obsidian Ink `#0F172A` primary buttons, Forest Emerald `#059669` brand accent, and `rounded-xl` / `rounded-2xl` modern geometry).
- Bahasa Indonesia formal yet approachable SaaS copywriting across all labels, actions, empty states, and errors. Zero em dashes (`U+2014`), zero AI marketing hype, zero fabricated stats or testimonials.

## Evidence on Hand

- Live database-backed metrics, article feed, forensic `audit_logs`, KBLI (`A` to `R_S_T_U`), and Expenditure (`PK_RT` to `TIDAK_RELEVAN`) distributions served dynamically via SSR and REST APIs.
- Regional context grounded in verified workspace documentation ([`docs/prd.md`](docs/prd.md)): Sebawang governance center infrastructure, CPO/TBS palm oil, coal mining, aquaculture (`udang`/`bandeng`), municipal APBD disbursements, and river logistics (`Sesayap`/`Tarakan`).
- No external client logos, customer counts, or marketing testimonials exist; none may be invented.

## Product Principles

1. **Direct-to-Work Curation**: Signing in lands the analyst immediately on `Meja Kurasi` with an interactive metric strip and split-view reader so daily triage starts in zero extra clicks.
2. **Airy Surface Hierarchy Over Heavy Boxes**: Separation comes from pure white cards (`#FFFFFF`) over a soft neutral canvas (`#F7F8FA`), diffused low-contrast shadows, and `1px` hairlines (`#EEF0F4`), never heavy dark sidebars or thick gray borders.
3. **Geometric Numerals & Editorial Clarity**: `Plus Jakarta Sans` with `tabular-nums` renders headlines, prose summaries, and KPI numbers with modern SaaS warmth, reserving monospace strictly for keyboard shortcut keycaps.
4. **Honest Operational States**: Loading skeletons, filtered-empty explanations, permission notices for `viewer`, and retryable network errors leave no dead ends.
5. **Accountable Auditability**: Every keyboard shortcut, bulk approval, and manual override stays traceable to the authenticated BPS verifier.

## Accessibility & Inclusion

- Target WCAG 2.1 AA contrast (`>= 4.5:1` normal text, `>= 3:1` large text and active UI borders) across the Light-First SaaS palette.
- Native semantic controls (`<button>`, `<a href>`, `<dialog>`, `<search>`, `<table scope="col">`), visible `:focus-visible` outlines, non-color indicators alongside semantic pastel status chips, minimum `44px` responsive touch targets on mobile (`375px`), and zero horizontal page overflow.
