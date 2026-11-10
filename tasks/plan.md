# Implementation Plan: SIPENA-KTT (Sistem Informasi Fenomena Ekonomi dan Neraca Tana Tidung)

## 1. Overview
Membangun aplikasi web **SIPENA-KTT** end-to-end berbasis **Next.js 15 (App Router)**, **TypeScript 5.7**, **PostgreSQL 16 + Drizzle ORM**, **Cheerio/Playwright Scraper**, **Vercel AI SDK + Google Gemini Flash**, dan **ExcelJS**, hingga siap operasional (*production-ready*) di server **VPS Ubuntu 24.04 (Biznet GIO)** untuk digunakan oleh Tim Nerwilis BPS Kabupaten Tana Tidung (Kode Wilayah: 65.04).

---

## 2. Architecture & Design Decisions
1. **Vertical Slicing Strategy**: Setiap fase menghasilkan fitur yang berjalan utuh dari basis data → API/Server Action → Antarmuka Pengguna (UI) → Verifikasi pengujian.
2. **Database & Seed Resilience**: Menggunakan PostgreSQL 16 dengan Drizzle ORM (`src/db/schema.ts`). Dilengkapi skrip *seed* data realistis Kabupaten Tana Tidung (fenomena kelapa sawit, konstruksi Bundaran Sebawang, transportasi speedboat Sesayap, tambang batubara, dan realisasi APBD) agar aplikasi dapat langsung diuji secara visual dan fungsional oleh pegawai kantor sejak hari pertama.
3. **Anti-Slop Institutional UI**: Menggunakan palet resmi BPS (*Deep Slate Canvas* `#080C14`, *BPS Navy* `#002B49`, *Sky Blue* `#0284C7`) dengan tipografi tabular monospace (`JetBrains Mono` `tabular-nums`), kontras WCAG AAA, dan *Side-by-Side Review Drawer* berkecepatan tinggi dengan pintasan keyboard (`[A]` Setujui, `[R]` Tolak, `[Esc]` Tutup).
4. **Hybrid Web Scraper Engine**: Mengutamakan **Cheerio + Fetch** dengan *canonical URL SHA-256 deduplication* untuk kecepatan dan efisiensi RAM pada 5 portal berita lokal (Radar Tarakan, Koran Kaltara, Tribun Kaltara, Benuanta, Antara Kaltara), disertai mekanisme *fallback* dan *rate-limiting* yang sopan.
5. **Structured LLM Output**: Menggunakan Vercel AI SDK (`generateObject`) dengan skema **Zod** (`phenomenonExtractionSchema`) yang memaksa Google Gemini Flash mengembalikan klasifikasi KBLI 2025 (17 Kategori A–U) dan Komponen Pengeluaran PDRB (`PK_RT`, `PK_LNPRT`, `PK_P`, `PMTB`, `PI`, `EKSPOR`, `IMPOR`) secara deterministik.
6. **Forensic Audit Trail & RBAC**: Setiap perubahan status atau penyuntingan narasi fenomena oleh staf BPS tercatat otomatis di tabel `audit_logs` beserta identitas pemeriksa (`verified_by`) dan waktu verifikasi (`verified_at`).
7. **VPS Production Architecture**: Dideploy ke VPS Ubuntu 24.04 menggunakan **PM2** (mode standalone/cluster), **Nginx Reverse Proxy** + SSL Let's Encrypt, serta penjadwalan **Linux Crontab** terisolasi pada pukul 05:00 WITA (Ingestion) dan 05:30 WITA (AI Extraction).

---

## 3. Dependency Graph

```text
[Phase 1: Foundation, Dependencies & Database Seed]
        │
        ├──► [Phase 2: Core UI Shell, Executive Dashboard & Interactive Curation Table]
        │             │
        │             └──► [Phase 3: Side-by-Side Review Drawer, Audit Trail & Auth/RBAC]
        │
        ├──► [Phase 4: Regional News Scraper Engine & AI Extraction Pipeline (Gemini Flash)]
        │             │
        │             └──► [Phase 5: Diseminasi Excel Export Center (.xlsx BPS Standard)]
        │
        └──► [Phase 6: Security Hardening, E2E Verification & VPS Biznet GIO Deployment]
```

---

## 4. Phase & Task Index (Tracked in `tasks/todo.md`)

### Phase 1: Environment Foundation, Database Migration & Realistic KTT Seed
- [ ] **Task 1**: Instalasi dependensi produksi, konfigurasi environment, dan verifikasi kompilasi TypeScript/Next.js.
- [ ] **Task 2**: Pembuatan migrasi Drizzle ORM, helper query database, dan skrip *seed* data realistis PDRB Kabupaten Tana Tidung (`src/db/seed.ts`).
- **Checkpoint 1**: Basis data terhubung, migrasi & seed berhasil dijalankan, dan `npm run build` sukses tanpa eror.

### Phase 2: Institutional UI Shell, Executive Dashboard & Curation Data Grid
- [ ] **Task 3**: Implementasi App Shell BPS (Header Command Center, Status Heartbeat Cron, Navigasi Tab, dan Indikator Periode Triwulan).
- [ ] **Task 4**: Implementasi halaman **Ringkasan Eksekutif (Dashboard Overview)** dengan 4 Kartu KPI, Matriks Distribusi 17 Sektor KBLI, dan Agregasi Komponen Pengeluaran.
- [ ] **Task 5**: Implementasi **Tabel Kurasi & Verifikasi (Feed Curation Table)** berdensitas tinggi menggunakan TanStack Table + API Route `GET /api/phenomena` dengan filter multi-kriteria.
- **Checkpoint 2**: Dashboard dan tabel kurasi menampilkan data real dari PostgreSQL dengan filter instan yang berfungsi penuh.

