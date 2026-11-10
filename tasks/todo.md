# SIPENA-KTT — Detailed Implementation Task List (`tasks/todo.md`)

---

## Phase 1: Environment Foundation, Database Migration & Realistic KTT Seed

### Task 1: Install Production Dependencies & Verify Next.js 15 Build
**Description:** Menginstal seluruh dependensi (`node_modules`) pada workspace, menyiapkan template variabel lingkungan (`.env.example`), dan memastikan konfigurasi TypeScript serta Next.js 15 dapat dikompilasi tanpa eror.

**Acceptance criteria:**
- [x] `npm install` selesai tanpa konflik dependensi (`react 19`, `drizzle-orm`, `ai`, `exceljs`, `cheerio`, `zod`, `@tanstack/react-table`).
- [x] File `.env.example` tersedia dengan dokumentasi variabel `DATABASE_URL`, `GOOGLE_GENERATIVE_AI_API_KEY`, dan `CRON_SECRET`.
- [x] `npx tsc --noEmit` berjalan bersih tanpa *type error*.

**Verification:**
- [x] Typecheck passes: `npx tsc --noEmit`
- [x] Build succeeds: `npm run build`
- [ ] Manual check: Server dev menyala di `http://localhost:3000`.

**Dependencies:** None

**Files likely touched:**
- `package.json`
- `.env.example`
- `tsconfig.json`

**Estimated scope:** Small (2–3 files)

---

### Task 2: Database Migration Generation & Realistic Tana Tidung Seed Data
**Description:** Menghasilkan file migrasi SQL dari skema Drizzle (`src/db/schema.ts`), membuat fungsi utilitas query database, dan menulis skrip *seeder* (`src/db/seed.ts`) yang mengisi basis data dengan akun staf Nerwilis BPS serta 15+ sampel berita & fenomena ekonomi riil Kabupaten Tana Tidung (sektor sawit, konstruksi Bundaran Sebawang, batubara, angkutan speedboat Sesayap, dan APBD).

**Acceptance criteria:**
- [x] `npm run db:generate` menghasilkan DDL SQL yang valid di `src/db/migrations/` (termasuk 8 PostgreSQL `ENUM` dan 4 tabel utama beserta indeks).
- [x] Skrip `src/db/seed.ts` dapat dijalankan secara *idempotent* (tidak menduplikasi data jika dijalankan ulang) menggunakan `onConflictDoNothing()`.
- [x] Data seed mencakup seluruh variasi status (`pending`, `approved`, `rejected`), berbagai Kategori KBLI (`A`, `B`, `C`, `F`, `H`, `O`), dan Komponen Pengeluaran (`PK_RT`, `PK_P`, `PMTB`, `EKSPOR`).

**Verification:**
- [x] Migration generation succeeds: `npm run db:generate`
- [x] Seed script executes cleanly: `npx tsx src/db/seed.ts`
- [x] Manual check: Verifikasi isi tabel `articles`, `economic_phenomena`, dan `users` melalui query atau Drizzle Studio.

**Dependencies:** Task 1

**Files likely touched:**
- `src/db/migrations/*`
- `src/db/seed.ts`
- `src/db/queries.ts`
- `package.json`

**Estimated scope:** Medium (3–4 files)

---

### Checkpoint 1: Foundation & Database Ready
- [x] Seluruh paket npm terinstal dan `npm run build` sukses.
- [x] Skema PostgreSQL & data awal Kabupaten Tana Tidung siap diakses oleh aplikasi.
- [x] Review singkat sebelum masuk ke pembangunan UI & API utama.

---

## Phase 2: Institutional UI Shell, Executive Dashboard & Curation Data Grid

### Task 3: BPS Institutional App Shell, Command Header & Navigation Layout
**Description:** Membangun komponen layout utama (`src/components/dashboard/`) sesuai spesifikasi anti-slop di `docs/design-system.md`: Top Command Bar dengan identitas `BPS 65.04`, indikator *heartbeat* mesin cron, pemilih periode Triwulan/Tahun aktif, tombol *Quick Crawl*, dan navigasi antar-modul.

