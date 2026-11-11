/**
 * KBLI 2020 ↔ KBLI 2025 Automated Crosswalk Engine
 * Sourced from BPS RI Official Publication: BPS0000 (Peraturan BPS No. 7 Tahun 2025, Lampiran 5)
 * Tailored for Kabupaten Tana Tidung (BPS 65.04) Primary Economic Transmissions (PDRB ADHB 2025 Seri 2010)
 */

export interface KbliConversionItem {
  code2020: string;
  title2020: string;
  code2025: string;
  title2025: string;
  category: string; // PDRB Seri 2010 (17 Kategori A..R_S_T_U)
  category2025: string; // KBLI 2025 (22 Kategori A..V)
  conversionType: "1_to_1" | "split_1_to_n" | "merge_n_to_1" | "many_to_many";
  pdrbSector: string;
  isKttDominant: boolean;
  notes: string;
}

export const TOP_KTT_KBLI_CONVERSIONS: KbliConversionItem[] = [
  // SEKTOR B - PERTAMBANGAN DAN PENGGALIAN (37.80% PDRB KTT)
  {
    code2020: "05100",
    title2020: "Pertambangan Batu Bara",
    code2025: "05101",
    title2025: "Pertambangan Batu Bara",
    category: "B",
    category2025: "B",
    conversionType: "split_1_to_n",
    pdrbSector: "Pertambangan Batu Bara & Lignit (37.80%)",
    isKttDominant: true,
    notes:
      "Lampiran 5 BPS0000 (1-ke-N): 05100 dipecah menjadi 05101 (Pertambangan Batu Bara) dan 05102 (Benefisiasi atau Peningkatan Kualitas Batu Bara).",
  },
  {
    code2020: "05200",
    title2020: "Pertambangan Lignit",
    code2025: "05200",
    title2025: "Pertambangan Lignit",
    category: "B",
    category2025: "B",
    conversionType: "1_to_1",
    pdrbSector: "Pertambangan Batu Bara & Lignit (37.80%)",
    isKttDominant: false,
    notes: "Konversi 1-ke-1; kode dan judul resmi identik di KBLI 2025.",
  },

  // SEKTOR A - PERTANIAN, KEHUTANAN, DAN PERIKANAN (23.41% PDRB KTT)
  {
    code2020: "01262",
    title2020: "Perkebunan Buah Kelapa Sawit",
    code2025: "01262",
    title2025: "Pertanian Kelapa Sawit",
    category: "A",
    category2025: "A",
    conversionType: "1_to_1",
    pdrbSector: "Tanaman Perkebunan Sawit (23.41%)",
    isKttDominant: true,
    notes:
      "Konversi 1-ke-1; nomenklatur KBLI 2025 diselaraskan dari 'Perkebunan Buah Kelapa Sawit' menjadi 'Pertanian Kelapa Sawit'.",
  },
  {
    code2020: "01121",
    title2020: "Pertanian Padi Hibrida",
    code2025: "01121",
    title2025: "Pertanian Padi Hibrida",
    category: "A",
    category2025: "A",
    conversionType: "1_to_1",
    pdrbSector: "Tanaman Pangan (23.41%)",
    isKttDominant: false,
    notes: "Konversi 1-ke-1; budidaya padi sawah hibrida di Sesayap dan Betayau.",
  },
  {
    code2020: "01122",
    title2020: "Pertanian Padi Inbrida",
    code2025: "01122",
    title2025: "Pertanian Padi Inbrida",
    category: "A",
    category2025: "A",
    conversionType: "1_to_1",
    pdrbSector: "Tanaman Pangan (23.41%)",
    isKttDominant: false,
    notes: "Konversi 1-ke-1; mencakup varietas padi inbrida lokal Tana Tidung.",
  },
  {
    code2020: "02111",
    title2020: "Pemanfaatan Kayu Hutan Tanaman pada Hutan Produksi",
    code2025: "02102",
    title2025: "Pemanfaatan Kayu Hutan",
    category: "A",
    category2025: "A",
    conversionType: "merge_n_to_1",
    pdrbSector: "Kehutanan & Penebangan Kayu (23.41%)",
    isKttDominant: false,
    notes:
      "Penggabungan N-ke-1: 02111-02119 & 02121-02122 di KBLI 2020 digabung ke kode 02102 pada KBLI 2025.",
  },
  {
    code2020: "02201",
    title2020: "Pemanenan kayu",
    code2025: "02201",
    title2025: "Pemanenan Kayu",
    category: "A",
    category2025: "A",
    conversionType: "1_to_1",
    pdrbSector: "Kehutanan & Penebangan Kayu (23.41%)",
    isKttDominant: false,
    notes: "Konversi 1-ke-1; penebangan/pemanenan kayu hutan produksi di KTT.",
  },
  {
    code2020: "03111",
    title2020: "Penangkapan Pisces/Ikan Bersirip Di Laut",
    code2025: "03110",
    title2025: "Penangkapan Ikan dan Biota Air Lainnya di Laut",
    category: "A",
    category2025: "A",
    conversionType: "merge_n_to_1",
    pdrbSector: "Perikanan Tangkap (23.41%)",
    isKttDominant: false,
    notes:
      "Penggabungan N-ke-1: selaras ke 03110 untuk aktivitas nelayan muara & pesisir Tana Lia.",
  },
  {
    code2020: "03251",
    title2020: "Pembesaran Pisces/Ikan Bersirip Air Payau",
    code2025: "03231",
    title2025:
      "Pembudidayaan Ikan Bersirip (Selain Ikan Hias) dan Biota Air Payau Lainnya yang Tidak Dilindungi",
    category: "A",
    category2025: "A",
    conversionType: "many_to_many",
    pdrbSector: "Perikanan Budidaya Tambak (23.41%)",
    isKttDominant: false,
    notes:
      "Many-to-many ke 03231 (ikan konsumsi/udang/bandeng tambak) atau 03232 (ikan hias air payau).",
  },

  // SEKTOR F - KONSTRUKSI (18.46% PDRB KTT)
  {
    code2020: "41011",
    title2020: "Konstruksi Gedung Hunian",
    code2025: "41011",
    title2025: "Konstruksi Konvensional Gedung Hunian",
    category: "F",
    category2025: "F",
    conversionType: "1_to_1",
    pdrbSector: "Konstruksi (18.46%)",
    isKttDominant: true,
    notes: "Konversi 1-ke-1 dengan penegasan metode konstruksi konvensional.",
  },
  {
    code2020: "41012",
    title2020: "Konstruksi Gedung Perkantoran",
    code2025: "41012",
    title2025: "Konstruksi Konvensional Gedung Perkantoran",
    category: "F",
    category2025: "F",
    conversionType: "1_to_1",
    pdrbSector: "Konstruksi (18.46%)",
    isKttDominant: true,
    notes:
      "Konversi 1-ke-1; mencakup pembangunan gedung Pusat Pemerintahan Terpadu KTT di Bundaran Sebawang.",
  },
  {
    code2020: "41015",
    title2020: "Konstruksi Gedung Kesehatan",
    code2025: "41015",
    title2025: "Konstruksi Konvensional Gedung Kesehatan",
    category: "F",
    category2025: "F",
    conversionType: "1_to_1",
    pdrbSector: "Konstruksi (18.46%)",
    isKttDominant: true,
    notes: "Konversi 1-ke-1; pembangunan fasilitas RSUD & puskesmas KTT.",
  },
  {
    code2020: "42101",
    title2020: "Konstruksi Bangunan Sipil Jalan",
    code2025: "42101",
    title2025: "Konstruksi Jalan pada Permukaan Tanah",
    category: "F",
    category2025: "F",
    conversionType: "merge_n_to_1",
    pdrbSector: "Konstruksi (18.46%)",
    isKttDominant: true,
    notes:
      "Penggabungan N-ke-1 menjadi 42101; proyek jalan poros Tideng Pale - Sesayap - Sebawang.",
  },
  {
    code2020: "42912",
    title2020: "Konstruksi Bangunan Pelabuhan Bukan Perikanan",
    code2025: "42912",
    title2025: "Konstruksi Bangunan Pelabuhan Bukan Perikanan",
    category: "F",
    category2025: "F",
    conversionType: "merge_n_to_1",
    pdrbSector: "Konstruksi (18.46%)",
    isKttDominant: true,
    notes:
      "Konstruksi pelabuhan/dermaga umum & niaga (Bebatu, Sedulun, Sebawang). Kode 42911 dikhususkan bagi bangunan prasarana sumber daya air.",
  },

  // SEKTOR O - ADMINISTRASI PEMERINTAHAN (8.47% PDRB KTT)
  {
    code2020: "84112",
    title2020: "Penyelenggaraan Pemerintah Negara Dan Kesekretariatan Negara",
    code2025: "84112",
    title2025: "Penyelenggaraan Pemerintahan Negara dan Kesekretariatan Negara",
    category: "O",
    category2025: "P",
    conversionType: "1_to_1",
    pdrbSector: "Administrasi Pemerintahan (8.47%)",
    isKttDominant: true,
    notes:
      "Kode 5-digit tetap 84112; pada KBLI 2025 Kategori Sektor bergeser dari O ke P (Administrasi Pemerintahan, Pertahanan, dan Jaminan Sosial Wajib).",
  },
  {
    code2020: "84119",
    title2020: "Kegiatan Administrasi Pemerintahan Lainnya",
    code2025: "84119",
    title2025: "Kegiatan Administrasi Pemerintahan Lainnya",
    category: "O",
    category2025: "P",
    conversionType: "1_to_1",
    pdrbSector: "Administrasi Pemerintahan (8.47%)",
    isKttDominant: true,
    notes:
      "Operasional rutin OPD Pemkab Tana Tidung (belanja barang/jasa & pegawai). Kategori KBLI 2025: P.",
  },

  // SEKTOR G - PERDAGANGAN BESAR & ECERAN (5.06% PDRB KTT)
  {
    code2020: "47111",
    title2020:
      "Perdagangan Eceran Berbagai Macam Barang Yang Utamanya Makanan, Minuman Atau Tembakau Di Minimarket/Supermarket/Hypermarket",
    code2025: "47111",
    title2025:
      "Perdagangan Eceran Berbagai Macam Barang yang Utamanya Makanan, Minuman, atau Tembakau dengan Sistem Swalayan",
    category: "G",
    category2025: "G",
    conversionType: "1_to_1",
    pdrbSector: "Perdagangan Besar & Eceran (5.06%)",
    isKttDominant: false,
    notes: "Konversi 1-ke-1 dengan penyederhanaan frasa 'dengan Sistem Swalayan'.",
  },

  // SEKTOR C - INDUSTRI PENGOLAHAN (3.54% PDRB KTT)
  {
    code2020: "10431",
    title2020: "Industri Minyak Mentah Kelapa Sawit (Crude Palm Oil)",
    code2025: "10431",
    title2025: "Industri Minyak Mentah Kelapa Sawit (Crude Palm Oil)",
    category: "C",
    category2025: "C",
    conversionType: "1_to_1",
    pdrbSector: "Industri Pengolahan (3.54%)",
    isKttDominant: false,
    notes: "Konversi 1-ke-1; pabrik pengolahan TBS menjadi CPO di Sesayap & Betayau.",
  },
  {
    code2020: "16101",
    title2020: "Industri Penggergajian Kayu",
    code2025: "16101",
    title2025: "Penggergajian dan Penghalusan Kayu",
    category: "C",
    category2025: "C",
    conversionType: "1_to_1",
    pdrbSector: "Industri Pengolahan (3.54%)",
    isKttDominant: false,
    notes: "Konversi 1-ke-1 dengan perluasan judul pada penghalusan kayu.",
  },

  // SEKTOR H - TRANSPORTASI & PERGUDANGAN (0.64% PDRB KTT)
  {
    code2020: "50211",
    title2020: "Angkutan Sungai dan Danau Liner (Trayek Tetap dan Teratur) untuk Penumpang",
    code2025: "50211",
    title2025: "Angkutan Sungai dan Danau Liner (Trayek Tetap dan Teratur) untuk Penumpang",
    category: "H",
    category2025: "H",
    conversionType: "1_to_1",
    pdrbSector: "Transportasi & Pergudangan (0.64%)",
    isKttDominant: false,
    notes:
      "Konversi 1-ke-1; angkutan speedboat penumpang reguler rute Tideng Pale (Pelabuhan Sedulun) - Tarakan.",
  },
  {
    code2020: "50221",
    title2020: "Angkutan Sungai dan Danau untuk Barang Umum dan/atau Hewan",
    code2025: "50221",
    title2025: "Angkutan Sungai dan Danau untuk Barang Umum",
    category: "H",
    category2025: "H",
    conversionType: "1_to_1",
    pdrbSector: "Transportasi & Pergudangan (0.64%)",
    isKttDominant: false,
    notes: "Distribusi kargo bahan bangunan & komoditas perairan Sungai Sesayap.",
  },
  {
    code2020: "50132",
    title2020: "Angkutan Laut Perairan Pelabuhan Dalam Negeri untuk Barang",
    code2025: "52227",
    title2025: "Angkutan Perairan Pelabuhan",
    category: "H",
    category2025: "H",
    conversionType: "merge_n_to_1",
    pdrbSector: "Transportasi & Pergudangan (0.64%)",
    isKttDominant: false,
    notes:
      "Perubahan kode pada BPS0000: 50132 digabung menjadi 52227 (Angkutan Perairan Pelabuhan).",
  },

  // SEKTOR D & J (INFRASTRUKTUR ENERGI & KOMUNIKASI)
  {
    code2020: "35111",
    title2020: "Pembangkitan Tenaga Listrik",
    code2025: "35111",
    title2025:
      "Pembangkitan Tenaga Listrik dari Sumber Energi Tidak Terbarukan yang Menghasilkan Emisi",
    category: "D",
    category2025: "D",
    conversionType: "split_1_to_n",
    pdrbSector: "Pengadaan Listrik & Gas (0.02%)",
    isKttDominant: false,
    notes:
      "Lampiran 5 (1-ke-N): dipecah menjadi 35111 (fosil emisi), 35112 (fosil non-emisi), dan 35120 (energi terbarukan).",
  },
  {
    code2020: "61100",
    title2020: "Aktivitas Telekomunikasi Dengan Kabel",
    code2025: "61101",
    title2025: "Aktivitas Telekomunikasi dengan Kabel",
    category: "J",
    category2025: "K",
    conversionType: "many_to_many",
    pdrbSector: "Informasi & Komunikasi (0.04%)",
    isKttDominant: false,
    notes:
      "Lampiran 5 (many-to-many): terpetakan ke 61101 / 61108; di KBLI 2025 telekomunikasi masuk Kategori K.",
  },
];