### Phase 3: Side-by-Side Review Drawer, Forensic Audit Logs & Role Access
- [ ] **Task 6**: Implementasi **Side-by-Side Review Drawer** (Panel kiri: bukti artikel asli; Panel kanan: form edit KBLI, Pengeluaran, Dampak, Ringkasan, dan pintasan keyboard `[A]`/`[R]`/`[Esc]`).
- [ ] **Task 7**: Implementasi API `PATCH /api/phenomena/[id]` & `POST /api/phenomena/batch` terintegrasi pencatatan otomatis ke tabel `audit_logs` serta proteksi sesi/peran analis BPS.
- **Checkpoint 3**: Siklus *Human-in-the-Loop* berfungsi dari hulu ke hilir (klik baris → edit di drawer → setujui/tolak → tercatat di `audit_logs`).

### Phase 4: Regional News Scraping Engine & Gemini Flash AI Extractor
- [ ] **Task 8**: Implementasi modul scraper berita regional Kaltara (`src/lib/scrapers/`) untuk Koran Kaltara, Radar Tarakan, Tribun Kaltara, Benuanta, dan Antara Kaltara dengan deduplikasi SHA-256 (`url_hash`).
- [ ] **Task 9**: Implementasi pipeline ekstraksi AI (`src/lib/ai/extract-phenomenon.ts`) menggunakan Vercel AI SDK + Google Gemini Flash dan endpoint `POST /api/cron/ingest` & `POST /api/cron/extract` + skrip CLI `scripts/cron-*.ts`.
- **Checkpoint 4**: Eksekusi scraper dan ekstraktor AI berhasil menarik berita baru, memfilter berita non-ekonomi, dan menyimpan fenomena ekonomi ke basis data.

### Phase 5: BPS Diseminasi Excel Export Center (`.xlsx`)
- [ ] **Task 10**: Implementasi generator spreadsheet `ExcelJS` (`src/lib/export/excel-generator.ts`) dan endpoint `GET /api/export/excel` (Multi-sheet: Lapangan Usaha KBLI, Komponen Pengeluaran, dan Ringkasan Eksekutif).
- [ ] **Task 11**: Implementasi antarmuka **Pusat Ekspor Diseminasi** dengan pratinjau langsung (*live preview table*) sebelum unduh.
- **Checkpoint 5**: File `.xlsx` berhasil diunduh dan terbuka rapi di Microsoft Excel sesuai format standar rekonsiliasi PDRB BPS.

### Phase 6: Security Hardening, E2E Testing & VPS Biznet GIO Deployment
- [ ] **Task 12**: Hardening keamanan (Security Headers, Rate Limiting API, validasi input Zod ketat, dan sanitasi output LLM) serta pengujian otomatis.
- [ ] **Task 13**: Provisioning & Deployment ke VPS Ubuntu 24.04 Biznet GIO (Konfigurasi SSH Key, PostgreSQL 16, PM2, Nginx Reverse Proxy + SSL, dan penjadwalan Linux Crontab harian).
- **Checkpoint 6 (Final Release)**: Aplikasi live di VPS, cron harian berjalan otomatis, dan siap digunakan oleh staf BPS Kabupaten Tana Tidung.

---

## 5. Risks and Mitigations

| Risk | Impact | Mitigation Strategy |
| :--- | :--- | :--- |
| **Perubahan struktur DOM / Anti-bot pada portal berita lokal** | Medium | Gunakan kombinasi RSS Feed / WP REST API (`/wp-json/wp/v2/posts` untuk portal berbasis WordPress seperti Benuanta/Koran Kaltara) sebelum fallback ke HTML DOM parser & Playwright. |
| **Kuota / Rate Limit Google Gemini Flash API** | Medium | Batasi konkurensi ekstraksi maksimal 3 artikel paralel dengan *exponential backoff retry* dan lewati artikel duplikat menggunakan `url_hash` sebelum memanggil LLM. |
| **Kredensial SSH (`ssh key baru.txt`) hanya berisi Public Key** | High | File `ssh key baru.txt` berisi *public key* (`ssh-ed25519 AAAAC3... key_baru`). Untuk koneksi SSH dari lokal ke VPS diperlukan pasangan *private key*-nya serta detail IP/Host & username VPS. |
| **Koneksi Database Lambat saat Data > 50.000 baris** | Low | Seluruh kolom filter (`status`, `year`, `quarter`, `kbli_category`, `expenditure_component`, `url_hash`) telah dipasangi B-Tree Index pada skema Drizzle. |

---

## 6. Open Questions & Confirmation Needed from User
1. **Pasangan Private Key & Detail VPS**: File `ssh key baru.txt` yang dilampirkan saat ini berisi **Public Key** (`ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIL0N+PbYpBolAtK5ny0QMBWB2NbuhseSuqsW+Dv9KhDd key_baru`). Untuk melakukan koneksi SSH ke VPS saat tahap deployment nanti:
   - Berapa **IP Address / Domain** dan **Username** VPS Biznet GIO yang digunakan? (Di `.ssh/known_hosts` Anda terlihat beberapa IP seperti `202.155.18.247`, `72.62.125.143`, dan `103.58.100.169`).
   - Di mana lokasi file **Private Key** pasangan dari `key_baru` tersebut pada komputer Anda?
2. **Database Lokal vs Remote saat Pengembangan**: Apakah selama tahap coding awal (Phase 1–5) kita menggunakan PostgreSQL lokal / Docker di komputer ini terlebih dahulu, atau langsung terhubung ke PostgreSQL di VPS melalui SSH Tunnel?