**Acceptance criteria:**
- [x] Header menampilkan status operasional scraper, jumlah antrean *Pending* secara dinamis, dan profil analis Nerwilis.
- [x] Pemilih periode (`Q1`–`Q4` dan Tahun `2024`–`2026`) tersinkronisasi dengan URL query params (`?quarter=Q1&year=2025`).
- [x] Kontras warna memenuhi standar WCAG AAA di atas palet *Deep Slate Canvas* (`#080C14`) dan *BPS Navy* (`#002B49`).

**Verification:**
- [x] Typecheck passes: `npx tsc --noEmit`
- [x] Build succeeds: `npm run build`
- [ ] Manual check: Navigasi antar tab dan pemilih periode triwulan merespons tanpa *layout shift* (menunggu akses VPS/DB aktif).

**Dependencies:** Task 2

**Files likely touched:**
- `src/components/dashboard/header.tsx`
- `src/components/dashboard/nav-tabs.tsx`
- `src/components/dashboard/period-selector.tsx`
- `src/app/layout.tsx`

**Estimated scope:** Medium (4 files)

---

### Task 4: Executive Dashboard Overview & KBLI / Expenditure Analytics
**Description:** Mengimplementasikan halaman utama Ringkasan Eksekutif (`src/app/page.tsx`) dan endpoint `GET /api/stats` yang menyajikan 4 Kartu KPI utama (Total Artikel Terindeks, Fenomena Ekonomi Terdeteksi, Antrean Menunggu Verifikasi, Fenomena Siap Rilis), grafik distribusi 17 Sektor KBLI, matriks Komponen Pengeluaran PDRB, dan daftar arus fenomena terbaru.

**Acceptance criteria:**
- [x] Endpoint `GET /api/stats?quarter=Q1&year=2025` mengembalikan agregasi akurat dari PostgreSQL (`COUNT`, `GROUP BY kbli_category`, `GROUP BY expenditure_component`).
- [x] Semua angka metrik menggunakan kelas `.tabular-nums` (`JetBrains Mono`) sehingga rata kanan/kiri secara presisi.
- [x] Klik pada kartu "Menunggu Verifikasi" atau item di arus terbaru langsung mengarahkan analis ke tabel kurasi atau membuka drawer verifikasi.

**Verification:**
- [ ] API test: `curl http://localhost:3000/api/stats?quarter=Q1&year=2025` mengembalikan HTTP 200 JSON valid (401 unauth terverifikasi; menunggu koneksi DB untuk HTTP 200 sesi login).
- [x] Build succeeds: `npm run build`
- [ ] Manual check: Kartu KPI dan bar distribusi KBLI menampilkan angka yang cocok dengan isi database.

**Dependencies:** Task 2, Task 3

**Files likely touched:**
- `src/app/api/stats/route.ts`
- `src/components/dashboard/metrics-cards.tsx`
- `src/components/dashboard/sector-distribution.tsx`
- `src/app/page.tsx`

**Estimated scope:** Medium (4 files)

---

### Task 5: High-Density Curation Data Table & Multi-Filter API (`GET /api/phenomena`)
**Description:** Membangun endpoint pencarian & pemfilteran `GET /api/phenomena` beserta komponen tabel berdensitas tinggi berbasis `@tanstack/react-table` (`src/components/phenomena/data-table.tsx`) yang mendukung filter Status (`pending`, `approved`, `rejected`), Kategori KBLI (`A`–`R_S_T_U`), Komponen Pengeluaran, Sumber Media, pencarian teks bebas, serta *checkbox* seleksi massal.

**Acceptance criteria:**
- [x] Endpoint `GET /api/phenomena` memvalidasi query parameter menggunakan `phenomenonQuerySchema` (Zod) dan mendukung paginasi.
- [x] Pencarian teks bebas memfilter judul berita, ringkasan narasi, maupun komoditas terdampak secara *case-insensitive* (`ILIKE`).
- [x] Baris tabel berdensitas tinggi (tinggi kompak, badge KBLI monospace, indikator arah dampak ▲ Positif / ▼ Negatif, dan tombol cepat *Review*).

**Verification:**
- [ ] API test: `GET /api/phenomena?status=pending&kbli_category=F` mengembalikan data terfilter dengan benar (menunggu koneksi DB aktif).
- [x] Build succeeds: `npm run build`
- [ ] Manual check: Filter dropdown, tombol status, dan kolom pencarian memperbarui isi tabel secara instan.

**Dependencies:** Task 2, Task 3

