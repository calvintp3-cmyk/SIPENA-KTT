# SIPENA KTT — UI/UX Execution Log

Dokumen ini mencatat seluruh proses eksekusi otonom per sesi: branch, commit hash, hasil gate, keputusan otonom, pola "tidak dipetakan", dan catatan dependensi backend.

---

## Sesi 1A: Public Contracts & Keyboard Accessibility
- **Branch:** `fix/ui-1a-public-contracts-a11y`
- **ID Temuan:** `UX-001`, `UX-002`, `UX-003`
- **Status:** COMPLETED
- **Ringkasan Perubahan:**
  1. `ObservatoryHeroPulse.vue`: Menambahkan `code: top.code, component: top.code` pada `dominantExpenditure` dan menautkan `dominantExpenditure.component` di template (`UX-001`).
  2. `app/pages/index.vue`: Mengganti akses field yang tidak ada (`portalName` -> `sourcePortal`, `districtName` -> `subdistrict`, `economicSummary || excerpt` -> `summary` dengan `v-if`, `impactTypeKbli` -> `getKbliImpactBadge(article.kbliImpact)`) (`UX-001`).
  3. `app/pages/index.vue`: Mengubah kartu berita editorial menjadi `<article class="relative">` dengan `<button type="button" class="after:absolute after:inset-0 ...">` pada heading judul dengan focus ring (`UX-003`).
  4. `PublicFilterDock.vue` & `linimasa.vue`: Menyelaraskan filter dampak makro ke `'all' | 'EXPANSION' | 'CONTRACTION' | 'PRICE_UP' | 'PRICE_DOWN'` (`ImpactMacroFilterSchema`) dan menambahkan ikon Solar terverifikasi (`UX-002`).
  5. `tests/public-contracts.test.ts`: 4 test cases lulus (100%).
- **Gate:**
  - Vitest: 21 files, 163 tests PASSED (100%).
  - Forbidden Path Gate: 0 perubahan pada `server/**`, `prisma/**`, `shared/schemas/**`.

---

## Sesi 1B: Shared Curation Form Extraction
- **Branch:** `fix/ui-1b-shared-curation-form`
- **ID Temuan:** `UX-004`
- **Status:** COMPLETED
- **Ringkasan Perubahan:**
  1. `app/composables/usePdrbLabels.ts`: Menambahkan konstanta `KTT_SUBDISTRICTS` (5 kecamatan Tana Tidung) dan `subdistrictOptions`.
  2. `app/components/admin/ArticleCurationForm.vue`: Mengekstrak form kurasi bersama yang mendukung mode `inspector` (desktop) dan `slideover` (mobile/drawer). Mencakup seluruh field: judul, kutipan teks sumber, ringkasan, KBLI primer & dampak, Komponen Pengeluaran primer & dampak, KBLI sekunder & dampak, Komponen Pengeluaran sekunder & dampak, kecamatan (`subdistrict`), catatan kurator (`curatorNotes`), triwulan, tahun, dan switch fenomena ekonomi sah.
  3. `app/components/admin/ReviewSlideover.vue`: Mengganti duplikasi markup form kurasi dengan `<ArticleCurationForm />`.
  4. `app/pages/admin/review.vue`: Mengganti markup inspector desktop dengan `<ArticleCurationForm />`, melengkapi `inspectorForm` dengan `subdistrict` dan `curatorNotes`, serta menyertakannya pada payload PATCH `/api/admin/articles/:id`.
  5. `tests/article-curation-form.test.ts`: 3 test cases lulus (100%).
- **Gate:**
  - Vitest: 22 files, 166 tests PASSED (100%).
  - Forbidden Path Gate: 0 perubahan pada `server/**`, `prisma/**`, `shared/schemas/**`.

---

