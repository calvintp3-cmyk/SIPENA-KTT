# SIPENA-KTT — Task Tracking Checklist (`tasks/todo.md`)

## Phase 1–6: Core Platform Foundation & Initial Rollout (`Completed`)
- [x] **Task 1**: Project Scaffolding & Initial Design Token System
- [x] **Task 2**: BPS Taxonomy Constants & Domain Contracts (`17 KBLI` & `8 Pengeluaran`)
- [x] **Task 3**: Drizzle ORM PostgreSQL Schema & Seed Script
- [x] **Task 4**: Rule-Based Economic Classification & Deduplication Engine
- [x] **Task 5**: RSS/HTML Regional News Ingestion Service
- [x] **Task 6**: Authentication & RBAC Session Utility
- [x] **Task 7**: Phenomena CRUD, Verification, Manual Entry & Ingestion API Routes
- [x] **Task 8**: Multi-Sheet `.xlsx` Export Builder & API Endpoint
- [x] **Task 9**: Initial Authentication Login Page & Protected Layout Shell
- [x] **Task 10**: Initial Executive Overview & 17-KBLI Distribution Visualization
- [x] **Task 11**: Initial Curation Data Table, Filter Bar & Review Modal
- [x] **Task 12**: Initial Excel Export Center & Live Ingestion Drawer
- [x] **Task 13**: End-to-End Verification, Production Build & VPS Deployment (`https://sipena-ktt.caplinlab.my.id`)

---

## UI/UX Total Redesign — Sapick & SyncMaster Modern Light-First SaaS (Tahap 1–4)

### Tahap 1 (Phase 7): Design System Single Source of Truth & Token Foundation
- [x] **Task 14**: Synchronize Single Source of Truth (`PRODUCT.md`, `DESIGN.md`, `.impeccable/design.json`, `docs/design-system.md`) & Implement 3-Layer Light-First CSS Tokens (`tailwind.config.ts`, `src/app/globals.css`, `src/app/layout.tsx`, `src/components/theme-provider.tsx`, `src/components/brand-mark.tsx`, `src/lib/constants/taxonomy.ts`)

### Tahap 2 (Phase 8): Modern SaaS Authentication Gateway (`/login`)
- [x] **Task 15**: Redesign `/login` Page & Form (`src/app/(auth)/login/page.tsx`, `src/app/(auth)/login/login-form.tsx`) with Light-First Alabaster canvas, soft emerald-mint radial wash, `rounded-2xl` floating white card, `rounded-xl` inputs, post-interaction validation, and Obsidian Ink (`#0F172A`) CTA
- [x] **Checkpoint A**: Verified `npm run typecheck`, `npm test` (`23/23`), and headless Chrome screenshot inspection of `/login` at `1440x900` & `375x812`

### Tahap 3 (Phase 9): Top Navbar Shell & Direct-to-Curation Split-View Workbench (`Meja Kurasi`)
- [x] **Task 16**: Replace Left Sidebar with `64px` Sticky Top Navigation Bar (`src/components/dashboard/command-header.tsx`, `src/components/sipena-workspace.tsx`) & Set Default Landing View to `Meja Kurasi` (`activeTab = "feed"`)
- [x] **Task 17**: Build Interactive 4-Stat Metric Strip & SyncMaster-Style Clean Phenomenon List (`src/components/phenomena/curation-table.tsx`, `src/components/phenomena/status-badge.tsx`) with `rounded-xl` filter bar, hairline rows, and pastel status chips
- [x] **Task 18**: Build TellDesk-Style Inline Split Inspection & Verification Pane + Responsive `<dialog>` Sheet (`src/components/phenomena/review-modal.tsx`) with underline tabs (`Ringkasan & Klasifikasi`, `Teks Berita Asli`, `Riwayat Audit`) and `[A]` / `[R]` shortcuts

### Tahap 4 (Phase 10): Sapick-Style Analytics Overview, Export Studio & Production VPS Rollout
- [x] **Task 19**: Redesign `Ringkasan Analitik` (`src/components/dashboard/overview-panel.tsx`, `src/components/dashboard/metrics-cards.tsx`, `src/components/dashboard/sector-distribution.tsx`) with Sapick/BlazeX `rounded-2xl` white cards and clickable KBLI bars
- [x] **Task 20**: Redesign `Pusat Ekspor Excel` (`src/components/export/export-center.tsx`) with `rounded-2xl` configurator card, 3-sheet summary cards, and clean hairline preview table
- [x] **Task 21**: Verification & Deployment (`typecheck`, `23/23` Vitest, `next build`, GitHub `main`, PM2 VPS rollout `https://sipena-ktt.caplinlab.my.id`, headless Chrome desktop `1440x900` + mobile `375x812` authenticated audit, and `GET /api/export/excel` `.xlsx` binary check all passed)