**Files likely touched:**
- `src/app/api/phenomena/route.ts`
- `src/components/phenomena/columns.tsx`
- `src/components/phenomena/data-table.tsx`
- `src/components/phenomena/status-badge.tsx`

**Estimated scope:** Medium (4 files)

---

### Checkpoint 2: Core Read Path & Dashboard Verified
- [ ] Ringkasan Eksekutif dan Tabel Kurasi menampilkan data dari PostgreSQL secara akurat (menunggu koneksi DB aktif).
- [x] Seluruh filter (Triwulan, Tahun, KBLI, Pengeluaran, Sumber Media, Status, Search) terimplementasi dan tervalidasi Zod.
- [x] Aplikasi lulus `npm run build`.

---

## Phase 3: Side-by-Side Review Drawer, Forensic Audit Logs & Role Access

### Task 6: Side-by-Side Human-in-the-Loop Review Drawer & Keyboard Shortcuts
**Description:** Membangun komponen *slide-over drawer* dua panel (`src/components/phenomena/review-modal.tsx`): panel kiri menampilkan teks lengkap artikel berita asli beserta metadata & tautan portal sumber; panel kanan menampilkan formulir ekstraksi AI yang dapat diedit langsung oleh analis BPS, dilengkapi pintasan keyboard (`[A]` Setujui, `[R]` Tolak, `[Esc]` Tutup).

**Acceptance criteria:**
- [x] Analis dapat mengedit teks Ringkasan Narasi, mengubah Kategori KBLI (A–U), Rincian Subsektor, Komponen Pengeluaran, Arah Dampak, Transmisi Harga/Volume, dan Catatan Verifikator.
- [x] Pintasan keyboard `[A]`, `[R]`, dan `[Esc]` aktif saat drawer terbuka (via native `<dialog>.showModal()`) dan otomatis nonaktif ketika kursor sedang mengetik di dalam `textarea` atau `input`.
- [x] Perubahan langsung memperbarui baris di tabel utama secara revalidasi tanpa *full page reload*.

**Verification:**
- [x] Typecheck passes: `npx tsc --noEmit`
- [x] Build succeeds: `npm run build`
- [ ] Manual check: Buka drawer dari baris tabel, ubah KBLI & ringkasan, tekan tombol Setujui / shortcut `[A]`, dan pastikan status berubah menjadi `Approved` (menunggu DB aktif).

**Dependencies:** Task 5

**Files likely touched:**
- `src/components/phenomena/review-modal.tsx`
- `src/components/phenomena/kbli-selector.tsx`

**Estimated scope:** Small (2 files)

---

### Task 7: Verification Mutation APIs (`PATCH /api/phenomena/[id]` & Batch) + Forensic Audit Trail
**Description:** Mengimplementasikan endpoint `PATCH /api/phenomena/[id]` dan `POST /api/phenomena/batch` dalam transaksi database (`db.transaction`) yang memperbarui status/klasifikasi fenomena sekaligus mencatat nilai sebelum (`previous_values`) dan sesudah (`new_values`) ke tabel `audit_logs`.

**Acceptance criteria:**
- [x] Setiap aksi `APPROVE`, `REJECT`, atau `EDIT` wajib berjalan di dalam transaksi PostgreSQL yang menyisipkan baris baru ke tabel `audit_logs`.
- [x] Endpoint `POST /api/phenomena/batch` memungkinkan analis memilih beberapa fenomena sekaligus di tabel dan menyetujui/menolaknya dalam satu klik.
- [x] Payload divalidasi ketat menggunakan `updatePhenomenonSchema` dan `batchVerificationSchema`.

**Verification:**
- [ ] API test: Kirim request `PATCH /api/phenomena/[id]` dan pastikan baris baru muncul di tabel `audit_logs` dengan `previous_values` dan `new_values` yang akurat (menunggu DB aktif).
- [x] Build succeeds: `npm run build` & `npm test` (validasi skema Zod lulus).
- [ ] Manual check: Uji tombol *Batch Approve* pada 2 baris tabel sekaligus (menunggu DB aktif).

**Dependencies:** Task 6

**Files likely touched:**
- `src/app/api/phenomena/[id]/route.ts`
- `src/app/api/phenomena/batch/route.ts`
- `src/lib/audit.ts`

