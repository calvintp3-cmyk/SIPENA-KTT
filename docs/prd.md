# Product Requirements Document (PRD) — SIPENA KTT

**Nama Produk:** SIPENA KTT (*Sistem Informasi Pencari Fenomena Ekonomi Kabupaten Tana Tidung*)  
**Versi Dokumen:** 1.0.0 (Single Source of Truth)  
**Domain:** Statistik Ekonomi Makro Regional — Produk Domestik Regional Bruto (PDRB)  
**Target Instansi / Pengguna Utama:** Tim Neraca Wilayah dan Analisis Statistik (Nerwilis), BPS Kabupaten Tana Tidung & Pemangku Kepentingan Pemerintah Daerah  
**Tech Stack Inti:** Nuxt 3 (SSR/Nitro, TypeScript), Nuxt UI v3 (`@nuxt/ui`), PostgreSQL + Drizzle ORM, Cheerio, Google GenAI SDK (`@google/genai` — Gemini Flash Free Tier), ExcelJS (`exceljs`)

---

## 1. Latar Belakang Masalah, Visi Produk, dan Ringkasan Eksekutif

### 1.1 Latar Belakang Masalah
Penyusunan angka **Produk Domestik Regional Bruto (PDRB)** Kabupaten Tana Tidung (Provinsi Kalimantan Utara)—baik atas dasar harga berlaku (ADHB) maupun atas dasar harga konstan (ADHK)—menghadapi tiga tantangan operasional utama di lapangan:
1. **Ketertinggalan (*Lag*) Data Sekunder Konvensional:** Survei statistik sektoral dan laporan administrasi OPD sering kali baru tersedia setelah triwulan berjalan berakhir, padahal analis Nerwilis membutuhkan sinyal *real-time* mengenai arah pertumbuhan riil dan pergerakan harga (*implicit price deflator*) selama triwulan berjalan.
2. **Fragmentasi Informasi Ekonomi Regional & Transmisi Nasional:** Fenomena ekonomi aktual di Kabupaten Tana Tidung tersebar di berbagai portal berita lokal Kalimantan Utara (Tribun Kaltara, Koran Kaltara, Benuanta, Radar Tarakan) serta berita komoditas/kebijakan nasional (harga batubara acuan, harga TBS kelapa sawit, alokasi DBH migas, subsidi ongkos angkut, hingga kebijakan kehutanan) yang memiliki mekanisme transmisi langsung terhadap perekonomian Tana Tidung.
3. **Beban Pemilahan & Klasifikasi Manual:** Pemantauan berita secara manual memakan waktu berjam-jam setiap hari bagi staf pengolah PDRB. Berita seremonial, kriminalitas non-ekonomi, dan berita politik kerap menyamarkan fenomena ekonomi sejati, sementara pemetaan setiap fenomena ke dalam **21 Kategori Lapangan Usaha (KBLI A–U)** dan **6 Komponen PDRB Pengeluaran** menuntut ketelitian konseptual SNA 2008 / pedoman PDRB BPS.

### 1.2 Visi Produk
Menghadirkan sistem intelijen fenomena ekonomi daerah berbasis otomasi *crawling* dan klasifikasi AI terstruktur tanpa biaya langganan (*zero-cost LLM pipeline*), sehingga setiap fenomena ekonomi Kabupaten Tana Tidung terekam setiap hari secara sistematis, tervalidasi oleh analis Nerwilis, dapat ditelusuri publik secara ringkas, dan siap diekspor langsung ke format kertas kerja kompilasi PDRB triwulanan.

### 1.3 Ringkasan Eksekutif
**SIPENA KTT** adalah aplikasi web *full-stack* monolitik berbasis Nuxt 3 yang berjalan di VPS Ubuntu 24.04 dengan PostgreSQL lokal. Setiap dini hari (04:00 WITA), penjadwal otomatis memanen artikel terbaru (H-1 dan hari berjalan) dari empat portal berita lokal Kalimantan Utara serta berita nasional yang cocok dengan tabel *master keyword* dinamis.

Untuk menjaga efisiensi biaya dan batas kuota *Free Tier* Google Gemini Flash, sistem menerapkan **strategi ekstraksi *word threshold* (150–250 kata pertama)** alih-alih mengirim HTML mentah atau artikel utuh ke LLM. Setiap artikel dievaluasi menggunakan *Structured Output JSON Schema* untuk menghasilkan: (a) filter apakah artikel merupakan fenomena ekonomi sejati (`true/false`), (b) ringkasan padat 2–3 kalimat, (c) pemetaan KBLI (A–U) beserta arah dampaknya (NTB atau Harga), (d) pemetaan Komponen PDRB Pengeluaran beserta arah dampaknya (Pengeluaran Riil atau Indeks Harga/Deflator), serta (e) identifikasi periode Triwulan I–IV dan Tahun.