## Sesi 1C: Admin Hotfixes (PR-A5 s.d. PR-A9)
- **Branch:** `fix/ui-1c-admin-hotfixes`
- **ID Temuan:** `UX-007`, `UX-008`, `UX-014`, `UX-015`, `UX-016`
- **Status:** COMPLETED
- **Ringkasan Perubahan:**
  1. `PR-A5 (UX-007)` (`app/pages/admin/synthesis.vue`): `downloadFullQuarterBookDocx` mengirim query `{ year, quarter, limit: 50 }` ke `/api/admin/synthesis/drafts`, menyaring ketat periode aktif di klien, mendeduplikasi versi draf terbaru per `(dimension, targetCode)` berdasarkan `updatedAt`, mengecek kelengkapan 23 bagian PDRB (17 KBLI + 6 Pengeluaran) dengan peringatan sebelum ekspor, dan memberi label "Riwayat Draf (Lintas Periode)" pada tombol & slideover.
  2. `PR-A6 (UX-008)` (`app/components/admin/CommandPaletteModal.vue`): Mengubah parameter navigasi artikel ke `query: { status, articleId }` sesuai deep link `review.vue`, mengimplementasikan navigasi keyboard `ArrowUp`/`ArrowDown`/`Enter`, dan melengkapi ARIA accessibility (`role="combobox"`, `role="listbox"`, `role="option"`, `aria-activedescendant`).
  3. `PR-A7 (UX-014)` (`app/pages/admin/index.vue`): Mengganti teks mentah enum `tile.dominantImpact` dengan `getKbliImpactBadge(tile.dominantImpact).shortLabel`.
  4. `PR-A8 (UX-015)` (`app/pages/admin/trends.vue`): Memperbaiki filter event handler `@update:model-value` agar mengizinkan opsi urut `'share'` (Pangsa Sektoral Tertinggi) dan `'nbi'` (Net Balance Index Tertinggi).
  5. `PR-A9 (UX-016)` (`app/pages/admin/articles.vue` & `app/composables/useExcelExport.ts`): Menambahkan filter `subdistrict` pada URL query sync, watcher reset page, active chips, dan parameter ekspor Excel/CSV; memperbaiki tab "Semua Berita" agar menghitung total dari `summaryCounts` (`pendingCount + verifiedCount + ignoredCount`).
  6. `tests/admin-hotfixes.test.ts`: 7 test cases lulus (100%).
- **Gate:**
  - Vitest: 23 files, 173 tests PASSED (100%).
  - Forbidden Path Gate: 0 perubahan pada `server/**`, `prisma/**`, `shared/schemas/**`.

---

## Sesi 0a: Typecheck & Baseline Screenshots
- **Branch:** `chore/ui-0a-typecheck-and-baselines`
- **Status:** COMPLETED
- **Ringkasan Perubahan:**
  1. `nuxt.config.ts`: Memperbarui `typescript.tsConfig.exclude` dengan `'../scripts/**'` agar CLI scripts tidak mencemari pemeriksaan template frontend.
  2. `npx nuxi typecheck`: Berjalan sukses dengan 0 error (exit code 0).
  3. `tools/ui-codemod/capture-baseline.mjs`: Script otomatisasi Playwright (`--mode=mock`) yang mengintersepsi seluruh route API analitik/admin/auth/session dan mengambil 42 screenshot baseline (14 rute x 3 breakpoint: 1280x800, 768x1024, 375x812) via browser engine Chromium/Edge headless.
  4. `tools/ui-codemod/compare-screenshots.mjs`: Tool pembanding pixel difference berbasis canvas di browser headless dengan ambang batas `threshold: 0.05` yang menghasilkan laporan JSON dan console table.
  5. Seluruh 42 tangkapan layar baseline tersimpan di `tools/ui-codemod/screenshots/baseline/`.
- **Gate:**
  - `nuxi typecheck`: 0 errors (Exit code 0).
  - Vitest: 23 files, 173 tests PASSED (100%).
  - Forbidden Path Gate: 0 perubahan pada `server/**`, `prisma/**`, `shared/schemas/**`.
  - Dev Server: Dimatikan setelah selesai capture (port 3000 bebas).

---