**Estimated scope:** Medium (3 files)

---

### Checkpoint 3: Human-in-the-Loop Verification Complete
- [ ] Analis BPS dapat menelaah berita asli dan menyunting hasil ekstraksi AI secara berdampingan.
- [ ] Persetujuan tunggal maupun massal (*batch*) tercatat lengkap di `audit_logs`.

---

## Phase 4: Regional News Scraping Engine & Gemini Flash AI Extractor

### Task 8: Regional News Scraper Engine (5 Kaltara Portals + SHA-256 Deduplication)
**Description:** Membangun mesin web scraper modular di `src/lib/scrapers/` untuk **Koran Kaltara**, **Radar Tarakan**, **Tribun Kaltara**, **Benuanta**, dan **Antara Kaltara** beserta penyaring kata kunci untuk media nasional, lengkap dengan normalisasi URL kanonikal, *hashing* `SHA-256` (`url_hash`), *rate-limiting* (jeda antar request), dan pembersihan elemen iklan DOM.

**Acceptance criteria:**
- [x] Fungsi normalisasi URL menghapus query pelacak (`utm_*`, `fbclid`, dll.) termasuk saat query params hadir, dan menghasilkan `url_hash` SHA-256 64 karakter yang konsisten.
- [x] Sebelum melakukan *fetch* isi artikel penuh, scraper memeriksa `url_hash` di tabel `articles` sehingga artikel yang sudah pernah ditarik langsung dilewati (*zero duplicate scraping*).
- [x] Kegagalan pada satu portal berita (misal *timeout* 15 detik / redirect keluar domain allowlist) ditangkap dengan aman (`try/catch`), dicatat ke log, dan tidak menghentikan pemindaian portal lainnya.

**Verification:**
- [x] Unit test passes (`tests/url-hash.test.ts` & `tests/ssrf-and-scraper.test.ts`): normalisasi, SSRF domain allowlist, dan pembersihan DOM/RSS terverifikasi.
- [x] Build succeeds: `npm run build`

**Dependencies:** Task 2

**Files likely touched:**
- `src/lib/scrapers/base-scraper.ts`
- `src/lib/scrapers/koran-kaltara.ts`
- `src/lib/scrapers/radar-tarakan.ts`
- `src/lib/scrapers/tribun-kaltara.ts`
- `src/lib/scrapers/benuanta.ts`
- `src/lib/scrapers/antara-kaltara.ts`
- `src/lib/scrapers/index.ts`

**Estimated scope:** Large (6–7 modular files in `src/lib/scrapers/`)

---

### Task 9: Gemini Flash Structured Extraction Pipeline & Cron Endpoints / CLI Scripts
**Description:** Mengimplementasikan ekstraktor AI (`src/lib/ai/extract-phenomenon.ts`) menggunakan Vercel AI SDK (`generateObject`) + `@ai-sdk/google` (`gemini-3.8-flash`) dengan instruksi taksonomi baku BPS (17 KBLI 2025 & 8 Komponen Pengeluaran), serta menghubungkannya ke API Route `POST /api/cron/ingest`, `POST /api/cron/extract`, dan skrip CLI `scripts/cron-ingest.ts` & `scripts/cron-extract.ts`.

**Acceptance criteria:**
- [x] Prompt sistem memuat panduan spesifik konteks ekonomi Kabupaten Tana Tidung (Sawit/TBS, Batubara, Konstruksi Sebawang, Transportasi Sungai Sesayap, APBD KTT) agar klasifikasi KBLI dan Pengeluaran mencapai akurasi tinggi.
- [x] Jika Gemini menilai `is_economic_phenomenon = false`, entri otomatis diberi status `rejected` dengan catatan *"Auto-classified: Non-economic event"* dan artikel ditandai `is_processed = true`.
- [x] Endpoint `/api/cron/*` dilindungi autentikasi header `Authorization: Bearer <CRON_SECRET>` (atau dapat dipicu oleh analis/admin yang login; Viewer ditolak HTTP 403).

**Verification:**
- [ ] CLI test: `npm run cron:ingest` dan `npm run cron:extract` berjalan sukses dari terminal (menunggu DB aktif & `GOOGLE_GENERATIVE_AI_API_KEY`).
- [x] Unit tests (`tests/cron-auth.test.ts`, `tests/taxonomy-and-schemas.test.ts`) & `npm run build` lulus.
- [ ] Manual check: Klik tombol "Ambil Berita Baru" di Header Dashboard dan pastikan artikel baru diproses hingga muncul di tabel kurasi.

