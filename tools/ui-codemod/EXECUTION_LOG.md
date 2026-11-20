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




