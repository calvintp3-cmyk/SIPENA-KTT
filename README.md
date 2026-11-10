# SIPENA-KTT (Sistem Informasi Fenomena Ekonomi dan Neraca Tana Tidung)

[![Next.js](https://img.shields.io/badge/Next.js-15.1-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql)](https://www.postgresql.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.39-C5F74F)](https://orm.drizzle.team/)
[![Vercel AI SDK](https://img.shields.io/badge/Vercel_AI_SDK-4.1-black)](https://sdk.vercel.ai/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?logo=tailwind-css)](https://tailwindcss.com/)

**SIPENA-KTT** adalah platform analitis cerdas yang dirancang khusus untuk Tim Neraca Wilayah dan Analisis Statistik (Nerwilis) **Badan Pusat Statistik (BPS) Kabupaten Tana Tidung** (Kode Wilayah: 65.04). Platform ini mengotomatiskan pemantauan berita regional, ekstraksi fenomena ekonomi (*economic shocks*) berbasis AI (Google Gemini Flash), pengelompokan baku KBLI 2025 dan Komponen Pengeluaran PDRB, penelaahan validasi (*Human-in-the-Loop*), serta ekspor instan berkas kerja Diseminasi Neraca ke dalam format Microsoft Excel (`.xlsx`).

---

## 📑 Single Source of Truth (SSoT) Documentation

Seluruh arsitektur, spesifikasi produk, skema basis data, dan sistem desain didokumentasikan secara rinci di direktori [`/docs`](./docs):

- [**`docs/prd.md`**](./docs/prd.md) — *Product Requirements Document*: Masalah utama kompilasi PDRB, 5 media target Kaltara, modul crawling, ekstraksi AI, verifikasi, dan ekspor.
- [**`docs/architecture.md`**](./docs/architecture.md) — *System Architecture*: Tech stack, alur cron harian pada Ubuntu 24.04 (Biznet GIO VPS), reverse proxy Nginx, dan kontrak rute API.
- [**`docs/schema.md`**](./docs/schema.md) — *Database Schema*: Tabel Drizzle ORM (`articles`, `economic_phenomena`, `users`, `audit_logs`), PostgreSQL native enums, dan validasi Zod untuk ekstraksi Gemini.
- [**`docs/design-system.md`**](./docs/design-system.md) — *UI/UX Design System*: Standar visual anti-slop, ergonomi kontras slate BPS, tipografi tabular monospace (`tnum`), dan pedoman penelaahan berdampingan (*side-by-side drawer*).

---

## 🎨 UI/UX Interactive Prototype

Desain UI/UX telah didesain ulang agar **tidak "AI sleek"**, ergonomis untuk sesi kerja analis yang panjang, dan mencerminkan identitas resmi BPS:

- **Preview Interaktif**: Buka berkas [`design/redesign-preview.html`](./design/redesign-preview.html) langsung pada peramban web untuk mencoba navigasi tab, pemfilteran tabel data analitis, dan *Side-by-Side Review Drawer* dengan pintasan keyboard (`[A]` Setujui, `[R]` Tolak, `[Esc]` Tutup).
- **Desain Awal Google Stitch**: Tersimpan rapi di direktori [`design/stitch-mvp/`](./design/stitch-mvp/).

---

## 🗂️ Struktur Direktori Proyek

```text
f:\18 - SIPENA KTT\
├── .agents/
│   └── skills/                   # 14 Skill agentik terkurasi (UI/UX, Anti-Slop, Taste, Stitch, Engineering)
├── design/
│   ├── redesign-preview.html     # Prototipe interaktif UI/UX lengkap (HTML/Tailwind/Lucide)
│   └── stitch-mvp/               # Desain awal dari Google Stitch (HTML & screen captures)
├── docs/                         # Single Source of Truth (SSoT)
│   ├── prd.md                    # Product Requirements Document
│   ├── architecture.md           # Arsitektur sistem & alur background job VPS
│   ├── schema.md                 # Skema Drizzle ORM & skema Zod LLM
│   └── design-system.md          # Spesifikasi sistem desain & ergonomi UI
├── src/
│   ├── app/                      # Next.js 15 App Router (Layout & Pages)
│   ├── db/                       # Drizzle ORM client, pooling & schema
│   │   ├── index.ts
│   │   └── schema.ts
│   └── types/                    # Domain types & validasi Zod
│       └── index.ts
├── drizzle.config.ts             # Konfigurasi migrasi Drizzle Kit
├── next.config.ts                # Konfigurasi Next.js
├── package.json                  # Dependensi proyek & npm scripts
├── tsconfig.json                 # Konfigurasi TypeScript
└── README.md
```

---

## ⚙️ Memulai Instalasi & Pengembangan Lokal

### Prasyarat
- **Node.js**: Versi `22.x LTS`
- **PostgreSQL**: Versi `16+`

### 1. Instalasi Dependensi
```bash
npm install
```

### 2. Konfigurasi Variabel Lingkungan
Buat file `.env.local` di root proyek:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/sipena_ktt"
GOOGLE_GENERATIVE_AI_API_KEY="AIzaSy..."
CRON_SECRET="your-secure-random-secret-token"
```

### 3. Migrasi Basis Data (Drizzle Kit)
```bash
# Generate file migrasi SQL
npm run db:generate

# Terapkan migrasi ke PostgreSQL
npm run db:migrate

# Buka Drizzle Studio untuk inspeksi visual basis data
npm run db:studio
```

### 4. Menjalankan Server Pengembangan
```bash
npm run dev
```
Akses aplikasi melalui peramban di `http://localhost:3000`.

---

## 🤖 Menjalankan Background Cron Jobs (CLI)

Pada server VPS (Ubuntu 24.04 LTS), pipeline cron harian dijalankan melalui skrip terisolasi:

```bash
# 1. Pemindaian & penarikan berita lokal Kaltara
npm run cron:ingest

# 2. Ekstraksi terstruktur AI (Gemini Flash)
npm run cron:extract
```

---

## 👥 Tim & Kepemilikan
- **Institusi**: Badan Pusat Statistik (BPS) Kabupaten Tana Tidung
- **Fungsi**: Neraca Wilayah dan Analisis Statistik (Nerwilis)
- **Repositori**: [calvintp3-cmyk/SIPENA-KTT](https://github.com/calvintp3-cmyk/SIPENA-KTT)