**Dependencies:** Task 8

**Files likely touched:**
- `src/lib/ai/prompts.ts`
- `src/lib/ai/extract-phenomenon.ts`
- `src/app/api/cron/ingest/route.ts`
- `src/app/api/cron/extract/route.ts`
- `scripts/cron-ingest.ts`
- `scripts/cron-extract.ts`

**Estimated scope:** Medium (6 files)

---

### Checkpoint 4: Automated Ingestion & AI Extraction Pipeline Verified
- [ ] Scraper berhasil menarik berita regional Kaltara tanpa duplikasi.
- [ ] Gemini Flash berhasil mengklasifikasikan berita menjadi fenomena ekonomi terstruktur sesuai skema Zod.

---

## Phase 5: BPS Diseminasi Excel Export Center (`.xlsx`)

### Task 10: ExcelJS Multi-Sheet Generator & Streaming Endpoint (`GET /api/export/excel`)
**Description:** Membangun modul `src/lib/export/excel-generator.ts` menggunakan `ExcelJS` dan route handler `GET /api/export/excel` yang mengekspor data fenomena terverifikasi ke dalam file `.xlsx` resmi BPS dengan 3 Sheet: (1) *Fenomena Lapangan Usaha (17 KBLI)*, (2) *Fenomena Komponen Pengeluaran*, dan (3) *Ringkasan Eksekutif & Statistik Berita*.

**Acceptance criteria:**
- [x] Header tabel Excel menggunakan warna korporat BPS Navy (`#003366`) dengan teks putih tebal, border sel tipis rapi, `wrapText: true` pada kolom narasi, sanitasi anti-formula injection (`CWE-1236`), dan lebar kolom proporsional.
- [x] Nama file unduhan otomatis mengikuti format `Fenomena_Ekonomi_KTT_[QUARTER]_[YEAR].xlsx` (contoh: `Fenomena_Ekonomi_KTT_Q1_2025.xlsx`).
- [x] Mendukung filter hanya data berstatus `approved` (default) atau seluruh data (`all`).

**Verification:**
- [x] Unit test passes (`tests/excel-generator.test.ts`): Memvalidasi struktur 3 sheet resmi dari buffer XLSX nyata dan proteksi *formula injection*.
- [x] Auth API check: `/api/export/excel` tanpa sesi login mengembalikan HTTP 401.
- [x] Build succeeds: `npm run build`
- [ ] Manual check: Unduh file `.xlsx` dari sesi login di UI dan periksa di Microsoft Excel (menunggu DB aktif).

**Dependencies:** Task 2, Task 5

**Files likely touched:**
- `src/lib/export/excel-generator.ts`
- `src/app/api/export/excel/route.ts`

**Estimated scope:** Small (2 files)

---

### Task 11: Excel Export Center UI & Live Pre-Download Preview Table
**Description:** Mengimplementasikan tab/halaman **Pusat Ekspor Diseminasi** (`src/components/export/`) yang memungkinkan analis memilih Tahun, Triwulan, cakupan status verifikasi, melihat pratinjau langsung (*live preview*) baris data yang akan masuk ke Excel, dan mengunduh file `.xlsx` dalam satu klik.

**Acceptance criteria:**
- [x] Analis dapat melihat ringkasan cakupan per sheet dan jumlah entri sebelum menekan tombol unduh.
- [x] Tabel pratinjau menampilkan sampel 10 baris sesuai filter Triwulan, Tahun, dan status yang dipilih.
- [x] Tombol unduh menampilkan indikator *loading* selama berkas `.xlsx` di-stream dari server.

**Verification:**
- [x] Typecheck passes: `npx tsc --noEmit`
- [x] Build succeeds: `npm run build`
- [ ] Manual check: Pilih Q1 2025 di UI Pusat Ekspor, periksa tabel pratinjau, dan klik "Unduh Berkas Excel" (menunggu DB aktif).

**Dependencies:** Task 10

**Files likely touched:**
- `src/components/export/export-center.tsx`
- `src/components/export/preview-table.tsx`

**Estimated scope:** Small (2 files)

