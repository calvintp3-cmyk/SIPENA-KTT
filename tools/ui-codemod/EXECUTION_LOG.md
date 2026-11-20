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