/**
 * Cari konversi KBLI 2025 dari katalog highlight Tana Tidung
 */
export function lookupKbliConversion(query: string): KbliConversionItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return TOP_KTT_KBLI_CONVERSIONS;

  return TOP_KTT_KBLI_CONVERSIONS.filter(
    (item) =>
      item.code2020.includes(q) ||
      item.code2025.includes(q) ||
      item.title2020.toLowerCase().includes(q) ||
      item.title2025.toLowerCase().includes(q) ||
      item.pdrbSector.toLowerCase().includes(q) ||
      item.notes.toLowerCase().includes(q)
  );
}

/**
 * Dapatkan konversi otomatis KBLI 2020 ke 2025 dari katalog highlight (client-safe)
 */
export function convertKbli2020To2025(code2020: string): {
  code2025: string;
  title2025: string;
  category: string;
  category2025: string;
} {
  const normalized = code2020.trim();
  const match = TOP_KTT_KBLI_CONVERSIONS.find((i) => i.code2020 === normalized);
  if (match) {
    return {
      code2025: match.code2025,
      title2025: match.title2025,
      category: match.category,
      category2025: match.category2025,
    };
  }
  return {
    code2025: normalized,
    title2025: `KBLI 2025 (${normalized})`,
    category: "O",
    category2025: "P",
  };
}
