# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Analis PDRB (`editor`) & Admin Nerwilis (`admin`)** at Badan Pusat Statistik (BPS) Kabupaten Tana Tidung (Kode Wilayah 65.04, Kalimantan Utara): compile quarterly and annual PDRB indicators, verify AI-extracted economic phenomena against original news articles, adjust KBLI 2025 sectors and expenditure components, and export reconciliation workbooks.
- **Pimpinan / Pemeriksa (`viewer`)**: monitor quarterly economic coverage, sector dominance, pending verification backlogs, and verified phenomena summaries in read-only mode.
- **Usage Scene**: Predominantly bright institutional office workstations during daytime business hours (08:00-17:00 WITA), plus occasional late evening reconciliation sprints before provincial PDRB meetings, requiring crisp default daylight ergonomics with an optional dark workspace toggle.

## Product Purpose

**SIPENA-KTT** (*Sistem Informasi Fenomena Ekonomi dan Neraca Tana Tidung*) replaces fragmented manual media monitoring and spreadsheet compilation by ingesting regional Kalimantan Utara and scoped national news, structuring economic shocks with Google Gemini Flash into BPS KBLI (A-U) and PDRB Expenditure categories, supporting traceable human-in-the-loop curation, and exporting standardized multi-sheet Excel workbooks (`.xlsx`).

## Positioning

Purpose-built for Kabupaten Tana Tidung (`65.04`) regional accounts reconciliation: pairs side-by-side Indonesian regional media evidence and extracted numerical indicators directly with KBLI 17-sector and 8-code expenditure taxonomy, audit logs, and ready-to-reconcile Excel output.

## Operating Context

- **Monitored Sources**: Koran Kaltara, Radar Tarakan, Tribun Kaltara, Benuanta, Antara Kaltara, and filtered Media Nasional.
- **Scheduled Ingestion & AI Extraction**: Automated daily pipeline (`05:00` / `05:30 WITA`) plus manual trigger (`Ambil Berita Baru`) restricted to `admin` and `editor` roles.
- **Period Cadence**: Quarterly compilation (`Q1`, `Q2`, `Q3`, `Q4`) by fiscal year (`2024`, `2025`, `2026`).
- **Accessibility & Speed**: Keyboard-first analyst triage (`Ctrl/Cmd+K` search, `J`/`K` + `Enter` table navigation, `[A]` approve / `[R]` reject / `[Esc]` close inside review panel) with strict RBAC protection and session cookies over HTTPS (`sipena-ktt.caplinlab.my.id`).

## Capabilities and Constraints

- **Framework & Constraints**: Next.js 15 App Router (`output: "standalone"`), React 19, TypeScript 5.7, Tailwind CSS 3.4, TanStack Table v8, Drizzle ORM + PostgreSQL 16, ExcelJS. Strict CSP in `next.config.ts` forbids external `<link>` stylesheets, unapproved script origins, and untrusted `<img>` origins (`self`/`data:`/`blob:` only); fonts must use `next/font/google` and custom graphics must use inline SVG.
- **Three Core Surfaces**:
  1. Authenticated Gateway (`/login`): credential sign-in for Nerwilis staff and leadership.
  2. Executive Overview (`Ringkasan Eksekutif`): period metrics, KBLI 17-sector distribution matrix, expenditure component breakdown, and priority pending queue.
  3. Curation Table (`Tabel Kurasi & Verifikasi`) + Native `<dialog>` Side-by-Side Review Drawer + Excel Export Studio (`Pusat Ekspor Diseminasi`).
- **Hard Guardrails**: Retain all existing API contracts (`/api/auth/*`, `/api/stats`, `/api/phenomena/*`, `/api/cron/*`, `/api/export/excel`, `/api/health`), Drizzle queries, RBAC role gates (`viewer` read-only), and Zod schemas validated by Vitest.

## Brand Commitments

- Official institution identifier: **Badan Pusat Statistik Kabupaten Tana Tidung (`65.04`)**, Provinsi Kalimantan Utara.
- Bahasa Indonesia formal institutional voice across all labels, actions, empty states, and errors. Zero em dashes (`U+2014`), zero AI marketing hype, zero fabricated stats or testimonials.

## Evidence on Hand

- Live database-backed metrics, article feed, forensic `audit_logs`, KBLI (`A`–`R_S_T_U`), and Expenditure (`PK_RT`–`TIDAK_RELEVAN`) distributions served dynamically via SSR and REST APIs.
- Regional context grounded in verified workspace documentation ([`docs/prd.md`](docs/prd.md)): Sebawang governance center infrastructure, CPO/TBS palm oil, coal mining, aquaculture (`udang`/`bandeng`), municipal APBD disbursements, and river logistics (`Sesayap`/`Tarakan`).
- No external client logos, customer counts, or marketing testimonials exist; none may be invented.

## Product Principles

1. **Evidence Next to Judgment**: Analysts never verify a taxonomy code blindly; source text, original URL, and extracted quantities sit beside editing controls.
2. **Dense Without Clutter**: Scannable quarterly coverage and multi-row curation tables maximize information visibility without visual noise, glowing ornaments, or filler chrome.
3. **Daylight Clarity, Overtime Comfort**: Crisp high-contrast daylight surfaces lead by default, while a stateful Light/Dark toggle respects late-evening reconciliation work without style breakage.
4. **Honest Operational States**: Loading skeletons, filtered-empty explanations, permission notices for `viewer`, and retryable network errors leave no dead ends.
5. **Accountable Auditability**: Every keyboard shortcut, bulk approval, and manual override stays traceable to the authenticated BPS verifier.

## Accessibility & Inclusion

- Target WCAG 2.1 AA contrast (`>= 4.5:1` normal text, `>= 3:1` large text and active UI borders) in both Light and Dark themes.
- Native semantic controls (`<button>`, `<a href>`, `<dialog>`, `<table scope="col">`), visible `:focus-visible` outlines, non-color indicators alongside semantic colors, minimum responsive touch targets on mobile (`375px`), and zero horizontal page overflow.