Hasil klasifikasi masuk ke meja kerja verifikasi admin (`/admin/review`) untuk validasi cepat sebelum terbit ke portal publik (`/`) dan masuk ke bank data arsip (`/admin/articles`) dengan fitur ekspor resmi `.xlsx` (10 kolom standar Nerwilis) dan `.csv`.

---

## 2. Ruang Lingkup & Sumber Data

### 2.1 Target Portal Berita Regional (Wajib)
Crawler memantau kanal khusus Kabupaten Tana Tidung pada empat portal berita regional berikut secara langsung:
1. `https://kaltara.tribunnews.com/kaltara/tanah-tidung`
2. `https://korankaltara.com/category/tana-tidung`
3. `https://benuanta.co.id/category/pemkab-tana-tidung/`
4. `https://radartarakan.jawapos.com/tana-tidung`

### 2.2 Penjaringan Berita Nasional Berbasis Master Keyword Dinamis
Portal nasional dijaring berdasarkan daftar kata kunci aktif pada tabel `national_keywords` yang dikelola oleh admin (contoh awal / *seed*):
- `"harga batubara acuan"` (transmisi Pertambangan KBLI `B` & Ekspor Bersih)
- `"harga TBS kelapa sawit"` (transmisi Pertanian/Perkebunan KBLI `A` & Industri Pengolahan `C`)
- `"DBH migas kaltara"` (transmisi Administrasi Pemerintahan `O` & Konsumsi Pemerintah `PK-P`)
- `"subsidi ongkos angkut"` (transmisi Pengangkutan `H`, Inflasi/Perdagangan `G`, & `PK-RT` / `PK-P`)
- `"moratorium kayu"` (transmisi Kehutanan `A`, Industri Kayu `C`, & Ekspor Bersih)

Mekanisme pengambilan berita nasional dilakukan melalui umpan sindikasi berita nasional terindeks (*Google News RSS Indonesia* `hl=id&gl=ID&ceid=ID:id` dengan filter rentang H-1/terkini serta umpan RSS ekonomi nasional terpilih) untuk mencegah pemblokiran *anti-bot* mesin pencari sekaligus membatasi pengambilan artikel hanya pada tautan artikel yang relevan.

### 2.3 Di Luar Cakupan (*Out of Scope*)
- Estimasi ekonometrika otomatis (perhitungan nilai rupiah ADHB/ADHK secara otomatis) — SIPENA KTT menyediakan **fenomena pendukung kualitatif/arah pergerakan (*directional signals*)** sebagai input kerja analis, bukan menggantikan tabel *Supply-Use* atau *worksheet* estimasi BPS.
- Pemrosesan dokumen PDF/gambar/video — hanya teks artikel HTML (teks 150–250 kata pertama).
- Manajemen multi-kabupaten di luar Kabupaten Tana Tidung dan konteks makro Kalimantan Utara/nasional yang memengaruhi Tana Tidung.

---

## 3. Persona Pengguna & Hak Akses

| Atribut | Persona A: Admin Nerwilis / Pengolah PDRB | Persona B: Public Stakeholder |
|---|---|---|
| **Identitas Khas** | Statistisi Ahli / Pengolah Data Neraca Wilayah BPS Kab. Tana Tidung | Bappeda-Litbang, Dinas Teknis Pemkab Tana Tidung, Akademisi, Pelaku Usaha, Masyarakat |
| **Tujuan Utama** | Memastikan tidak ada fenomena ekonomi terlewat, mengoreksi klasifikasi AI dengan cepat setiap pagi (< 15 menit), mengelola keyword nasional, dan mengunduh lampiran fenomena `.xlsx` akhir triwulan | Memantau rangkuman fenomena ekonomi terkini per triwulan di Kab. Tana Tidung dan melihat komposisi dampaknya terhadap sektor usaha & komponen pengeluaran |
| **Kebutuhan Akses** | Terautentikasi (`/login`) -> `/admin/review`, `/admin/articles`, `/admin/keywords`, `/admin/scrapers` | Tanpa login (`/` *read-only*), hanya menampilkan artikel berstatus `VERIFIED` dan `is_economic_phenomenon = true` |
| **Frekuensi Penggunaan** | Harian (verifikasi pagi H-1) + Kuartalan (rekap & ekspor Excel PDRB) | Mingguan / Kuartalan (evaluasi kondisi ekonomi daerah) |
| **Pain Point Utama** | Terlalu banyak berita seremonial pejabat yang tidak berdampak pada output/harga; format kolom ekspor sering berubah-ubah | Sulit menemukan ringkasan fenomena ekonomi daerah yang sudah terstruktur berdasarkan KBLI dan Pengeluaran |

