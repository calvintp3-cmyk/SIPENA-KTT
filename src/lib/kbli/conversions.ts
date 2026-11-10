/**
 * KBLI 2020 ↔ KBLI 2025 Automated Crosswalk Engine
 * Sourced from BPS RI Official Publication: BPS0000 (Lampiran 1 - Lampiran 10)
 * Tailored for Kabupaten Tana Tidung (BPS 65.04) Primary Economic Transmissions
 */

export interface KbliConversionItem {
  code2020: string;
  title2020: string;
  code2025: string;
  title2025: string;
  category: string;
  pdrbSector: string;
  isKttDominant: boolean;
  notes: string;
}

export const TOP_KTT_KBLI_CONVERSIONS: KbliConversionItem[] = [
  // SEKTOR B - PERTAMBANGAN BATUBARA (37.80% PDRB KTT)
  {
    code2020: "05100",
    title2020: "Pertambangan Batubara",
    code2025: "05101",
    title2025: "Penambangan Batubara",
    category: "B",
    pdrbSector: "Pertambangan Batubara & Lignit",
    isKttDominant: true,
    notes: "Pecahan 1-ke-1 lampiran 1 BPS0000; penyesuaian istilah ke 'Penambangan'.",
  },
  {
    code2020: "05200",
    title2020: "Pertambangan Lignit",
    code2025: "05200",
    title2025: "Penambangan Lignit",
    category: "B",
    pdrbSector: "Pertambangan Batubara & Lignit",
    isKttDominant: false,
    notes: "Kode tetap; penyesuaian tata bahasa.",
  },

  // SEKTOR A - PERKEBUNAN SAWIT & PERTANIAN (23.41% PDRB KTT)
  {
    code2020: "01262",
    title2020: "Perkebunan Buah Kelapa Sawit",
    code2025: "01262",
    title2025: "Perkebunan Buah Kelapa Sawit",
    category: "A",
    pdrbSector: "Tanaman Perkebunan",
    isKttDominant: true,
    notes: "Kode dan deskripsi identik tetap berlaku.",
  },
  {
    code2020: "01121",
    title2020: "Pertanian Padi Hibrida",
    code2025: "01121",
    title2025: "Pertanian Padi Hibrida",
    category: "A",
    pdrbSector: "Tanaman Pangan",
    isKttDominant: false,
    notes: "Pertanian padi sawah tadah hujan & irigasi Sesayap.",
  },
  {
    code2020: "02111",
    title2020: "Pemanenan Kayu",
    code2025: "02111",
    title2025: "Pemanenan Kayu",
    category: "A",
    pdrbSector: "Kehutanan & Penebangan Kayu",
    isKttDominant: false,
    notes: "HTI dan HPH Tana Tidung.",
  },
  {
    code2020: "03111",
    title2020: "Penangkapan Biota Laut",
    code2025: "03111",
    title2025: "Penangkapan Biota Air Laut",
    category: "A",
    pdrbSector: "Perikanan Tangkap & Budidaya",
    isKttDominant: false,
    notes: "Nelayan muara & pesisir Tana Lia.",
  },

  // SEKTOR F - KONSTRUKSI (18.46% PDRB KTT)
  {
    code2020: "41011",
    title2020: "Konstruksi Gedung Tempat Tinggal",
    code2025: "41011",
    title2025: "Konstruksi Gedung Tempat Tinggal",
    category: "F",
    pdrbSector: "Konstruksi",
    isKttDominant: true,
    notes: "Kode tetap.",
  },
  {
    code2020: "41012",
    title2020: "Konstruksi Gedung Perkantoran / Pemda",
    code2025: "41012",
    title2025: "Konstruksi Gedung Perkantoran",
    category: "F",
    pdrbSector: "Konstruksi",
    isKttDominant: true,
    notes: "Realisasi pembangunan Pusat Pemerintahan Terpadu KTT.",
  },
  {
    code2020: "42101",
    title2020: "Konstruksi Bangunan Sipil Jalan",
    code2025: "42101",
    title2025: "Konstruksi Bangunan Sipil Jalan",
    category: "F",
    pdrbSector: "Konstruksi",
    isKttDominant: true,
    notes: "Jalan lingkar Tideng Pale - Sesayap - Betayau.",
  },
  {
    code2020: "42911",
    title2020: "Konstruksi Bangunan Pelabuhan",
    code2025: "42911",
    title2025: "Konstruksi Bangunan Pelabuhan dan Dermaga",
    category: "F",
    pdrbSector: "Konstruksi",
    isKttDominant: true,
    notes: "Dermaga Bebatu & pelabuhan feri Sebawang.",
  },

  // SEKTOR O - ADMINISTRASI PEMERINTAHAN (8.47% PDRB KTT)
  {
    code2020: "84111",
    title2020: "Administrasi Pemerintahan Umum",
    code2025: "84111",
    title2025: "Administrasi Pemerintahan Umum",
    category: "O",
    pdrbSector: "Administrasi Pemerintahan",
    isKttDominant: true,
    notes: "Belanja pegawai & barang/jasa Pemkab Tana Tidung.",
  },

  // SEKTOR G - PERDAGANGAN BESAR & ECERAN (5.06% PDRB KTT)
  {
    code2020: "47111",
    title2020: "Perdagangan Eceran Berbagai Macam Barang Utama Makanan",
    code2025: "47111",
    title2025: "Perdagangan Eceran Utama Makanan/Minuman",
    category: "G",
    pdrbSector: "Perdagangan Eceran",
    isKttDominant: false,
    notes: "Sembako, pasar murah, operasi pasar Tideng Pale.",
  },

  // SEKTOR H - TRANSPORTASI & PERGUDANGAN (2.61% PDRB KTT)
  {
    code2020: "50111",
    title2020: "Angkutan Laut Perairan Pelabuhan (Tongkang & Tugboat)",
    code2025: "50111",
    title2025: "Angkutan Laut Pelabuhan",
    category: "H",
    pdrbSector: "Transportasi Perairan",
    isKttDominant: false,
    notes: "Frekuensi tongkang batubara dan CPO di perairan Sesayap/Bebatu.",
  },
];

/**
 * Cari konversi KBLI 2025 berdasarkan kode atau kata kunci
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
      item.pdrbSector.toLowerCase().includes(q)
  );
}

/**
 * Dapatkan konversi otomatis 2020 ke 2025
 */
export function convertKbli2020To2025(code2020: string): { code2025: string; title2025: string } {
  const match = TOP_KTT_KBLI_CONVERSIONS.find((i) => i.code2020 === code2020);
  if (match) {
    return { code2025: match.code2025, title2025: match.title2025 };
  }
  return { code2025: code2020, title2025: `KBLI 2025 (${code2020})` };
}