---

### Checkpoint 5: Feature-Complete Application
- [x] Seluruh 4 modul utama (Scraper Cron, AI Extraction, Dashboard & Review Drawer, serta Excel Export Center) telah terintegrasi penuh di dalam aplikasi Next.js dan lulus kompilasi produksi.

---

## Phase 6: Security Hardening, Quality Audit & VPS Biznet GIO Deployment

### Task 12: Security Hardening, Input Sanitization & Production Readiness Audit
**Description:** Menerapkan standar keamanan dari skill `security-and-hardening`: pengaturan HTTP Security Headers di `next.config.ts` (`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `CSP`), rate limiter login, SSRF domain allowlist scraper, sanitasi tautan eksternal UI, Edge `src/middleware.ts`, serta proteksi sesi staf BPS.

**Acceptance criteria:**
- [x] Seluruh rute mutasi (`PATCH`, `POST`) tervalidasi oleh Zod dan menolak request tanpa otorisasi yang sah (`401 Unauthorized` / `403 Forbidden`).
- [x] `next.config.ts` mengaktifkan `output: "standalone"` dan HTTP security headers.
- [x] Tidak ada *secret key* atau file kunci SSH yang bocor ke dalam repositori Git (`git status` dan `.gitignore` bersih dari kredensial).

**Verification:**
- [x] Security check (live server `:3099`): `/` tanpa sesi mengembalikan `307 /login`; `/login` menyertakan HTTP security headers (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `CSP`); `/api/stats`, `/api/cron/ingest`, dan `/api/export/excel` tanpa token ditolak dengan HTTP 401.
- [x] Unit & contract suite passes: `npm test` (23/23 tests pass).
- [x] Build succeeds: `npm run build`

**Dependencies:** Task 7, Task 9, Task 11

**Files likely touched:**
- `next.config.ts`
- `src/middleware.ts`
- `src/lib/rate-limit.ts`
- `src/lib/session-token.ts`
- `src/app/api/health/route.ts`

**Estimated scope:** Medium (5 files)

---

### Task 13: VPS Ubuntu 24.04 (Biznet GIO) Provisioning, PM2, Nginx & Crontab Setup
**Description:** Menyiapkan skrip deployment otomatis (`deploy/setup-vps.sh`, `ecosystem.config.cjs`, `deploy/nginx-sipena.conf`, dan `docs/deployment-guide.md`) serta men-deploy aplikasi SIPENA-KTT ke server VPS Biznet GIO melalui koneksi SSH setelah akses VPS siap.

**Acceptance criteria:**
- [x] Konfigurasi PM2 (`ecosystem.config.cjs`), template Nginx reverse proxy (`deploy/nginx-sipena.conf`), skrip otomatis (`deploy/setup-vps.sh`), dan panduan (`docs/deployment-guide.md`) siap digunakan di `/var/www/sipena-ktt`.
- [ ] Aplikasi berjalan stabil di bawah supervisi PM2 (`pm2 status` = `online`) di port `3002` dan otomatis menyala saat VPS *reboot* (`pm2 startup` & `pm2 save`).
- [ ] Jadwal Linux `crontab` terdaftar di VPS untuk mengeksekusi `cron:ingest` (05:00 WITA) dan `cron:extract` (05:30 WITA) ke `/var/log/sipena/`.

**Verification:**
- [ ] Health check VPS: `curl http://127.0.0.1:3002/api/health` dan akses Nginx mengembalikan dashboard SIPENA-KTT.
- [ ] Cron test VPS: Uji eksekusi manual skrip cron di lingkungan produksi VPS.

**Dependencies:** Task 12

**Files likely touched:**
- `ecosystem.config.cjs`
- `deploy/nginx-sipena.conf`
- `deploy/setup-vps.sh`
- `docs/deployment-guide.md`

**Estimated scope:** Medium (4 files)

---

### Checkpoint 6: Final Production Sign-Off
- [x] Kode penuh Phase 1–6 selesai dikerjakan secara lokal, teruji Vitest & `next build`, dan siap di-*push* ke GitHub `calvintp3-cmyk/SIPENA-KTT`.
- [ ] Eksekusi deployment di VPS Biznet GIO (menunggu user selesai me-reset akses VPS dan menyuplai domain/Gemini API key produksi).