---

## 4. Core Epics & User Stories

### Epic 1: Scraper Engine & Ekstraksi Konten Cerdas (`SCRAPE`)
- **US-1.1 (Regional Portal Harvesting):** Sebagai sistem penjadwal otomatis, saya dapat melakukan *crawling* empat portal berita lokal Tana Tidung setiap hari pukul 04:00 WITA untuk mengambil daftar tautan berita H-1 dan hari berjalan sehingga tim Nerwilis sudah memiliki bahan review saat jam kerja pagi dimulai.
  - *Acceptance Criteria:*
    - Mengunjungi seluruh 4 URL kanal regional dengan *User-Agent* standar dan *timeout* HTTP maksimal 15 detik per halaman.
    - Melakukan normalisasi URL (menghapus parameter pelacakan `utm_*`, `#fragment`, *trailing slash*) dan menghitung `SHA-256` URL untuk deduplikasi sebelum mengambil badan artikel.
    - Jika URL sudah ada di tabel `articles`, sistem melewatkan proses *fetch* badan artikel dan mencatatnya pada counter `articles_deduplicated`.
- **US-1.2 (National Keyword Harvesting):** Sebagai sistem penjadwal otomatis, saya dapat melakukan kueri pencarian berita nasional untuk setiap baris pada `national_keywords` di mana `is_active = true`, memvalidasi host/IP target terhadap risiko SSRF, dan mengekstrak artikel yang belum pernah tersimpan.
  - *Acceptance Criteria:*
    - Hanya mengeksekusi kata kunci berstatus `is_active = true`.
    - Menyimpan relasi `keyword_id` pada artikel yang terjaring agar admin mengetahui keyword mana yang paling produktif.
- **US-1.3 (Ekstraksi Ambang Batas 150–250 Kata):** Sebagai *HTML Parser* berbasis Cheerio, saya dapat membersihkan elemen noise (`script`, `style`, iklan, widget "Baca Juga", footer) dan mengakumulasi teks paragraf dari atas ke bawah hingga mencapai **150–250 kata pertama** (~1.000–1.500 karakter).
  - *Acceptance Criteria:*
    - Paragraf pendek khas portal lokal (1–2 kalimat per `<p>`) digabung berurutan dari paragraf pembuka.
    - Pengambilan berhenti saat akumulasi kata mencapai >= 150 kata dan dipotong rapi di batas kalimat/kata paling lambat tepat pada kata ke-250 apabila satu paragraf sangat panjang.
    - Apabila total isi artikel asli kurang dari 150 kata (minimal 30 kata yang valid), seluruh teks bersih tetap diambil selama bukan halaman galat/paywall.

### Epic 2: AI Classifier Worker — Gemini Flash Structured Output (`AI`)
- **US-2.1 (Klasifikasi Terstruktur Dua Sisi PDRB):** Sebagai AI Worker, saya mengirim judul, tanggal rilis, sumber, dan potongan teks 150–250 kata ke Google Gemini Flash API (`gemini-3.8-flash` dengan fallback `gemini-3.5-flash-lite`) menggunakan JSON Schema yang mengikat agar menghasilkan klasifikasi valid tanpa halu format.
  - *Acceptance Criteria:*
    - Respons JSON divalidasi ulang dengan Zod di server Nitro sebelum masuk ke PostgreSQL.
    - Menghasilkan field: `is_economic_phenomenon`, `summary` (2–3 kalimat bahasa Indonesia baku), `kbli_category` (`A`–`U`), `kbli_impact`, `expenditure_component`, `expenditure_impact`, `quarter` (1–4), dan `year`.
- **US-2.2 (Deteksi & Penolakan Berita Non-Ekonomi):** Sebagai AI Worker, saya wajib menandai berita seremonial murni, kriminalitas tanpa dampak usaha, politik pilkada tanpa kebijakan fiskal/ekonomi, atau hiburan dengan `is_economic_phenomenon = false` dan langsung menaruh status verifikasinya ke `IGNORED`.
  - *Acceptance Criteria:*
    - Artikel dengan `is_economic_phenomenon = false` tetap disimpan *url_hash*-nya dan berstatus `IGNORED` supaya crawler tidak mengulangi pemanggilan LLM keesokan harinya dan admin tetap bisa menyelamatkannya (*rescue*) jika terjadi *false negative*.
