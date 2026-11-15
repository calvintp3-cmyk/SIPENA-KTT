# SIPENA KTT — Alternatif 02: `02-stripe-clarity`
## "Luminous Porcelain & Dimensional Clarity"

Prototipe terisolasi untuk eksplorasi identitas visual **SIPENA KTT** (Sistem Pemantauan Fenomena Ekonomi Kabupaten Tana Tidung), terinspirasi dari prinsip kejelasan arsitektural **Stripe Financial Suite** dan **Mercury Institutional Analytics**.

---

## 1. Filosofi Desain & Kepribadian Visual
- **Nol Metafora Literal:** Tidak menggunakan metafora koran cetak, buku akuntansi bergaris ganda, atau peta survei lapangan. Prototipe ini dirancang sebagai **produk SaaS analitik institusional kelas dunia** yang hangat, bercahaya, berdimensi lembut, dan langsung familier bagi eksekutif Pemerintah Daerah (Bappeda) maupun statistisi BPS.
- **Modular Bento & Contextual Split-Drawer:** Menggunakan komposisi kartu putih (`#FFFFFF`) berdimensi lembut di atas kanvas porselen hangat (`#F6F5F2`) dengan multi-layered ambient shadow (`0 1px 2px rgba(24,24,27,0.04), 0 6px 20px -4px rgba(24,24,27,0.06)`).
- **Clean Floating Sidebar & Unified Period Pill:** Navigasi admin dikelompokkan ke dalam 4 grup (11 item) dengan indikator antrean aktif (`Review Harian: 23`, `Monitor Scraper & AI: 3`) serta pemilih periode terpadu (`Tahun + TW I–IV`).

---

## 2. Sistem Warna (Warm Porcelain & Institutional Royal Cobalt)
| Peran Token | Nilai Hex | Kontras / Penggunaan |
|---|---|---|
| Canvas Background | `#F6F5F2` | Kanvas batu porselen hangat yang nyaman dipindai berjam-jam |
| Primary Card Surface | `#FFFFFF` | Kartu utama dengan border `1px solid rgba(24,24,27,0.07)` |
| Secondary Tinted Well | `#EFECE6` / `#F9F8F6` | Wadah kontrol tersegmentasi, kutipan bukti, dan header tabel |
| Primary Ink | `#141619` | Teks utama dan judul (rasio kontras > 15:1) |
| Secondary Ink | `#454A54` | Teks isi dan deskripsi analitik (rasio kontras > 7:1) |
| Muted Ink | `#68707E` | Label sekunder dan metadata (>= 4.5:1) |
| Primary Accent | `#1D4ED8` | **Institutional Royal Cobalt** (hover `#1E40AF`, subtle `#EFF6FF`) |

### Dual-Dimension Data Encoding (Volume Riil vs Harga/Deflator)
- **Volume / NTB Riil Naik (`↑`):** Teal-Emerald `#047857` di atas `#ECFDF5` (ikon lingkaran panah atas)
- **Volume / NTB Riil Turun (`↓`):** Crimson `#BE123C` di atas `#FFF1F2` (ikon lingkaran panah bawah)
- **Harga / Deflator Naik (`↑`):** Warm Ochre `#B45309` di atas `#FFFBEB` (ikon belah ketupat panah atas)
- **Harga / Deflator Turun (`↓`):** Deep Sky `#0369A1` di atas `#F0F9FF` (ikon belah ketupat panah bawah)

---

## 3. Sistem Tipografi
- **Display & Angka KPI Utama (`Newsreader` 500/600):** Memberikan wibawa publikasi finansial modern (setara Stripe Press / Mercury) pada judul halaman dan angka metrik utama.
- **UI, Navigasi & Prosa Analitik (`Instrument Sans` 400/500/600/700):** Keterbacaan tinggi pada tabel padat dan kontrol filter.
- **Kode KBLI `A–V`, Metrik Tabular & Model LLM (`IBM Plex Mono`):** `tabular-nums` khusus kode KBLI, persentase, shortcut `⌘K`, dan identifier model AI.

---

## 4. Daftar Halaman Prototipe
1. [`index.html`](./index.html) — Ringkasan Sistem Desain, Spesimen Token, dan Direktori 6 Halaman.
2. [`landing.html`](./landing.html) — Landing Page Publik (`/`) dengan jendela pratinjau matriks interaktif, penjelasan dua sisi PDRB, dan kartu fenomena terbaru.
3. [`dashboard.html`](./dashboard.html) — Admin Dashboard (`/admin`) dengan Floating Sidebar, 4 kartu KPI + sparkline 8 triwulan, cakupan 17 Sektor PDRB + 3 Data Gap (`J,K`, `M`, `Q` = `—`), dan Matriks Silang `17×6`.
4. [`table.html`](./table.html) — Bank Data & Ekspor (`/admin/articles`) dengan 14 baris data, filter multi-dimensi, seleksi baris + Floating Bulk Action Bar, serta Slide-over Inspector Panel.
5. [`linimasa.html`](./linimasa.html) — Portal Publik (`/linimasa`) dengan Unified Period Switcher, filter interaktif KBLI/Pengeluaran/Dampak, toggle Stream vs Tabel Ringkas, dan Slide-over Inspector.
6. [`charts.html`](./charts.html) — Visualisasi Analitik SVG (`/admin/charts`): Layered Area & Column 8 Triwulan, Ranked Bar + Inline Sparkline 17 Sektor, Multi-Segment Portfolio Bar 6 Pengeluaran, dan Matriks `17×6`.
7. [`detail.html`](./detail.html) — Split-pane Workbench Review Harian (`/admin/review`) dengan shortcut keyboard (`J/K`, `A`, `E`, `S`), Monitor 5 Slot Multi-LLM (`/admin/scrapers`), dan Galeri State Komponen.
