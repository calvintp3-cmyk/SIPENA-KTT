# Design Lab SIPENA KTT — Reset: High-Craft Digital Product Design

## Prinsip Utama (Wajib Dipatuhi)
1. **NOL METAFORA LITERAL.** Jangan membuat aplikasi terlihat seperti koran/dokumen statistik cetak, buku akuntansi bergaris ganda, atau peta/atlas berkontur dengan penggaris koordinat. SIPENA adalah **produk digital modern kelas dunia** (setara Linear, Stripe, Raycast, Vercel).
2. **Keunikan dari Kualitas Art Direction & Craft:** Keindahan dan identitas lahir dari komposisi layout, tipografi yang matang, hierarki yang tenang namun tajam, proporsi ruang kosong (*whitespace*), detail komponen (border, radius konsentris, elevasi terukur), dan mikro-interaksi yang terasa dibuat oleh desainer produk senior.
3. **Mode Permukaan:**
   - **Landing Page (`landing.html`):** *Persuade* — komposisi hero yang memukau (menampilkan produk/interaksi nyata, bukan kartu metrik palsu), penjelasan kapabilitas dengan proporsi asimetris yang rapi, dan cuplikan fenomena terbaru yang bisa diklik.
   - **Admin Dashboard (`dashboard.html`), Bank Data (`table.html`), Linimasa (`linimasa.html`), Visualisasi (`charts.html`), & Workbench (`detail.html`):** *Operate* — pemindaian cepat (*scanability*), struktur yang langsung familier bagi analis, kontrol standar web yang dipoles sangat rapi (buttons, segmented tabs, select, search, filter pills, sortable table, slideover/inspector), dan visualisasi data yang bersih serta informatif.
4. **Kebenaran Domain SIPENA KTT (SSOT):**
   - Gunakan `../shared/data.js` (`window.SIPENA`).
   - Istilah baku: **22 Kategori KBLI 2025 (A–V)** yang dikelompokkan ke **17 Sektor PDRB**, serta **6 Komponen Pengeluaran**.
   - Metrik ekspansi: **"Berita Bernada Ekspansi Volume"** (`28 dari 48 berita · 58%`) dengan catatan metodologis jelas: *"Proporsi berita terverifikasi, bukan angka pertumbuhan ekonomi/PDRB resmi."* Nilai kosong ditampilkan sebagai `—` (bukan `0%`).
   - Dualitas dua sisi PDRB: **Volume (NTB / Pengeluaran Riil)** vs **Harga (Harga / Deflator)** dengan indikator arah (`↑`/`↓`) + teks + bentuk ikon SVG yang konsisten.
   - Font monospace (`Geist Mono` / `JetBrains Mono`) **hanya** untuk kode KBLI `A–V`, angka metrik/tabel (`tabular-nums`), shortcut `⌘K`, dan identifier teknis (model LLM). Jangan gunakan monospace untuk body text atau judul.
5. **Hindari AI-Slop:**
   - Dilarang: *eyebrow pill* kecil di atas setiap H1, tile ikon warna-warni di atas setiap kartu KPI, tombol gradien ungu-biru generik, *card-in-card* bersarang, dan *glow* neon berlebihan.
   - Gunakan card, border radius (`6px`–`12px`), shadow berlapis halus, atau surface tinting **secara sengaja** ketika memperjelas hierarki dan pengelompokan.
6. **6 Halaman Lengkap + Interaktif per Arah:**
   - `index.html` (Ringkasan Design System & Navigasi Cepat)
   - `landing.html` (Landing Page Publik `/`)
   - `dashboard.html` (Admin Dashboard `/admin`: Sidebar lengkap 4 grup, 11 item, badge Review `23` & Monitor `3`, 4 KPI, Kelengkapan 17 Sektor PDRB & 3 Data Gap `J,K`, `M`, `Q`, serta Matriks Silang `17×6`)
   - `table.html` (Bank Data & Ekspor `/admin/articles`: Filter bar lengkap, pencarian, seleksi baris interaktif dengan floating bulk action bar, tabel 12+ baris dengan kode KBLI, dampak usaha, pengeluaran, dampak pengeluaran, status, sumber)
   - `linimasa.html` (Portal Publik `/linimasa`: Period switcher Tahun + TW I–IV, filter interaktif yang benar-benar menyaring daftar, KPI ringkas, stream fenomena + mode tabel ringkas, dan drawer/modal detail saat item diklik)
   - `charts.html` (Visualisasi Data Interaktif: Distribusi 17 Sektor PDRB, Komposisi 6 Komponen Pengeluaran, Tren 8 Triwulan Volume vs Harga dengan grafik SVG presisi & tooltip interaktif, serta Matriks Silang `17×6`)
   - `detail.html` (Workbench Review Harian `/admin/review` split-pane 2 kolom dengan inspektor KBLI/Pengeluaran & shortcut keyboard + Monitor 5 Slot Multi-LLM `/admin/scrapers` + galeri komponen & states)
7. **Verifikasi Visual Wajib:** Render screenshot `1440px` untuk seluruh halaman dan `390px` untuk `landing`, `dashboard`, dan `linimasa` menggunakan Chrome headless ke `design-lab/screenshots/<folder>/`, periksa dengan `read_file`, dan pastikan benar-benar terlihat seperti produk digital siap rilis.