- **US-2.3 (Ketahanan Rate-Limit & Fallback Status):** Sebagai AI Worker yang memakai kuota *Free Tier*, saya mengatur jeda antar-panggilan dan melakukan *exponential backoff* saat menerima HTTP 429 (`RESOURCE_EXHAUSTED`), serta tidak membuang artikel yang gagal diklasifikasi.
  - *Acceptance Criteria:*
    - Jeda minimal 4,5 detik per panggilan untuk menjaga batas RPM *Free Tier*.
    - Jika gagal setelah percobaan ulang maksimal (atau kuota harian habis), artikel tetap disimpan di PostgreSQL dengan `verification_status = 'PENDING'`, `llm_status = 'FAILED'`, dan `llm_error` terisi agar bisa diproses ulang lewat tombol *Retry Failed LLM*.

### Epic 3: Daily Review Workspace (`REVIEW`)
- **US-3.1 (Antrean Verifikasi Berbasis Tab):** Sebagai Admin Nerwilis, saya dapat membuka `/admin/review` yang terbagi atas 3 tab (`Pending`, `Verified`, `Ignored`) berisi *badge* jumlah artikel sehingga saya langsung fokus meninjau hasil crawling H-1 pada tab `Pending`.
- **US-3.2 (Inline Edit via Slide-Over Drawer & Approval 1-Klik):** Sebagai Admin Nerwilis, saya dapat mengklik tombol **Verifikasi** 1-klik langsung pada baris tabel jika hasil AI sudah akurat, atau membuka **Slide-over Drawer** di sisi kanan untuk melihat cuplikan berita 200 kata, membuka tautan sumber asli, lalu mengedit KBLI, Dampak KBLI, Pengeluaran, Dampak Pengeluaran, Ringkasan, maupun Triwulan/Tahun sebelum menyimpan & memverifikasi.
- **US-3.3 (Batch Actions):** Sebagai Admin Nerwilis, saya dapat mencentang beberapa baris sekaligus dan menekan tombol massal **Verifikasi Terpilih** atau **Abaikan Terpilih** untuk mempercepat proses kurasi puluhan berita harian.

### Epic 4: Bank Data Arsip & Pelaporan Resmi Excel/CSV (`ARCHIVE`)
- **US-4.1 (Pencarian & Filter Multi-Parameter):** Sebagai Admin Nerwilis, saya dapat menelusuri seluruh arsip artikel di `/admin/articles` dengan kombinasi filter kata kunci judul/ringkasan, rentang tanggal rilis, periode Triwulan & Tahun, Kategori KBLI, Komponen Pengeluaran, Sumber Portal, dan Status Verifikasi.
- **US-4.2 (Input Fenomena Manual):** Sebagai Admin Nerwilis, saya dapat menambahkan fenomena ekonomi secara manual melalui modal (`<UModal>`) untuk mencatat sumber offline/surat edaran/portal yang terlewat, lengkap dengan opsi verifikasi langsung.
- **US-4.3 (Ekspor Resmi Format Excel `.xlsx` & `.csv`):** Sebagai Admin Nerwilis, saya dapat mengekspor data terfilter ke berkas `.xlsx` (dibangun via `exceljs` dengan header styled, lebar kolom otomatis, pembekuan baris judul, dan hyperlink URL sumber) atau `.csv` dengan **urutan 10 kolom baku yang tidak boleh berubah**:
  1. `Waktu Rilis Berita` (`dd/mm/yyyy`)
  2. `Judul Berita`
  3. `Kategori Lapangan Usaha (KBLI)`
  4. `Dampak Sisi Lapangan Usaha`
  5. `Komponen PDRB Pengeluaran`
  6. `Dampak Sisi Pengeluaran`
  7. `Ringkasan Berita`
  8. `Sumber Berita (URL)`
  9. `Periode Berita` (`Triwulan I/II/III/IV YYYY`)
  10. `Status Verifikasi`

### Epic 5: Master Keyword & Scraper Observability (`ADMIN-OPS`)
- **US-5.1 (Master Keyword Manager):** Sebagai Admin Nerwilis, saya dapat menambah, mengedit, menghapus, dan menyalakan/mematikan (`is_active` switch) kata kunci pemantauan berita nasional beserta asosiasi sektor KBLI & Pengeluaran bawaannya di `/admin/keywords`.
- **US-5.2 (Scraper & Token Monitor):** Sebagai Admin Nerwilis, saya dapat memantau riwayat log crawler harian (waktu jalan, durasi, jumlah artikel berhasil/deduplikasi/gagal, estimasi pemakaian `input_tokens`, `output_tokens`, dan `total_tokens` Gemini Flash) serta menekan tombol **Jalankan Scraping Manual** atau **Proses Ulang Artikel LLM Gagal** di `/admin/scrapers`.

