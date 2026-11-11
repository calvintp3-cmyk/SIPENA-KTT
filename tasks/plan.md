# Implementation Plan: SIPENA KTT — Overhaul UI/UX "Super Modern Premium SaaS" (Sub-Proyek A)

## Overview
Merombak total lapisan antarmuka SIPENA KTT sesuai spesifikasi [2026-11-11-sipena-saas-ui-overhaul-design.md](file:///f:/18%20-%20SIPENA%20KTT/docs/superpowers/specs/2026-11-11-sipena-saas-ui-overhaul-design.md): sistem tema *Cobalt–Emerald Luminous SaaS* dengan spektrum warna multi-klaster, tipografi tunggal `Inter` + `tabular-nums` (bebas monospace), integrasi `motion-v` + `echarts` (`nuxt-echarts`) + `@iconify-json/solar`, transisi halaman halus (`View Transitions API` + Vue fallback), Landing Page baru di `/`, Public Portal `/linimasa` bertagline baru, Split Login Page modern, serta perombakan Sidebar, Header, dan seluruh 10 halaman & modal Admin Workstation.

## Dependency Graph & Ordering

```text
Task 1: Foundation (npm packages, nuxt.config, fonts, View Transitions, CSS tokens)
  │
  ├──▶ Task 2: Nuxt UI Theme & Shared Visual Helpers (app.config, usePdrbLabels, AppChart)
  │      │
  │      ├──▶ Task 3: Public Shell (default.vue floating header & footer, usePublicState)
  │      │      ├──▶ Task 4: Landing Page (/) & legacy redirect
  │      │      ├──▶ Task 5: Public Components (KPI, ECharts, FilterBar, FeedCard, DetailModal)
  │      │      │      └──▶ Task 6: Public Portal (/linimasa)
  │      │
  │      └──▶ Task 7: Split Login Page & Collapsible Modern Admin Shell (admin.vue, CommandPalette)
  │             ├──▶ Task 8: Admin Analytics (admin/index.vue, trends.vue + ECharts)
  │             ├──▶ Task 9: Admin Curation & Synthesis (review, articles, synthesis, slideover/modal)
  │             ├──▶ Task 10: Admin Sources & Taxonomy (portals, keywords, taxonomy, KeywordFormModal)
  │             └──▶ Task 11: Admin System & Access (scrapers, users, ScraperLogTable, UserFormModal)
  │
  └──▶ Task 12: Cross-Site QA, Docs Design Sync, Volar/Typecheck, & Responsive Browser Verification
```

## Architecture Decisions
- **ECharts via `nuxt-echarts` (`1.1.0` + `echarts@^6.1.0` + `vue-echarts@^8.3.0`)**: Dibungkus dalam komponen reusable `app/components/shared/AppChart.vue` menggunakan `<ClientOnly>` + height container tetap + skeleton agar bebas SSR hydration mismatch dan 0 CLS.
- **Motion via `motion-v/nuxt` (`2.12.0`)**: Dibungkus root `<MotionConfig reduced-motion="user">` di `app/app.vue` sehingga otomatis mematuhi preferensi aksesibilitas OS.
- **Icons via `@nuxt/icon` + `@iconify-json/solar` (`1.2.14`)**: Tetap memakai `provider: 'server'` di `nuxt.config.ts` agar seluruh ikon `i-solar-*` (duotone) dan `i-lucide-*` dibundel offline di Nitro server.
- **Transisi Halaman Hybrid**: `experimental.viewTransition: true` di `nuxt.config.ts` dipadukan global middleware `app/middleware/page-transition.global.ts` untuk menonaktifkan transisi Vue ganda pada browser Chromium yang mendukung `document.startViewTransition`, dan fallback ke `.page-*` / `.layout-*` CSS transitions di Firefox/Safari.
- **Penghapusan Total HTML `<select>` & `font-mono` UI**: Seluruh filter dropdown memakai `USelect` / `USelectMenu` Nuxt UI, dan seluruh kelas `font-mono` / `JetBrains Mono` dihilangkan serta diganti `Inter` + `.tabular-nums`.
- **Volar 3.3.14 Strict Lambda Rule**: Setiap mutasi state di event `@click` komponen `@nuxt/ui` dibungkus eksplisit `@click="() => { ...; }"` agar `TS2322` tidak muncul.

## Detailed Task Breakdown

### Task 1: Foundation — Dependensi UI, `nuxt.config.ts`, `MotionConfig`, Transisi, & CSS Tokens
- **Description:** Memasang library UI (`motion-v`, `nuxt-echarts`, `echarts`, `vue-echarts`, `@iconify-json/solar`), mengonfigurasi Google Font `Inter` tunggal, mengaktifkan modul + tree-shaking ECharts + View Transitions API di `nuxt.config.ts`, membungkus `app.vue` dengan `MotionConfig`, dan membangun design tokens *Cobalt–Emerald Luminous SaaS* di `app/assets/css/main.css`. (Awali dengan konsultasi `modern-web-guidance` untuk View Transitions & reduced motion.)
- **Acceptance criteria:**
  - [ ] Paket `motion-v`, `nuxt-echarts`, `echarts`, `vue-echarts`, `@iconify-json/solar` terpasang rapi di `package.json`.
  - [ ] `nuxt.config.ts` hanya memuat font `Inter` (tanpa `JetBrains Mono`), mendaftarkan `motion-v/nuxt` & `nuxt-echarts` tree-shaken, serta mengaktifkan `experimental.viewTransition` dan fallback `pageTransition`/`layoutTransition`.
  - [ ] `app/assets/css/main.css` mendefinisikan token Cobalt–Emerald, `.saas-card`, `.btn-primary-gradient`, `.page-enter-*`, dan aturan `@media (prefers-reduced-motion: reduce)`.
- **Verification:**
  - [ ] `npx nuxi prepare` & `npx nuxt typecheck` sukses tanpa error.
- **Dependencies:** None
- **Files likely touched:** `package.json`, `nuxt.config.ts`, `app/app.vue`, `app/middleware/page-transition.global.ts`, `app/assets/css/main.css`
- **Estimated scope:** Medium (5 files)

### Task 2: Tema Global `@nuxt/ui v3`, Helper Klaster Multi-Warna, & Komponen `AppChart.vue`
- **Description:** Memperbarui `app/app.config.ts` dengan styling terpusat `UCard`, `UButton`, `UBadge`, `UInput`, `USelect`, `USelectMenu`, dan `UTable`; memperkaya `app/composables/usePdrbLabels.ts` dengan helper spektrum 4 klaster KBLI & 6 pengeluaran; serta membuat `app/components/shared/AppChart.vue` sebagai pembungkus SSR-safe untuk ECharts.
- **Acceptance criteria:**
  - [ ] `app/app.config.ts` mengatur `primary: 'indigo'`, `secondary: 'emerald'`, dan slot komponen modern bebas warna abu datar lama.
  - [ ] `usePdrbLabels.ts` menyediakan `getKbliClusterTheme()` (4 klaster warna WCAG ≥ 4.5:1 mencakup seluruh 21 kode A–U) dan `getExpenditureTheme()` tanpa memutus ekspor lama.
  - [ ] `AppChart.vue` mendukung `option`, `heightClass`, `loading`, event `@chart-click`, dan aman saat SSR maupun data kosong.
- **Verification:**
  - [ ] Unit test helper klaster warna & `npx nuxt typecheck` lulus 0 error.
- **Dependencies:** Task 1
- **Files likely touched:** `app/app.config.ts`, `app/composables/usePdrbLabels.ts`, `app/components/shared/AppChart.vue`
- **Estimated scope:** Medium (3 files)

### Task 3: Floating Glass Header, Footer, & Shared State Portal Publik
- **Description:** Merombak `app/layouts/default.vue` menjadi *Floating Frosted Glass Navbar* modern dengan navigasi pill (`Beranda` `/`, `Linimasa` `/linimasa`, `Cara Kerja` `/#cara-kerja`), search bar terintegrasi khusus `/linimasa` (`⌘K`), status periode aktif bebas font mono, tombol gradien Cobalt–Emerald, serta slideover menu mobile; memperbarui `usePublicState.ts` agar sinkron dengan rute `/linimasa`.
- **Acceptance criteria:**
  - [ ] Header publik memiliki `view-transition-name: sipena-public-header`, zero `font-mono`, dan nav aktif jelas untuk `/` maupun `/linimasa`.
  - [ ] Shortcut `⌘K` hanya memfokuskan search input ketika berada di `/linimasa`.
  - [ ] Drawer/menu mobile rapi di viewport `375px` tanpa overflow.
- **Verification:**
  - [ ] `npx nuxt typecheck` lulus 0 error; Volar check bersih pada `default.vue`.
- **Dependencies:** Task 1, Task 2
- **Files likely touched:** `app/layouts/default.vue`, `app/composables/usePublicState.ts`
- **Estimated scope:** Small (2 files)

### Checkpoint: Foundation & Public Shell (After Tasks 1–3)
- [ ] `npx nuxt typecheck` dan `npm test` lulus
- [ ] `npm run build` berhasil membangun Nitro & client bundle dengan `motion-v` & `nuxt-echarts`

### Task 4: SaaS Landing Page di `/` & Kompatibilitas Redirect Query Lama
- **Description:** Mengganti `app/pages/index.vue` menjadi Landing Page SaaS penuh dengan Hero *Midnight Cobalt–Emerald Gradient Glass*, Live PDRB Snapshot Bento (mengambil data asli `/api/public/overview`, fallback jujur ke periode terisi terakhir atau state pre-verifikasi), strip metrik arsitektur taksonomi, Bento Grid 4 kapabilitas (`#cara-kerja` + ikon duotone Solar), preview hingga 3 artikel terverifikasi terkini dari `/api/public/articles?limit=3`, dan redirect query lama `/?year=...` ke `/linimasa`.
- **Acceptance criteria:**
  - [ ] Mengunjungi `/` menampilkan Landing Page utuh tanpa angka/statistik fiktif dan seluruh angka diambil dari API riil / konstanta taksonomi resmi.
  - [ ] Mengunjungi `/?year=2026&quarter=4` otomatis mengarahkan ke `/linimasa?year=2026&quarter=4`.
  - [ ] Animasi hero & bento mematuhi `MotionConfig reduced-motion="user"`.
- **Verification:**
  - [ ] Vitest helper uji & `npx nuxt typecheck` lulus; verifikasi Volar 0 error pada `index.vue`.
- **Dependencies:** Task 3
- **Files likely touched:** `app/pages/index.vue`, `tests/public-ui-helpers.test.ts`
- **Estimated scope:** Small (2 files)

### Task 5: Upgrade Komponen Public Portal (ECharts, FilterBar, FeedCard, KPI, Modal)
- **Description:** Memperbarui seluruh 5 komponen publik: mengganti chart HTML bar di `SectorDistributionCharts.vue` menjadi 2 chart interaktif ECharts (Bar KBLI multi-klaster + Donut 6 Pengeluaran klik-filter), memperkaya warna KPI di `KpiSnapshotGrid.vue` dengan ikon Solar, mengganti raw `<select>` dengan `USelectMenu` searchable di `PublicFilterBar.vue`, menyegarkan `PhenomenonFeedCard.vue` dengan aksen warna klaster kiri & bebas mono, serta menyelaraskan `PublicArticleDetailModal.vue`.
- **Acceptance criteria:**
  - [ ] Tidak ada lagi `<select>` HTML maupun kelas `font-mono` di seluruh `app/components/public/*`.
  - [ ] Klik bar KBLI atau segmen donut ECharts memancarkan event `update:kbli` / `update:expenditure` yang menyaring linimasa.
  - [ ] Semua tombol & badge kartu menjaga kontras teks ≥ 4.5:1.
- **Verification:**
  - [ ] `npx nuxt typecheck` & scan Volar pada 5 file komponen lulus 0 diagnostik.
- **Dependencies:** Task 2
- **Files likely touched:** `app/components/public/KpiSnapshotGrid.vue`, `app/components/public/SectorDistributionCharts.vue`, `app/components/public/PublicFilterBar.vue`, `app/components/public/PhenomenonFeedCard.vue`, `app/components/public/PublicArticleDetailModal.vue`
- **Estimated scope:** Medium (5 files)

### Task 6: Halaman Public View `/linimasa` dengan Tagline Baru & Kontrol Modern
- **Description:** Membangun `app/pages/linimasa.vue` yang mewarisi seluruh fitur query URL, pagination, Stream Timeline, Tabel Ringkas PDRB, dan drawer statistik dari logika publik existing, dengan header editorial modern bertagline baru (*"Rekam jejak dinamika sektor usaha, pergerakan harga, dan aktivitas ekonomi Kabupaten Tana Tidung secara terkurasi dan transparan."*), kontrol `USelect` tahun & pill triwulan, chip filter aktif multi-warna, dan nol font mono.
- **Acceptance criteria:**
  - [ ] `/linimasa` memuat semua query parameter URL, mode `stream`/`table`, drawer ECharts, modal detail, serta state kosong & alert error.
  - [ ] Tagline publik baru tampil jelas, tanpa `<select>` HTML bawaan maupun `font-mono`.
- **Verification:**
  - [ ] `npx nuxt typecheck` & Volar check bersih pada `linimasa.vue`.
- **Dependencies:** Task 3, Task 5
- **Files likely touched:** `app/pages/linimasa.vue`
- **Estimated scope:** Small (1 file)

### Checkpoint: Public Experience Complete (After Tasks 4–6)
- [ ] `npm test`, `npx nuxt typecheck`, dan `npm run build` lulus penuh
- [ ] Alur navigasi `/` ↔ `/linimasa` & filter query URL terverifikasi

### Task 7: Split Luminous Login Page & Collapsible Modern Admin Shell
- **Description:** Merombak `app/pages/login.vue` menjadi tata letak 2 kolom *Cobalt–Emerald Split Showcase* modern sambil mempertahankan 100% flow OAuth Google & `OAUTH_ERROR_MAP` + fallback password; merombak `app/layouts/admin.vue` menjadi *Collapsible Modern SaaS Sidebar Rail* (`w-64` ↔ `w-20`), item aktif pil Cobalt–Emerald berikon Solar, *Floating Glass Header Bar* dengan `USelect` tahun & kontrol triwulan modern, serta menyegarkan `CommandPaletteModal.vue`.
- **Acceptance criteria:**
  - [ ] Login desktop tampil 2 kolom seimbang dan mobile menempatkan tombol OAuth di atas lipatan.
  - [ ] Sidebar admin desktop dapat di-collapse/expand halus dengan tooltip saat ciut; tombol "Lihat Portal Publik" mengarah ke `/linimasa`.
  - [ ] Tidak ada `<select>` HTML atau `font-mono` di `login.vue`, `admin.vue`, maupun `CommandPaletteModal.vue`.
- **Verification:**
  - [ ] `npx nuxt typecheck` & Volar check lulus 0 error pada 3 file.
- **Dependencies:** Task 2
- **Files likely touched:** `app/pages/login.vue`, `app/layouts/admin.vue`, `app/components/admin/CommandPaletteModal.vue`
- **Estimated scope:** Medium (3 files)

### Task 8: Upgrade Visual & ECharts pada Dashboard & Trends Admin
- **Description:** Memperbarui `app/pages/admin/index.vue` (4 KPI berikon Solar berwarna + ECharts Ringkasan Ketercakupan 17 Sektor + heatmap Cobalt–Emerald + tile gap/tipis modern) dan `app/pages/admin/trends.vue` (menggantikan bar CSS manual dengan ECharts Bar + Area Trendline 8 triwulan interaktif dengan klik-navigasi triwulan).
- **Acceptance criteria:**
  - [ ] Kedua halaman bebas `<select>` HTML dan `font-mono`.
  - [ ] Klik batang/titik periode di grafik ECharts `trends.vue` memicu `setPeriod()` secara akurat, dan export Excel tetap bekerja.
- **Verification:**
  - [ ] `npx nuxt typecheck` & Volar check lulus 0 error pada kedua file.
- **Dependencies:** Task 2, Task 7
- **Files likely touched:** `app/pages/admin/index.vue`, `app/pages/admin/trends.vue`
- **Estimated scope:** Small (2 files)

### Task 9: Upgrade Workstation Kurasi, Bank Data, & Sintesis BRS
- **Description:** Menyelaraskan `review.vue`, `articles.vue`, `synthesis.vue`, `ReviewSlideover.vue`, dan `ManualArticleModal.vue` dengan token Cobalt–Emerald, tombol gradien modern, badge multi-warna, `USelect`/`USelectMenu`, dan `Inter + tabular-nums` — sambil menjaga penuh kontrak API, batch action, generator BRS AI, dan `@media print` sheet A4 di `synthesis.vue`.
- **Acceptance criteria:**
  - [ ] Seluruh kontrol select memakai `USelect`/`USelectMenu` Nuxt UI dan bebas `font-mono`.
  - [ ] Layout cetak `@media print` A4 di `synthesis.vue` tetap utuh dan bersih.
  - [ ] Semua modal/slideover mematuhi handler lambda `@click="() => { ...; }"` tanpa diagnostik Volar.
- **Verification:**
  - [ ] `npx nuxt typecheck` & Volar check lulus 0 error pada kelima file.
- **Dependencies:** Task 7
- **Files likely touched:** `app/pages/admin/review.vue`, `app/pages/admin/articles.vue`, `app/pages/admin/synthesis.vue`, `app/components/admin/ReviewSlideover.vue`, `app/components/admin/ManualArticleModal.vue`
- **Estimated scope:** Medium (5 files)

### Task 10: Upgrade Halaman Direktori Portal, Master Keyword, Taksonomi, & Modal Keyword
- **Description:** Menyelaraskan tampilan `portals.vue`, `keywords.vue`, `taxonomy.vue`, dan `KeywordFormModal.vue` dengan sistem kartu/badge Cobalt–Emerald multi-warna, ikon duotone Solar, `USelect`/`USelectMenu`, dan tipografi `Inter` tanpa mono.
- **Acceptance criteria:**
  - [ ] Seluruh KPI card, tabel, modal form keyword, dan 17×6 kamus taksonomi memakai sistem tema baru tanpa `<select>` mentah atau `font-mono`.
- **Verification:**
  - [ ] `npx nuxt typecheck` & Volar check lulus 0 error pada keempat file.
- **Dependencies:** Task 7
- **Files likely touched:** `app/pages/admin/portals.vue`, `app/pages/admin/keywords.vue`, `app/pages/admin/taxonomy.vue`, `app/components/admin/KeywordFormModal.vue`
- **Estimated scope:** Medium (4 files)

### Task 11: Upgrade Halaman Monitor Scraper, Kelola Akses, Tabel Log, & Modal User
- **Description:** Menyelaraskan `scrapers.vue`, `users.vue`, `ScraperLogTable.vue`, dan `UserFormModal.vue` dengan komponen SaaS modern, mode selector berbasis `USelect`, indikator status live scraping yang atraktif, RBAC badge berwarna, dan tipografi `Inter` + `tabular-nums`.
- **Acceptance criteria:**
  - [ ] Polling live status scraper, trigger manual & retry LLM, manajemen whitelist/RBAC, serta tabel log bekerja identik secara fungsional dengan tampilan baru.
  - [ ] Zero `<select>` HTML mentah dan zero `font-mono` pada keempat file.
- **Verification:**
  - [ ] `npx nuxt typecheck` & Volar check lulus 0 error pada keempat file.
- **Dependencies:** Task 7
- **Files likely touched:** `app/pages/admin/scrapers.vue`, `app/pages/admin/users.vue`, `app/components/admin/ScraperLogTable.vue`, `app/components/admin/UserFormModal.vue`
- **Estimated scope:** Medium (4 files)

### Checkpoint: Admin Workstation Complete (After Tasks 7–11)
- [ ] Seluruh 10 halaman admin + 6 komponen modal/tabel lulus Volar audit (`0` diagnostics), `npx nuxt typecheck`, dan `npm test`

### Task 12: Audit Menyeluruh, Browser Verification (`1440px` & `375px`), & Sinkronisasi Dokumentasi
- **Description:** Memperbarui `docs/design.md` agar sejalan dengan v2.0, memindai seluruh `app/` untuk memastikan nol sisa `JetBrains Mono` / `font-mono` / raw `<select>`, menjalankan suite test & production build, lalu menguji aplikasi running secara langsung lewat headless Chromium (memeriksa transisi `/`, `/linimasa`, `/login`, dan state SSR tanpa console error maupun horizontal overflow di desktop & mobile).
- **Acceptance criteria:**
  - [ ] Pemindaian grep `font-mono`, `JetBrains Mono`, dan raw `<select` di `app/` menghasilkan 0 kecocokan.
  - [ ] `npm test`, `npx nuxt typecheck`, `npm run build`, dan Volar scan seluruh `.vue` lulus bersih.
  - [ ] Verifikasi browser nyata (`1440px` & `375px`) mengonfirmasi tampilan, ECharts, kontras, dan nol console error.
- **Verification:**
  - [ ] `npm test; npx nuxt typecheck; npm run build` sukses exit code 0 + Playwright/DevTools screenshot & DOM checks lulus.
- **Dependencies:** Tasks 4, 6, 8, 9, 10, 11
- **Files likely touched:** `docs/design.md` (+ perbaikan minor bila temuan QA)
- **Estimated scope:** Small (1-2 files)

## Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Bentrokan antara Vue `pageTransition` dengan native browser View Transitions | High (kedipan / layar kosong saat navigasi) | Gunakan global route middleware `page-transition.global.ts` untuk menonaktifkan `pageTransition`/`layoutTransition` saat `document.startViewTransition` tersedia, dan jalankan fallback CSS hanya pada browser non-pendukung. |
| Error SSR ECharts (`window`/`canvas` undefined di Nitro) | High (SSR 500 error) | Bungkus `<VChart>` di dalam `<ClientOnly>` pada `AppChart.vue` dengan height eksplisit & skeleton fallback agar aman 100% di SSR maupun client. |
| Regresi Volar 3.3.14 (`TS2322`) akibat `@click` mengembalikan boolean | Med (error IDE saat typecheck/dev) | Wajibkan seluruh `@click` pada komponen `@nuxt/ui` memakai lambda void block `@click="() => { flag = val; }"` dan jalankan scan Volar di tiap checkpoint. |
| Penurunan kontras warna saat mengganti palet menjadi lebih berwarna | Med (teks sulit dibaca) | Terapkan pasangan token pastel terang (`-50`/`-100`) dengan teks gelap (`-800`/`-900`) serta tombol gradien berlatar cobalt-indigo gelap (`#2563EB`–`#4F46E5`) + teks putih murni. |

## Open Questions
- Tidak ada pertanyaan terbuka untuk Sub-proyek A; seluruh keputusan desain telah dikunci pada spesifikasi [2026-11-11-sipena-saas-ui-overhaul-design.md](file:///f:/18%20-%20SIPENA%20KTT/docs/superpowers/specs/2026-11-11-sipena-saas-ui-overhaul-design.md).

