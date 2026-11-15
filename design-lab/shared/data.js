/* design-lab/shared/data.js
 * Data contoh realistis (fiktif) yang mengikuti struktur API SIPENA KTT.
 * Dipakai bersama oleh semua alternatif arah desain agar perbandingan adil.
 * Bukan data resmi. Tidak terhubung ke production.
 */
window.SIPENA = {
  period: { year: 2026, quarter: 4, label: 'TW IV 2026', prev: 'TW III 2026', range: '1 Okt – 14 Nov 2026', lastSync: '14 Nov 2026, 06:42 WITA' },

  kpi: {
    totalVerified: 48, previousTotal: 41, deltaPercent: 17,
    dominantKbli: { code: 'A', name: 'Pertanian, Kehutanan, dan Perikanan', count: 14, percentage: 29 },
    dominantExpenditure: { code: 'PMTB', label: 'Pembentukan Modal Tetap Bruto', count: 15, percentage: 31 },
    /* Proporsi BERITA, bukan angka pertumbuhan ekonomi. */
    expansion: { volumeUpPercent: 58, volumeUpCount: 28, volumeDownCount: 7, priceOrOtherCount: 13 },
    pendingQueue: 23, llmFailed: 3, coveredSectors: 14, totalSectors: 17, gapSectors: 3
  },

  /* 17 sektor PDRB (urutan resmi). group = kode sektor PDRB, kbli = huruf KBLI 2025 pembentuk */
  sectors: [
    { group: 'A', kbli: 'A', name: 'Pertanian, Kehutanan, dan Perikanan', short: 'Pertanian, Kehutanan & Perikanan', count: 14, cluster: 'PRIMARY' },
    { group: 'B', kbli: 'B', name: 'Pertambangan dan Penggalian', short: 'Pertambangan & Penggalian', count: 6, cluster: 'PRIMARY' },
    { group: 'C', kbli: 'C', name: 'Industri', short: 'Industri', count: 3, cluster: 'INDUSTRY' },
    { group: 'D', kbli: 'D', name: 'Penyediaan Listrik, Gas, Uap/Air Panas, dan Udara Dingin', short: 'Listrik, Gas & Uap', count: 2, cluster: 'INDUSTRY' },
    { group: 'E', kbli: 'E', name: 'Penyediaan Air; Pengelolaan Limbah dan Remediasi', short: 'Air, Limbah & Remediasi', count: 1, cluster: 'INDUSTRY' },
    { group: 'F', kbli: 'F', name: 'Konstruksi', short: 'Konstruksi', count: 8, cluster: 'INDUSTRY' },
    { group: 'G', kbli: 'G', name: 'Perdagangan Besar dan Eceran', short: 'Perdagangan', count: 5, cluster: 'TRADE' },
    { group: 'H', kbli: 'H', name: 'Transportasi dan Penyimpanan', short: 'Transportasi & Pergudangan', count: 4, cluster: 'TRADE' },
    { group: 'I', kbli: 'I', name: 'Penyediaan Akomodasi dan Makan Minum', short: 'Akomodasi & Makan Minum', count: 2, cluster: 'TRADE' },
    { group: 'J,K', kbli: 'J,K', name: 'Informasi dan Komunikasi', short: 'Informasi & Komunikasi', count: 0, cluster: 'TRADE' },
    { group: 'L', kbli: 'L', name: 'Aktivitas Keuangan dan Asuransi', short: 'Keuangan & Asuransi', count: 2, cluster: 'FINANCE' },
    { group: 'M', kbli: 'M', name: 'Aktivitas Real Estat', short: 'Real Estat', count: 0, cluster: 'FINANCE' },
    { group: 'N,O', kbli: 'N,O', name: 'Jasa Perusahaan', short: 'Jasa Perusahaan', count: 1, cluster: 'FINANCE' },
    { group: 'P', kbli: 'P', name: 'Administrasi Pemerintahan dan Pertahanan, serta Jaminan Sosial Wajib', short: 'Administrasi Pemerintahan', count: 9, cluster: 'FINANCE' },
    { group: 'Q', kbli: 'Q', name: 'Pendidikan', short: 'Pendidikan', count: 0, cluster: 'FINANCE' },
    { group: 'R', kbli: 'R', name: 'Aktivitas Kesehatan Manusia dan Aktivitas Sosial', short: 'Kesehatan & Kegiatan Sosial', count: 3, cluster: 'FINANCE' },
    { group: 'S,T,U,V', kbli: 'S,T,U,V', name: 'Jasa Lainnya', short: 'Jasa Lainnya', count: 4, cluster: 'FINANCE' }
  ],

  expenditure: [
    { code: 'PK_RT', label: 'Konsumsi Rumah Tangga', short: 'PK-RT', count: 9 },
    { code: 'PK_LNPRT', label: 'Konsumsi LNPRT', short: 'PK-LNPRT', count: 1 },
    { code: 'PK_P', label: 'Konsumsi Pemerintah', short: 'PK-P', count: 11 },
    { code: 'PMTB', label: 'Pembentukan Modal Tetap Bruto', short: 'PMTB', count: 15 },
    { code: 'INVENTORY_CHANGE', label: 'Perubahan Inventori', short: 'Inventori', count: 2 },
    { code: 'NET_EXPORT', label: 'Ekspor Bersih', short: 'Ekspor Neto', count: 10 }
  ],

  /* 8 triwulan terakhir. volumeUp = berita bernada naik volume; volumeDown; price = harga/deflator */
  trend: [
    { q: 'TW I 25', up: 12, down: 4, price: 6 },
    { q: 'TW II 25', up: 15, down: 5, price: 8 },
    { q: 'TW III 25', up: 18, down: 6, price: 9 },
    { q: 'TW IV 25', up: 14, down: 8, price: 7 },
    { q: 'TW I 26', up: 17, down: 6, price: 10 },
    { q: 'TW II 26', up: 21, down: 5, price: 11 },
    { q: 'TW III 26', up: 22, down: 7, price: 12 },
    { q: 'TW IV 26', up: 28, down: 7, price: 13 }
  ],

  /* Matriks silang 17 sektor x 6 komponen (urutan: PK_RT, PK_LNPRT, PK_P, PMTB, INVENTORY, NET_EXPORT) */
  heatmap: {
    'A':       [3, 0, 0, 1, 2, 8],
    'B':       [0, 0, 0, 2, 0, 4],
    'C':       [1, 0, 0, 1, 0, 1],
    'D':       [0, 0, 1, 1, 0, 0],
    'E':       [0, 0, 1, 0, 0, 0],
    'F':       [0, 0, 2, 6, 0, 0],
    'G':       [4, 0, 0, 0, 0, 1],
    'H':       [1, 0, 1, 1, 0, 1],
    'I':       [2, 0, 0, 0, 0, 0],
    'J,K':     [0, 0, 0, 0, 0, 0],
    'L':       [1, 0, 0, 1, 0, 0],
    'M':       [0, 0, 0, 0, 0, 0],
    'N,O':     [0, 0, 1, 0, 0, 0],
    'P':       [0, 0, 8, 1, 0, 0],
    'Q':       [0, 0, 0, 0, 0, 0],
    'R':       [0, 1, 2, 0, 0, 0],
    'S,T,U,V': [1, 0, 1, 1, 1, 0]
  },

  /* Impact enum -> label manusia. Volume (NTB / riil) vs Harga (harga / deflator). */
  impact: {
    INCREASE_NTB: { label: 'Volume naik', side: 'volume', dir: 'up' },
    DECREASE_NTB: { label: 'Volume turun', side: 'volume', dir: 'down' },
    INCREASE_PRICE: { label: 'Harga naik', side: 'price', dir: 'up' },
    DECREASE_PRICE: { label: 'Harga turun', side: 'price', dir: 'down' }
  },

  /* Fenomena terverifikasi (linimasa). Teks fiktif tetapi realistis. */
  articles: [
    {
      id: 1, date: '14 Okt 2026', iso: '2026-10-14', scope: 'KTT_LOCAL', portal: 'Koran Kaltara',
      title: 'Harga TBS Sawit di Tana Tidung Menguat di Awal Triwulan IV',
      summary: 'Harga pembelian tandan buah segar (TBS) kelapa sawit di tingkat petani naik sekitar 9 persen dibanding akhir September seiring kenaikan harga CPO dan lancarnya pengangkutan dari kebun menuju pabrik.',
      kbli: 'A', kbliName: 'Pertanian, Kehutanan, dan Perikanan', impactKbli: 'INCREASE_PRICE',
      exp: 'NET_EXPORT', expLabel: 'Ekspor Bersih', impactExp: 'INCREASE_DEFLATOR', quarter: 4, confidence: 0.94, model: 'gemini-3.8-flash'
    },
    {
      id: 2, date: '12 Okt 2026', iso: '2026-10-12', scope: 'KTT_LOCAL', portal: 'Benuanta',
      title: 'Pembangunan Gedung Puspem Tahap II Mulai Dikerjakan, Serap Tenaga Kerja Lokal',
      summary: 'Kontraktor memulai pengerjaan struktur gedung perkantoran Puspem Tana Tidung tahap II dengan nilai kontrak puluhan miliar rupiah. Sekitar 120 tenaga kerja lokal dilibatkan pada fase awal.',
      kbli: 'F', kbliName: 'Konstruksi', impactKbli: 'INCREASE_NTB',
      exp: 'PMTB', expLabel: 'Pembentukan Modal Tetap Bruto', impactExp: 'INCREASE_REAL', quarter: 4, confidence: 0.91, model: 'groq:llama-3.3-70b'
    },
    {
      id: 3, date: '9 Okt 2026', iso: '2026-10-09', scope: 'KALTARA_PROVINCIAL', portal: 'Tribun Kaltara',
      title: 'Pemprov Kaltara Salurkan Subsidi Ongkos Angkut ke Wilayah Pedalaman',
      summary: 'Subsidi ongkos angkut (SOA) untuk bahan pokok ke wilayah pedalaman Kaltara dilanjutkan pada triwulan IV, termasuk jalur sungai menuju sejumlah desa di Tana Tidung.',
      kbli: 'H', kbliName: 'Transportasi dan Penyimpanan', impactKbli: 'DECREASE_PRICE',
      exp: 'PK_P', expLabel: 'Konsumsi Pemerintah', impactExp: 'INCREASE_REAL', quarter: 4, confidence: 0.82, model: 'gemini-3.8-flash'
    },
    {
      id: 4, date: '6 Okt 2026', iso: '2026-10-06', scope: 'KTT_LOCAL', portal: 'Radar Tarakan',
      title: 'Produksi Udang Tambak Tideng Pale Turun Akibat Cuaca Ekstrem',
      summary: 'Pembudidaya melaporkan panen udang vaname menurun sekitar sepertiga dari target karena salinitas dan suhu air yang tidak stabil selama dua pekan terakhir.',
      kbli: 'A', kbliName: 'Pertanian, Kehutanan, dan Perikanan', impactKbli: 'DECREASE_NTB',
      exp: 'NET_EXPORT', expLabel: 'Ekspor Bersih', impactExp: 'DECREASE_REAL', quarter: 4, confidence: 0.58, model: 'groq:llama-3.1-8b'
    },
    {
      id: 5, date: '3 Okt 2026', iso: '2026-10-03', scope: 'NATIONAL_MACRO_IMPACT', portal: 'Bing News',
      title: 'Kenaikan Harga Batubara Acuan Dorong Aktivitas Tambang Skala Kecil',
      summary: 'Harga batubara acuan (HBA) bulan Oktober naik dan mendorong pemanfaatan kembali konsesi skala kecil di Kaltara, termasuk di sekitar wilayah Sesayap.',
      kbli: 'B', kbliName: 'Pertambangan dan Penggalian', impactKbli: 'INCREASE_PRICE',
      exp: 'NET_EXPORT', expLabel: 'Ekspor Bersih', impactExp: 'INCREASE_DEFLATOR', quarter: 4, confidence: 0.77, model: 'gemini-3.5-flash-lite'
    },
    {
      id: 6, date: '1 Okt 2026', iso: '2026-10-01', scope: 'KTT_LOCAL', portal: 'Koran Kaltara',
      title: 'Realisasi Belanja Pegawai dan TPP ASN Pemkab Tana Tidung Capai 74 Persen',
      summary: 'Realisasi belanja pegawai dan tambahan penghasilan pegawai ASN hingga akhir September mencapai 74 persen dari pagu APBD, menopang konsumsi rumah tangga di Tideng Pale.',
      kbli: 'P', kbliName: 'Administrasi Pemerintahan dan Pertahanan, serta Jaminan Sosial Wajib', impactKbli: 'INCREASE_NTB',
      exp: 'PK_P', expLabel: 'Konsumsi Pemerintah', impactExp: 'INCREASE_REAL', quarter: 4, confidence: 0.89, model: 'gemini-3.8-flash'
    }
  ],

  /* Slot LLM untuk halaman monitor */
  providerSlots: [
    { priority: 1, provider: 'Gemini', model: 'gemini-3.8-flash', rpm: 15, tpm: 250000, calls: 412, success: 99, limited: 2, tokens: 1840000 },
    { priority: 2, provider: 'Gemini', model: 'gemini-3.5-flash-lite', rpm: 30, tpm: 250000, calls: 96, success: 97, limited: 5, tokens: 402000 },
    { priority: 3, provider: 'Groq', model: 'llama-3.3-70b-versatile', rpm: 30, tpm: 12000, calls: 188, success: 94, limited: 21, tokens: 760000 },
    { priority: 4, provider: 'Groq', model: 'llama-3.1-8b-instant', rpm: 30, tpm: 6000, calls: 41, success: 88, limited: 9, tokens: 118000 },
    { priority: 5, provider: 'OpenRouter', model: 'free-rotation', rpm: 20, tpm: 0, calls: 0, success: 0, limited: 0, tokens: 0 }
  ],

  /* Menu navigasi admin (ikuti layout/admin.vue) */
  nav: [
    { group: 'Analitik & Rangkuman', items: ['Dashboard & Gap Sektoral', 'Tren & Komparasi', 'Sintesis Fenomena'] },
    { group: 'Kurasi & Repositori', items: ['Review Harian', 'Bank Data & Ekspor'] },
    { group: 'Sumber & Taksonomi', items: ['Direktori Portal', 'Master Keyword', 'Kamus Taksonomi', 'Konkordansi KBLI'] },
    { group: 'Sistem', items: ['Monitor Scraper & AI', 'Kelola Akses & Tim'] }
  ]
};