### Epic 6: Public Stakeholder Dashboard & Feed (`PUBLIC`)
- **US-6.1 (KPI Snapshot & Grafik Sebaran Triwulanan):** Sebagai Pemangku Kepentingan Publik, saat membuka `/`, saya langsung melihat ringkasan KPI triwulan berjalan (total fenomena terverifikasi, sektor KBLI paling dominan, komponen pengeluaran teraktif, dan rasio sinyal ekspansi vs tekanan harga) beserta visualisasi proporsi sektor KBLI dan Komponen Pengeluaran.
- **US-6.2 (Feed Linimasa Read-Only & Sticky Filter):** Sebagai Pemangku Kepentingan Publik, saya dapat memfilter daftar fenomena ekonomi terverifikasi berdasarkan Periode (Tahun & Triwulan), Kategori KBLI, Komponen Pengeluaran, dan pencarian teks, serta membuka ringkasan beserta tautan portal berita sumber aslinya.

---

## 5. Aturan Bisnis & Domain PDRB (Business Rules)

### 5.1 Aturan Klasifikasi Kategori Lapangan Usaha (KBLI A s.d. U)
Mengacu pada Klasifikasi Baku Lapangan Usaha Indonesia (KBLI 2020 — Peraturan BPS No. 2 Tahun 2020), sistem mendefinisikan **21 Kategori A s.d. U** secara eksplisit pada skema data dan LLM, dengan dukungan pengelompokan otomatis ke **17 Lapangan Usaha PDRB** pada analitik publik apabila diperlukan (`M,N` dan `R,S,T,U`):

| Kode | Nama Kategori Resmi (KBLI A–U) | Contoh Konteks Ekonomi Kab. Tana Tidung |
|---|---|---|
| `A` | Pertanian, Kehutanan, dan Perikanan | Panen & harga TBS kelapa sawit, produksi padi sawah/ladang, perikanan tangkap/tambak udang, kayu bulat/HTI, moratorium hutan |
| `B` | Pertambangan dan Penggalian | Produksi & harga batubara acuan (HBA), lifting migas sekitar Kaltara, penggalian pasir/batu/sirtu proyek infrastruktur |
| `C` | Industri Pengolahan | Pabrik kelapa sawit (CPO/kernel), penggilingan padi, industri pengolahan ikan/udang, penggergajian kayu/industri kecil menengah |
| `D` | Pengadaan Listrik dan Gas | Penambahan gardu/jaringan listrik PLN di Tideng Pale & pedalaman, bauran PLTS/energi, distribusi gas pipa/kota |
| `E` | Pengadaan Air, Pengelolaan Sampah, Limbah dan Daur Ulang | Perluasan sambungan air bersih PDAM, layanan pengelolaan TPA & limbah industri |
| `F` | Konstruksi | Proyek APBN/APBD jalan poros, jembatan, gedung pemerintahan KTT, pembangunan rumah bersubsidi & kawasan pusat pemerintahan |
| `G` | Perdagangan Besar dan Eceran; Reparasi Mobil dan Sepeda Motor | Omzet pasar rakyat/toko sembako, kelancaran distribusi bahan pokok & BBM non-subsidi, impor bahan bangunan dari Tarakan/Berau |
| `H` | Pengangkutan dan Pergudangan | Aktivitas pelabuhan/dermaga speedboat & kargo sungai Sesayap, subsidi ongkos angkut (SOA) udara/sungai pedalaman, angkutan logistik |
| `I` | Penyediaan Akomodasi dan Makan Minum | Tingkat hunian hotel/penginapan saat event daerah, pertumbuhan UMKM kuliner/kafe |
| `J` | Informasi dan Komunikasi | Pembangunan BTS 4G/fiber optik desa blankspot KTT, kenaikan penetrasi layanan data & digitalisasi transaksi |
| `K` | Aktivitas Keuangan dan Asuransi | Penyaluran KUR/kredit perbankan daerah, pertumbuhan simpanan/pinjaman Bankaltimtara & koperasi |
| `L` | Real Estat | Aktivitas sewa bangunan/ruko komersial dan transaksi properti kawasan Tideng Pale |
| `M` | Aktivitas Profesional, Ilmiah dan Teknis | Jasa konsultansi rekayasa/konstruksi proyek daerah, jasa survei pemetaan/akuntansi |
| `N` | Aktivitas Penyewaan dan Sewa Guna Usaha Tanpa Hak Opsi, Ketenagakerjaan, Agen Perjalanan dan Penunjang Usaha Lainnya | Penyewaan alat berat proyek/tambang, agen perjalanan dinas & jasa alih daya |
| `O` | Administrasi Pemerintahan, Pertahanan dan Jaminan Sosial Wajib | Realisasi belanja pegawai ASN/PPPK, transfer DBH Migas/Kehutanan & DAU, proyek pelayanan publik kecamatan |
| `P` | Pendidikan | Penyaluran BOSDA, rehabilitasi ruang kelas/sekolah, pelatihan vokasi daerah |
| `Q` | Aktivitas Kesehatan Manusia dan Aktivitas Sosial | Operasional RSUD Akhmad Berahim, layanan puskesmas & program bantuan sosial kemasyarakatan |
| `R` | Kesenian, Hiburan dan Rekreasi | Penyelenggaraan festival budaya Irau/pariwisata alam KTT yang menggerakkan kunjungan |
| `S` | Aktivitas Jasa Lainnya | Jasa bengkel non-kendaraan, salon, binatu, dan organisasi kemasyarakatan/profesi |
| `T` | Aktivitas Rumah Tangga Sebagai Pemberi Kerja; Jasa Produksi Sendiri | Jasa pekerja domestik rumah tangga |
| `U` | Aktivitas Badan Internasional dan Badan Ekstra Internasional Lainnya | Program hibah/operasional langsung badan internasional di wilayah KTT (jarang, disiapkan untuk kelengkapan KBLI A–U) |

