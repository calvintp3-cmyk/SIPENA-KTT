# 01 · Linear Precision ("Mineral Daylight & Hairline Precision")

**Inspirasi Prinsip Desain:** Linear App + Vercel Geist Design System  
**Filosofi Utama:** Produk digital analitik kelas dunia yang tenang, tajam, dan cepat—**tanpa metafora literal** (bukan koran cetak, buku akuntansi bergaris ganda, atau peta survei berkontur).

---

## 1. Sistem Warna (Crisp Mineral Daylight)

Seluruh pasangan warna teks dan permukaan telah dikalibrasi untuk memenuhi rasio kontras **WCAG AA (&ge; 4.5:1)**:

| Token | Nilai Hex | Peran Arsitektural |
| :--- | :--- | :--- |
| `--bg-canvas` | `#F7F8F9` | Kanvas aplikasi / sidebar menyatu (*Mineral Alabaster*) |
| `--surface` | `#FFFFFF` | Lembar kerja utama (*Inset Workspace Sheet*) |
| `--surface-well` | `#F1F3F5` | Kontainer kontrol tersegmen, header chip KBLI, track bar |
| `--border` | `#E6E8EC` | Garis pembagi struktural *edge-to-edge hairline* (`1px solid`) |
| `--border-hover` | `#D0D5DD` | Garis batas interaktif saat hover |
| `--ink-primary` | `#0F1115` | Tinta utama (*Rich Carbon*, bukan hitam murni `#000`) |
| `--ink-secondary` | `#4A505C` | Teks sekunder, label kolom, dan deskripsi |
| `--ink-muted` | `#5F6775` | Teks metadata dan catatan kaki (kontras `>5.1:1` di atas `#F1F3F5`) |
| `--emerald` | `#0D6E52` | Aksen tunggal fokus & verifikasi (*Deep Forest Emerald*) |
| `--crit-ink` | `#BE123C` | Penanda **Data Gap (`—`)** & kontraksi volume (`#FFF1F2` / `#FECDD3`) |
| `--info-ink` | `#0369A1` | Penanda sinyal **Harga / Deflator** (`#F0F9FF` / `#BAE6FD`) |
| `--warn-ink` | `#B45309` | Penanda antrean kurasi *Pending Review* (`#FFFBEB` / `#FDE68A`) |

---

## 2. Sistem Tipografi & Disiplin Monospace

- **UI, Navigasi & Display (`--font-sans`):** `Plus Jakarta Sans` (400, 500, 600, 700) dengan *tight tracking* `-0.025em` pada judul dan *sentence-case* tenang pada tabel serta navigasi (tanpa *uppercase tracked caps* yang bising).
- **Kode Teknis & Angka (`--font-mono`):** `JetBrains Mono` (500, 600) dengan `font-variant-numeric: tabular-nums` yang digunakan **secara eksklusif** untuk:
  - Kode Kategori KBLI 2025 (`A–V`) dan Komponen Pengeluaran (`PK_RT` s.d. `NET_EXPORT`)
  - Angka KPI, persentase, dan nilai sel matriks `17×6`
  - Pintasan keyboard (`⌘K`, `J`, `K`, `V`, `X`, `↵`)
  - Identifier model AI (`gemini-3.8-flash`, `groq:llama-3.3-70b`)

---

## 3. Filosofi Layout ("Inset Workspace Sheet" & Hairline Grid)

1. **Inset Workspace Sheet:** Pada seluruh halaman operasional (`dashboard.html`, `table.html`, `charts.html`, `detail.html`), sidebar kiri (`248px`) menyatu langsung dengan kanvas `#F7F8F9` tanpa kotak berat, sementara area kerja utama merupakan satu lembar permukaan putih `#FFFFFF` yang *inset* (`margin: 8px 8px 8px 0; border-radius: 12px; border: 1px solid #E6E8EC`).
2. **Edge-to-Edge Architectural Hairline Grid:** Di dalam lembar kerja, metrik KPI, grafik, dan tabel dibagi oleh garis *hairline* `1px solid #E6E8EC` dari tepi ke tepi—menghindari tumpukan kartu mengambang (*card-in-card*).

---

## 4. Kebenaran Domain SIPENA KTT & Visualisasi Data

- **Taksonomi Baku:** 22 Kategori KBLI 2025 (`A–V`) yang dikelompokkan ke **17 Sektor PDRB** × **6 Komponen Pengeluaran**.
- **3 Data Gap Eksplisit:** Sektor nir-bukti (`J,K` Informasi & Komunikasi, `M` Real Estat, `Q` Pendidikan) ditampilkan sebagai `Data Gap (—)` (bukan `0%`) dengan tombol aksi langsung `+ Tambah Bukti`.
- **Dualitas Sisi Ekonomi:** Sinyal **Volume Riil (NTB / Riil)** dibedakan secara konsisten melalui warna, label, dan geometri ikon dari sinyal **Harga (Deflator)**.
- **4 Visualisasi SVG Presisi (`charts.html` & `dashboard.html`):**
  1. *17-Sector Coverage Strip & Ranked Horizontal Bar*
  2. *Stacked Proportional Bar + Breakdown Table* untuk 6 Komponen Pengeluaran (tanpa donut chart)
  3. *Dual-Series Bar & Line Chart 8 Triwulan* (`TW I 25` – `TW IV 26`) dengan anotasi puncak dan legenda interaktif
  4. *Clean 17×6 Cross-Matrix Heatmap* dengan rampa warna emerald monokromatik dan sel kosong `—`

---

## 5. Daftar Halaman Prototipe

- [`index.html`](./index.html) — Spesimen Design System, Palet Warna, & Direktori 6 Halaman
- [`landing.html`](./landing.html) — Landing Page Publik (`/`) dengan Live Workbench Preview & Pita 17 Sektor
- [`dashboard.html`](./dashboard.html) — Admin Dashboard (`/admin`) dengan 4 KPI, Gap Sektoral, & Matriks `17×6`
- [`table.html`](./table.html) — Bank Data & Ekspor (`/admin/articles`) 12 baris dengan seleksi massal & floating bulk bar
- [`linimasa.html`](./linimasa.html) — Portal Eksplorasi Publik (`/linimasa`) dengan filter real-time & slideover drawer
- [`charts.html`](./charts.html) — Kanvas Analitik Interaktif (`/admin/trends`)
- [`detail.html`](./detail.html) — Workbench Kurasi Harian (`/admin/review`) split-pane 2 kolom + Monitor 5 Slot Multi-LLM (`/admin/scrapers`)