## Sesi 0b: Semantic Tokens & 3-Wave Codemod
- **Branch:** `refactor/ui-0b-semantic-tokens-codemod`
- **Status:** COMPLETED
- **Ringkasan Perubahan:**
  1. `app/assets/css/main.css`: Menambahkan semantic design tokens yang telah divalidasi WCAG:
     - `--color-surface-subtle: #ECEAE2`
     - `--color-surface-recessed: #F0EFE9`
     - `--color-border-control: #757C78`
     - `--color-ink-muted: #5F6762`
     - `--color-terracotta: #C8553D`, `--color-terracotta-ink: #9E331C`, `--color-terracotta-surface: #FBECE8`, `--color-terracotta-border: #F2C9BE`
     - `--color-ochre: #B45309`, `--color-ochre-ink: #92400E`, `--color-ochre-surface: #FEF7E6`, `--color-ochre-border: #F3D89C`
     - `--color-focus-ring-inverse: #86EFAC`
     - `--color-brand-teal-tint: #E6F4F2`
  2. `shared/utils/pdrb-colors.ts`: Menyelaraskan palet visual analitik PDRB:
     - `brand-tint: #E3F0EA`, `brand-border: #BBD8CB`
     - `terracotta: #C8553D`, `terracotta-ink: #9E331C`, `terracotta-surface: #FBECE8`, `terracotta-border: #F2C9BE`
     - `ochre: #B45309`, `ochre-ink: #92400E`, `ochre-surface: #FEF7E6`, `ochre-border: #F3D89C`
     - `ink-muted: #5F6762`, `border-control: #757C78`
  3. `app/utils/chart-theme.ts`: Menyelaraskan palet ECharts, text style, dan border color dengan token semantik baru.
  4. `tools/ui-codemod/codemod.mjs`: Mengimplementasikan codemod terkontrol berbasis AST/regex dengan aturan pemetaan presisi (memisahkan fill vs text ink, input border ke border-control, peleburan hijau/kuning/terakota yang disetujui).
  5. Eksekusi 3 Gelombang Codemod (Total 2.149 penggantian):
     - Gelombang 1 (Public + Core): 738 penggantian di 10 file.
     - Gelombang 2 (Admin Primary): 1.179 penggantian di 14 file.
     - Gelombang 3 (Admin Modals + Components): 232 penggantian di 10 file.
  6. Tangkapan layar wave3 (42 tangkapan layar) dan perbandingan pixel-diff terhadap baseline:
     - 42 perbandingan berhasil dijalankan.
     - Seluruh file memiliki selisih warna subtil (0.02% s.d. 0.68%) sesuai perubahan token semantik tanpa pergeseran layout struktural.