### 5.2 Aturan Dampak Sisi Lapangan Usaha (`KbliImpactEnum`)
Setiap fenomena ekonomi dipetakan tepat pada satu dampak dominan berikut:
1. **`Meningkatkan NTB` (`INCREASE_NTB`):** Peningkatan volume produksi, produktivitas lahan, investasi kapasitas produksi baru, pembukaan lahan usaha, panen raya, atau lonjakan permintaan jasa yang mendorong pertumbuhan Nilai Tambah Bruto riil (ADHK).
2. **`Menurunkan NTB` (`DECREASE_NTB`):** Gangguan produksi (banjir, hama, kerusakan jalan logistik, penutupan tambang/izin, moratorium tebang, penurunan daya beli tajam) yang menurunkan volume output riil.
3. **`Meningkatkan Harga` (`INCREASE_PRICE`):** Kenaikan harga jual komoditas di tingkat produsen/grosir (HBA naik, harga TBS naik, kenaikan tarif angkut, inflasi harga pangan pokok) yang menaikkan PDRB ADHB melalui komponen indeks harga/deflator implisit produsen.
4. **`Menurunkan Harga` (`DECREASE_PRICE`):** Penurunan harga jual komoditas produsen, panen melimpah yang menekan harga jual petani, atau intervensi subsidi tarif yang menurunkan deflator produsen.

### 5.3 Aturan Pemetaan Komponen PDRB Pengeluaran (`ExpenditureComponentEnum`)
1. **`PK-RT` (`PK_RT` — Pengeluaran Konsumsi Rumah Tangga):** Perubahan daya beli masyarakat, belanja bahan makanan/energi/sandang, penyaluran BLT/bansos tunai yang langsung dibelanjakan, kenaikan/penurunan harga eceran konsumen.
2. **`PK-LNPRT` (`PK_LNPRT` — Konsumsi Lembaga Non-Profit yang Melayani Rumah Tangga):** Aktivitas/hibah operasional ormas, yayasan sosial, lembaga keagamaan, partai politik, atau serikat buruh lokal.
3. **`PK-P` (`PK_P` — Pengeluaran Konsumsi Pemerintah):** Realisasi belanja barang/jasa dan belanja pegawai APBD Pemkab Tana Tidung, belanja operasional dinas, subsidi ongkos angkut oleh Pemda, atau dampak transfer DBH/DAU terhadap ruang belanja rutin pemerintah.
4. **`PMTB` (`PMTB` — Pembentukan Modal Tetap Bruto):** Realisasi belanja modal/infrastruktur fisik (jalan, jembatan, gedung, dermaga), pengadaan mesin/alat berat proyek/perkebunan, atau penanaman baru tanaman perkebunan keras (sawit belum menghasilkan).
5. **`Perubahan Inventori` (`INVENTORY_CHANGE`):** Penimbunan stok (*stockpiling*) komoditas batubara/CPO akibat hambatan pengapalan, atau pencairan cadangan pangan/BBM gudang logistik daerah.
6. **`Ekspor Bersih Antar Daerah/Luar Negeri` (`NET_EXPORT`):** Arus keluar komoditas unggulan KTT ke luar daerah/luar negeri (ekspor batubara, pengiriman CPO/TBS ke pabrik luar KTT, hasil perikanan ke Tarakan) serta arus masuk barang konsumsi/bahan konstruksi dari luar KTT (impor antar daerah; kenaikan impor tanpa imbangan ekspor menurunkan ekspor bersih).

