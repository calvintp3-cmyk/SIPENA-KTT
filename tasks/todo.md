# Todo Checklist: SIPENA KTT — Overhaul UI/UX "Super Modern Premium SaaS" (Sub-Proyek A)

Sumber Rencana: [tasks/plan.md](./plan.md) • Spec: [2026-11-11-sipena-saas-ui-overhaul-design.md](../docs/superpowers/specs/2026-11-11-sipena-saas-ui-overhaul-design.md)

## Phase 1: Foundation & Public Shell
- [x] **Task 1:** Pasang library (`motion-v`, `nuxt-echarts`, `echarts`, `vue-echarts`, `@iconify-json/solar`), setup font `Inter` tunggal, aktifkan View Transitions + `MotionConfig`, dan bangun design tokens *Cobalt–Emerald Luminous SaaS* di `main.css`
- [x] **Task 2:** Restyle komponen global di `app/app.config.ts`, tambah helper tema klaster warna di `usePdrbLabels.ts`, dan buat wrapper ECharts SSR-safe `app/components/shared/AppChart.vue`
- [x] **Task 3:** Rombak `app/layouts/default.vue` (Floating Glass Navbar, navigasi pill, status periode bebas mono, menu mobile) & sinkronkan `usePublicState.ts` ke `/linimasa`

### Checkpoint 1: Foundation & Public Shell
- [x] `npx nuxi prepare` dan `npx nuxt typecheck` lulus 0 error
- [x] `npm run build` sukses bersih

## Phase 2: Landing Page & Public View Portal
- [x] **Task 4:** Bangun Landing Page SaaS penuh di `app/pages/index.vue` (Hero gradient-glass, Live Snapshot API riil, Bento kapabilitas, preview 3 fenomena terbaru, redirect query lama ke `/linimasa`) + test helper
- [x] **Task 5:** Upgrade seluruh 5 komponen publik (`KpiSnapshotGrid`, `SectorDistributionCharts` ke ECharts bar & donut klik-filter, `PublicFilterBar` pakai `USelectMenu`, `PhenomenonFeedCard`, `PublicArticleDetailModal`)
- [x] **Task 6:** Buat halaman `/linimasa` (`app/pages/linimasa.vue`) lengkap dengan tagline baru, `USelect` tahun, pill triwulan, mode stream/tabel, dan filter aktif multi-warna

### Checkpoint 2: Public Experience
- [x] `npm test`, `npx nuxt typecheck`, dan `npm run build` lulus penuh
- [x] Scan Volar pada seluruh file Phase 1 & 2 = 0 diagnostik

## Phase 3: Login & Admin Workstation Overhaul
- [x] **Task 7:** Rombak `app/pages/login.vue` (Split Luminous Showcase), `app/layouts/admin.vue` (Collapsible SaaS Sidebar Rail, pil Cobalt–Emerald, Floating Header Bar), dan `CommandPaletteModal.vue`
- [x] **Task 8:** Upgrade `app/pages/admin/index.vue` (KPI + ECharts Gap vs Tercakup + Heatmap multi-warna) dan `app/pages/admin/trends.vue` (ECharts Bar + Area Trendline 8 triwulan interaktif)
- [x] **Task 9:** Upgrade workstation kurasi & sintesis (`review.vue`, `articles.vue`, `synthesis.vue`, `ReviewSlideover.vue`, `ManualArticleModal.vue`) termasuk `USelect`/`USelectMenu` & kelestarian cetak A4 BRS
- [x] **Task 10:** Upgrade manajemen sumber & kamus (`portals.vue`, `keywords.vue`, `taxonomy.vue`, `KeywordFormModal.vue`)
- [x] **Task 11:** Upgrade monitor sistem & akses tim (`scrapers.vue`, `users.vue`, `ScraperLogTable.vue`, `UserFormModal.vue`)

### Checkpoint 3: Admin Workstation Complete
- [x] Seluruh halaman & komponen admin (`app/pages/admin/*.vue`, `app/components/admin/*.vue`) bebas `<select>` mentah, bebas `font-mono`, dan `npx nuxt typecheck` (Volar) = 0 error

## Phase 4: Final Verification & Docs Sync
- [x] **Task 12:** Sinkronkan `docs/design.md` (v2.0.0), jalankan full verification (`npm test` 12 file / 62 test lulus, `npx nuxt typecheck` 0 error, `npm run build` exit 0, audit statis 38 file 0 temuan), serta uji visual, transisi SPA, zero overflow, ECharts `<canvas>`, dan font `Inter` di Chromium headless (`1440×900` & `375×812`) pada rute publik & login *(catatan: sesi terautentikasi `/admin/*` belum di-render live secara lokal karena PostgreSQL `127.0.0.1:5432` tidak berjalan di mesin lokal)*