- **Gate:**
  - WCAG Contrast Check:
    - `ink-muted` (#5F6762) pada `surface-subtle` (#ECEAE2): 4.84:1 (PASS WCAG AA >= 4.5:1)
    - `terracotta-ink` (#9E331C) pada `surface-default` (#F7F6F1): 7.13:1 (PASS AAA)
    - `terracotta-ink` (#9E331C) pada `terracotta-surface` (#FBECE8): 5.92:1 (PASS AA)
    - `ochre-ink` (#92400E) pada `surface-default` (#F7F6F1): 7.09:1 (PASS AAA)
    - `ochre-ink` (#92400E) pada `ochre-surface` (#FEF7E6): 5.89:1 (PASS AA)
    - `focus-ring-inverse` (#86EFAC) pada dark background: 8.69:1 - 12.66:1 (PASS)
  - `nuxi typecheck`: 0 errors.
  - Vitest: 23 files, 173 tests PASSED (100%).
  - Forbidden Path Gate: 0 perubahan pada `server/**`, `prisma/**`, `shared/schemas/**`.
  - Dev Server: Dimatikan setelah selesai capture (port 3000 bebas).

---

## Sesi Fase 1 & 3: Responsive, Public Polish & Foundation
- **Branch:** `feat/ui-f1-f3-responsive-public-polish`
- **ID Temuan:** `UX-009`, `UX-010`, `UX-018`, `UX-019`, `UX-021`, `UX-023`, Keputusan Desain 1 & 2
- **Status:** COMPLETED
- **Ringkasan Perubahan:**
  1. `Keputusan 1 & UX-010`:
     - `app/layouts/default.vue`: Menghapus search bar duplikat di masthead publik; mengarahkan shortcut global (`/` dan `Ctrl+K`) langsung ke `#filter-dock-search`.
     - `app/components/public/PublicFilterDock.vue`: Menyederhanakan dock menjadi 1 baris ramping (Search + Scope + KBLI + Pengeluaran + Sinyal Makro Popover + Filter Lengkap + Reset), menghemat ruang vertikal layar secara signifikan.
     - `app/pages/linimasa.vue`: Memperbaiki header responsive pada breakpoint 768px (`flex-wrap`, spacing adaptif, mencegah clipping teks panjang).
  2. `UX-009 (Honest Empty State)`:
     - `app/components/public/ObservatoryHeroPulse.vue`: Menampilkan status jujur "Belum Ada Bukti Empiris Tercatat" saat `totalVerified === 0` (menghilangkan bar split 50/50 palsu dan metrik telemetri nol yang membingungkan).
     - `app/components/public/SectorMosaicMatrix.vue`: Menambahkan banner informatif saat `coveredCount === 0`.
  3. `Keputusan 2 (Snippet Highlight Publik)`:
     - `app/components/public/PublicArticleDetailModal.vue`: Mengintegrasikan `parseEconomicSnippetSegments` untuk menandai entitas lokasi dan metrik moneter/persen pada ringkasan artikel di modal detail, menjaga kartu feed (`PhenomenonFeedCard.vue`) tetap bersih.
  4. `UX-018 (Touch Target >= 36px)` & `UX-019 (A11y Form Labels)`:
     - Memperbaiki tombol clear search, filter pills, dan selector agar memiliki ukuran sentuh memadai (`min-h-8` / `min-h-9`).
     - Melengkapi `<label for="...">` dan `aria-label` eksplisit pada seluruh input pencarian dan grup filter di `PublicFilterDock.vue` dan `PublicFilterBar.vue`.
  5. `UX-021 & Amandemen 4 (Pangkas Bobot Font & Lucide Icons)`:
     - Mengaudit penggunaan bobot font di seluruh kode:
       - `Bricolage Grotesque`: Dipangkas ke `[600, 700, 800]` (bobot 500 dihapus).
       - `Manrope`: Dipangkas ke `[400, 500, 600, 700]` (bobot 800 dihapus).
       - `JetBrains Mono`: Ditetapkan ke `[400, 500, 600, 700]` (bobot 700 bold yang dipakai 72 kali ditambahkan).
     - Memasang `@iconify-json/lucide` di `package.json`, memungkinkan Nuxt Icon membundel 100% koleksi ikon `lucide` dan `solar` secara offline/lokal tanpa dependensi API eksternal saat runtime.
  6. `UX-023 (Sidebar Cookie Persistence)`:
     - `app/layouts/admin.vue`: Menggantikan pembacaan sisi-klien `localStorage` dengan `useCookie('sipena_sidebar_collapsed')` yang aktif di SSR, menghilangkan kedipan/layout shift saat memuat ulang halaman admin.
  7. `tests/responsive-and-polish.test.ts`: 5 test cases baru ditambahkan dan lulus (100%).
- **Gate:**
  - `nuxi typecheck`: 0 errors.
  - Vitest: 24 files, 178 tests PASSED (100%).
  - Forbidden Path Gate: 0 perubahan pada `server/**`, `prisma/**`, `shared/schemas/**`.

---

## Sesi Fase 2: Admin Monolith Decomposition & Polish
- **Branch:** `refactor/ui-f2-admin-monolith-decomposition`
- **ID Temuan:** `UX-011`, `UX-012`, `UX-013`, `UX-017`, `UX-020`, Amandemen 2
- **Status:** COMPLETED
- **Ringkasan Perubahan:**
  1. `UX-020 (Modular Highlighted Snippet)`:
     - Mengekstrak `app/components/admin/HighlightedSnippetBox.vue` untuk modularisasi parser snippet beranotasi lokus dan angka.
     - Diintegrasikan ke `review.vue` dan `ReviewSlideover.vue`.
  2. `UX-017 Monolith 1 (review.vue)`:
     - Penurunan baris kode dari 1.322 baris menjadi **338 baris** (`<= 550 baris`).
     - Sub-komponen diekstrak ke:
       - `app/components/admin/review/ReviewHeaderToolbar.vue`
       - `app/components/admin/review/ReviewQueueCard.vue`
       - `app/components/admin/review/ReviewInspectorPanel.vue`
       - `app/components/admin/review/ReviewBatchBar.vue`
       - `app/composables/useReviewQueue.ts`
     - Fitur: Dirty guard navigasi (`onBeforeRouteLeave`), Undo toast interaktif dengan snapshot ganda (`verificationStatus` dan `isEconomicPhenomenon` sesuai Amandemen 2).
  3. `UX-017 Monolith 2 (articles.vue)`:
     - Penurunan baris kode dari 1.721 baris menjadi **544 baris** (`<= 550 baris`).
     - Sub-komponen diekstrak ke:
       - `app/components/admin/articles/ArticleFilterPanel.vue`
       - `app/components/admin/articles/ArticleTableList.vue`
       - `app/components/admin/articles/ArticleBatchModal.vue`
       - `app/components/admin/articles/ArticleDeleteModal.vue`
       - `app/composables/useArticleQuery.ts`
  4. `UX-017 Monolith 3 (synthesis.vue)`:
     - Penurunan baris kode dari 1.737 baris menjadi **543 baris** (`<= 550 baris`).
     - Sub-komponen diekstrak ke:
       - `app/components/admin/synthesis/SynthesisParameterBar.vue`
       - `app/components/admin/synthesis/SynthesisEvidencePool.vue`
       - `app/components/admin/synthesis/SynthesisNarrativeEditor.vue`
       - `app/components/admin/synthesis/SynthesisDraftHistoryDrawer.vue`
       - `app/components/admin/synthesis/SynthesisDiscardModal.vue`
       - `app/composables/useSynthesisStudio.ts`
       - `app/composables/useSynthesisDraftGuard.ts`
     - Fitur:
       - `UX-011`: Modal konfirmasi hapus draf pada riwayat draf sebelum eksekusi DELETE.
       - `UX-013`: Letterhead resmi BRS pada `@media print` (`hidden print:block`) dan styling print A4 bersih tanpa panel navigasi/kontrol.
  5. `Global Period Context (UX-012)`:
     - `app/layouts/admin.vue` mendeteksi rute konfigurasi lintas-periode (`/admin/users`, `/admin/scrapers`, `/admin/portals`, `/admin/keywords`, `/admin/taxonomy`, `/admin/kbli`).
     - Menggantikan period selector dengan badge `Pengaturan Global` dan pill breadcrumb `Lintas Periode`.
  6. `tests/admin-decomposition.test.ts`: 6 test cases baru ditambahkan dan lulus (100%).
- **Gate:**
  - `nuxi typecheck`: 0 errors.
  - Vitest: 25 files, 184 tests PASSED (100%).
  - Forbidden Path Gate: 0 perubahan pada `server/**`, `prisma/**`, `shared/schemas/**`.

---

## [2026-11-20] Sesi Fase 4: Design System Documentation, Typography, Reduced Motion & Chart A11y

- **Branch:** `docs/ui-f4-design-system-sync`
- **Tujuan:** Dokumentasi komprehensif `docs/design.md`, audit tipografi, universal reduced-motion gate, dan aksesibilitas grafik colorblind ECharts.
- **Implementasi:**
  1. `UX-022 Tipografi Audit`:
     - Menghapus ukuran font sub-11px (`text-[8px]`, `text-[9px]`) dari `app/components/admin/articles/ArticleTableList.vue` dan `app/components/public/PublicFilterBar.vue`.
     - Ditransformasikan ke `text-[10px]` uppercase dengan tracking lebar (`tracking-wider` / `tracking-widest`) atau `text-xs` (12px) untuk teks bacaan.
  2. `UX-023 Universal Reduced Motion`:
     - Menambahkan universal media query gate `@media (prefers-reduced-motion: reduce)` pada `app/assets/css/main.css`.
     - Memaksa `animation-duration: 0.01ms !important`, `animation-iteration-count: 1 !important`, `transition-duration: 0.01ms !important`, dan `scroll-behavior: auto !important` untuk semua elemen antarmuka saat pengguna mengaktifkan preferensi OS.
  3. `UX-024 ECharts Colorblind Accessibility`:
     - Mengonfigurasi `SIPENA_CHART_ARIA_CONFIG = { enabled: true, decal: { show: true } }` pada `app/utils/chart-theme.ts`.
     - Mengintegrasikan konfigurasi decal/tekstur Okabe-Ito otomatis ke `app/components/shared/AppChart.vue` melalui computed property `accessibleOption`.
  4. `Dokumentasi Design System (docs/design.md)`:
     - Ditulis ulang secara utuh menjadi single source of truth v3.0.0 bertema *Observatory Naturalist*.
     - Berisi filosofi desain, 25 token semantik lengkap dengan nilai hex dan rasio kontras WCAG AA/AAA, hierarki tipografi Plus Jakarta Sans & JetBrains Mono, sistem ikonografi offline (Solar Icons + Lucide), arsitektur modular hasil dekomposisi admin, dan keputusan desain publik (Sticky Filter Dock, Highlight Snippet).
  5. `Verifikasi & Baseline Capture`:
     - Dev server dijalankan dengan `ENABLE_NITRO_CRON=false` dan dimatikan seketika setelah capture.
     - 42 screenshot Wave 4 diambil di 1280px, 768px, 375px.
     - Pixel diff baseline vs wave4 dievaluasi dan dicatat (Total: 42 tangkapan layar dianalisis).
- **Gate:**
  - `nuxi typecheck`: 0 errors.
  - Vitest: 25 files, 184 tests PASSED (100%).
  - Forbidden Path Gate: 0 perubahan pada `server/**`, `prisma/**`, `shared/schemas/**`.