### 5.4 Aturan Dampak Sisi Pengeluaran (`ExpenditureImpactEnum`)
1. **`Meningkatkan Pengeluaran Riil` (`INCREASE_REAL`):** Naiknya volume konsumsi/investasi/ekspor riil pada komponen terkait (ADHK).
2. **`Menurunkan Pengeluaran Riil` (`DECREASE_REAL`):** Turunnya volume konsumsi/investasi/ekspor riil pada komponen terkait (termasuk lonjakan impor yang menekan ekspor bersih riil).
3. **`Meningkatkan Indeks Harga/Deflator` (`INCREASE_DEFLATOR`):** Kenaikan harga konsumen, material konstruksi, atau indeks harga ekspor/barang impor yang mendongkrak komponen harga pada sisi pengeluaran.
4. **`Menurunkan Indeks Harga/Deflator` (`DECREASE_DEFLATOR`):** Penurunan indeks harga barang konsumsi (deflasi melalui pasar murah/SOA) atau anjloknya indeks harga ekspor komoditas.

### 5.5 Matriks Penentuan Periode Triwulan & Waktu Zona
Semua tanggal rilis berita dinormalisasi ke zona waktu **WITA (`Asia/Makassar`, UTC+8)** sebelum dikalkulasi menjadi periode PDRB:
- **Triwulan I (`1`):** Bulan Januari – Maret (Tanggal 1 Jan s.d. 31 Mar)
- **Triwulan II (`2`):** Bulan April – Juni (Tanggal 1 Apr s.d. 30 Jun)
- **Triwulan III (`3`):** Bulan Juli – September (Tanggal 1 Jul s.d. 30 Sep)
- **Triwulan IV (`4`):** Bulan Oktober – Desember (Tanggal 1 Okt s.d. 31 Des)

**Aturan *Override* Konteks Triwulan oleh AI/Admin:** Secara default periode mengikuti `published_at` dalam WITA; namun apabila isi teks secara eksplisit mengevaluasi capaian historis (misalnya rilis berita awal April 2026 yang melaporkan *"Realisasi Investasi Triwulan I 2026"*), AI memprioritaskan periode fenomena eksplisit tersebut (Triwulan I 2026) dan admin berhak melakukan koreksi akhir di Slide-over Drawer.

### 5.6 Siklus Status Verifikasi (`VerificationStatusEnum`)
- `PENDING`: Artikel hasil *crawling* baru (`is_economic_phenomenon = true`), atau artikel dengan `llm_status = 'FAILED'` yang menunggu klasifikasi/review admin. **Tidak tampil di halaman publik.**
- `VERIFIED`: Artikel telah diperiksa admin (atau ditambahkan manual & disetujui) dan siap tampil pada feed publik (`/`) serta menjadi bagian default laporan resmi `.xlsx`. Wajib memiliki seluruh 4 kolom klasifikasi (`kbli_category`, `kbli_impact`, `expenditure_component`, `expenditure_impact`), `quarter`, dan `year` terisi (`NOT NULL`).
- `IGNORED`: Berita non-ekonomi (`is_economic_phenomenon = false`), duplikat topik tanpa informasi baru, atau artikel di luar wilayah dampak. **Tidak tampil di halaman publik**, namun URL tetap tersimpan untuk deduplikasi *crawler*.

---

## 6. Non-Functional Requirements (NFR)

### 6.1 Performa & Sumber Daya VPS Ubuntu 24.04
- **Target Lingkungan:** VPS Ubuntu 24.04 LTS spesifikasi ringan–menengah (minimal 2 vCPU, 2–4 GB RAM) menjalankan PM2 + Nitro `node-server`, PostgreSQL 16 lokal, dan Nginx sebagai *reverse proxy* TLS.
- **Batas Memori Scraper:** *Crawler* tidak menjalankan peramban *headless* (tanpa Chromium/Playwright di runtime produksi). Pengambilan HTML menggunakan `fetch` native Node/Undici + Cheerio dengan batas ukuran respons **2 MB per URL**, *timeout* **15 detik**, dan *concurrency* maksimal **2 koneksi portal paralel** agar puncak pemakaian RAM tetap di bawah 512 MB.
- **Kecepatan Respons UI:** Halaman publik `/` dirender dengan SSR Nuxt + *query caching* terindeks sehingga waktu respon server < 250 ms pada 10.000 baris artikel terarsip.

