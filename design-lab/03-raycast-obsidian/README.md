# Alternatif 03: `03-raycast-obsidian` ("Obsidian Carbon & High-Velocity Command")

Prototipe terisolasi untuk arah desain ketiga **SIPENA KTT** (Sistem Pengumpulan Fenomena Ekonomi Kabupaten Tana Tidung), dirancang dengan filosofi produk kelas dunia setara **Raycast Pro**, **Fey Financial**, dan **Linear Dark**.

---

## 1. Filosofi Desain & Identitas Visual
- **Zero Literal Metaphors & Zero Neon Slop:** Bukan terminal hacker hijau, bukan cyberpunk neon, dan bukan tiruan koran cetak atau peta kartografi. Ini adalah *dark-first executive intelligence cockpit* untuk analis dan kurator PDRB yang memindai serta memverifikasi puluhan sinyal berita ekonomi setiap hari.
- **Tactile Obsidian Carbon Surface Scale:**
  - Deepest Canvas: `#0A0C0E`
  - Primary Workspace Surface: `#111418`
  - Elevated Card / Panel Surface: `#161A20` dengan *specular top-edge highlight* `inset 0 1px 0 rgba(255,255,255,0.06)` dan border `#222730`
  - Interactive Hover / Active Selection: `#1C2129` / `#202734`
- **WCAG AAA/AA Dark-Calibrated Typography & Signals:**
  - Primary Ink: `#F3F5F8` (kontras > 14:1)
  - Secondary Ink: `#A2ABB8` (kontras ~7.8:1)
  - Muted Ink: `#758091` (kontras >= 4.6:1 di atas `#111418`)
  - Primary Accent: **Luminous Jade `#2DD4BF`**; untuk tombol CTA utama menggunakan `#14B8A6` dengan teks gelap `#042F2E` (kontras > 8.4:1).
  - Semantic Signals: Volume Naik `#34D399` (`↑`), Volume Turun / Data Gap `#FB7185` (`↓` / `—`), Harga / Deflator `#FBBF24` (`◆`).

---

## 2. Daftar Halaman Prototipe (`03-raycast-obsidian/`)
1. **[`index.html`](./index.html)** — Ringkasan Design System, token warna *Obsidian Carbon*, tipografi (`Inter` + `Plus Jakarta Sans` + `JetBrains Mono`), dan direktori navigasi ke 6 halaman utama.
2. **[`landing.html`](./landing.html)** — Landing Page Publik (`/`) dengan **Interactive Live Workstation Preview Window** di bagian hero (filter sinyal Volume vs Harga langsung memperbarui daftar dan inspektor AI), arsitektur klasifikasi ganda 17 Sektor PDRB, dan cuplikan fenomena terbaru.
3. **[`dashboard.html`](./dashboard.html)** — Executive Intelligence Cockpit (`/admin`) dengan Compact Navigation Rail (4 grup, 11 item, badge `23` dan `3`), Top Command Bar (`⌘K`), 4 kartu KPI utama (termasuk catatan metodologis eksplisit pada metrik ekspansi volume `58%`), Kelengkapan 17 Sektor PDRB + sorotan 3 Data Gap (`J,K`, `M`, `Q` = `—`), distribusi 6 komponen pengeluaran, serta Matriks Silang `17×6`.
4. **[`table.html`](./table.html)** — Bank Data & Ekspor (`/admin/articles`) dengan filter pencarian, KBLI, pengeluaran, dan status, tabel 12 baris fenomena terstruktur, seleksi baris interaktif dengan **Floating Raycast Bulk Action Bar**, dan ekspor CSV/XLSX.
5. **[`linimasa.html`](./linimasa.html)** — Portal Linimasa Publik (`/linimasa`) dengan pemilih Tahun + TW I–IV, filter pill KBLI yang menyaring daftar secara langsung, pengalih mode tampilan *Kartu Linimasa* vs *Tabel Ringkas*, dan *Sticky Detail Inspector Drawer*.
6. **[`charts.html`](./charts.html)** — Visualisasi SVG Presisi Tinggi bergaya Fey/Linear Insights:
   - Tren 8 Triwulan (`TW I 25` – `TW IV 26`) Volume Naik vs Harga/Deflator vs Volume Turun dengan *area fade-fill* dan readout interaktif.
   - Grafik Batang 17 Sektor PDRB dengan penanda jelas untuk 3 sektor Data Gap (`J,K`, `M`, `Q` = `—`).
   - Spektrum Proporsi & Rincian 6 Komponen Pengeluaran PDRB (tanpa donut chart).
   - Heatmap Matriks Silang `17×6` (102 sel matriks).
7. **[`detail.html`](./detail.html)** — Workbench Review Harian Split-Pane (`/admin/review`) dengan antrean 23 berita, editor klasifikasi ganda KBLI & Pengeluaran, shortcut keyboard (`J`/`K`, `A`, `S`, `X`), ditambah tabel **Monitor 5 Slot Multi-LLM (`/admin/scrapers`)** dan galeri spesimen komponen.