### 6.2 Toleransi Limit Gemini Flash Free Tier
- **Model Utama & Cadangan:** `gemini-3.8-flash` sebagai model utama; fallback otomatis ke `gemini-3.5-flash-lite` bila model utama mengembalikan HTTP `429`/`503` berulang.
- **Pacing & Budget Token:** Rata-rata panjang prompt + cuplikan 200 kata dijaga sekitar **550–750 input tokens** dan **120–180 output tokens** (~800 total tokens per artikel).
- **Rate Limiter:** Interval antrean minimal **4.500 ms** antar permintaan (~13 RPM), serta mekanisme *exponential backoff with jitter* (10 dtk → 25 dtk → 60 dtk) dan batas kuota pengaman harian per proses (*safety cap* yang dapat dikonfigurasi lewat ENV, default 200 panggilan LLM/run) agar tidak memblokir kuota proyek secara permanen.

### 6.3 Keamanan & Hardening Aplikasi
Mengacu standar OWASP Top 10 dan *security-and-hardening*:
1. **Autentikasi Admin:** Password disimpan dengan hashing **Argon2id** atau **Scrypt** (`node:crypto` scrypt / `@node-rs/argon2`) dengan *salt* unik per user. Sesi menggunakan HTTP-only cookie terenkripsi (`secure`, `sameSite: 'lax'`, masa berlaku 24 jam) disertai pengecekan `token_version` untuk pembatalan sesi instan.
2. **Proteksi Endpoint & Cron:** Seluruh rute `/api/admin/**` dilindungi server middleware verifikasi sesi + peran `ADMIN`. Endpoint internal cron `/api/cron/trigger` mensyaratkan header rahasia `x-cron-secret` dengan pembandingan `crypto.timingSafeEqual`.
3. **Proteksi SSRF pada Scraper:** Setiap URL yang akan diambil (termasuk hasil redirect Google News RSS atau input portal baru) wajib melewati validator skema (`https:`/`http:` saja), resolusi DNS, dan pemblokiran rentang IP privat/loopback/link-local (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `::1`, `fc00::/7`) dengan `redirect: 'manual'` dan batas maksimal 3 lompatan tervalidasi.
4. **Rate Limiting Login:** Pembatasan percobaan `/api/auth/login` maksimal **10 percobaan per 15 menit per IP**.
5. **Validasi Batas Sistem (*System Boundary*):** Seluruh payload request API dan output JSON Gemini wajib melalui validasi **Zod** di sisi server. Output HTML/teks di Vue selalu memakai *auto-escaping* bawaan (dilarang menggunakan `v-html` pada teks berita mentah) serta sanitasi CSV/Excel formula injection (prefixing nilai sel yang diawali `=`, `+`, `-`, `@` saat ekspor `.csv`).
6. **Manajemen Rahasia & Header Keamanan:** `GEMINI_API_KEY`, `NUXT_SESSION_PASSWORD`, `DATABASE_URL`, dan `CRON_SECRET` murni dibaca dari variabel lingkungan `.env` VPS dan tidak pernah dikirim ke client bundle. HTTP headers keamanan (`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, dan CSP `default-src 'self'`) diterapkan oleh Nitro/Nginx.

---

## 7. Kriteria Keberhasilan Peluncuran (Release Metrics)

1. **Kelengkapan Sinyal Daerah:** Minimal 4 portal lokal Tana Tidung + seluruh keyword aktif nasional berhasil di-crawl otomatis tanpa intervensi manual selama 7 hari berturut-turut (`success rate >= 95%` di `scraper_logs`).
2. **Efisiensi Token:** Rata-rata total pemakaian token per artikel terverifikasi < 1.000 tokens berkat *word threshold* 150–250 kata dan deduplikasi `url_hash` 100% bebas duplikat.
3. **Efisiensi Kerja Analis:** Waktu review berita harian oleh staf Nerwilis di `/admin/review` turun menjadi rata-rata <= 15 menit per hari.
4. **Akurasi Struktur Ekspor:** Berkas `.xlsx` dari `/admin/articles` dapat langsung dibuka di Microsoft Excel / LibreOffice Calc dengan urutan tepat 10 kolom sesuai spesifikasi tanpa error format tanggal atau karakter Rusak.

