export interface KbliMeta {
  code:
    | "A"
    | "B"
    | "C"
    | "D"
    | "E"
    | "F"
    | "G"
    | "H"
    | "I"
    | "J"
    | "K"
    | "L"
    | "M_N"
    | "O"
    | "P"
    | "Q"
    | "R_S_T_U";
  shortName: string;
  fullName: string;
  badgeColor: string;
  swatchColor: string;
  barColor: string;
}

export const KBLI_CATEGORIES: Record<KbliMeta["code"], KbliMeta> = {
  A: {
    code: "A",
    shortName: "Pertanian & Perikanan",
    fullName: "A. Pertanian, Kehutanan, dan Perikanan",
    badgeColor:
      "border-emerald-200/90 bg-emerald-50/80 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-200",
    swatchColor: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    barColor: "bg-emerald-600 dark:bg-emerald-500",
  },
  B: {
    code: "B",
    shortName: "Pertambangan",
    fullName: "B. Pertambangan dan Penggalian",
    badgeColor:
      "border-amber-200/90 bg-amber-50/80 text-amber-800 dark:border-amber-800/60 dark:bg-amber-950/50 dark:text-amber-200",
    swatchColor: "bg-amber-100 text-amber-800 border border-amber-200",
    barColor: "bg-emerald-600 dark:bg-emerald-500",
  },
  C: {
    code: "C",
    shortName: "Industri Pengolahan",
    fullName: "C. Industri Pengolahan",
    badgeColor:
      "border-teal-200/90 bg-teal-50/80 text-teal-800 dark:border-teal-800/60 dark:bg-teal-950/50 dark:text-teal-200",
    swatchColor: "bg-teal-100 text-teal-800 border border-teal-200",
    barColor: "bg-emerald-600 dark:bg-emerald-500",
  },
  D: {
    code: "D",
    shortName: "Listrik & Gas",
    fullName: "D. Pengadaan Listrik dan Gas",
    badgeColor:
      "border-slate-200 bg-slate-100/90 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200",
    swatchColor: "bg-slate-100 text-slate-800 border border-slate-200",
    barColor: "bg-slate-700 dark:bg-slate-400",
  },
  E: {
    code: "E",
    shortName: "Air & Pengelolaan Limbah",
    fullName: "E. Pengadaan Air, Pengelolaan Sampah, Limbah & Daur Ulang",
    badgeColor:
      "border-cyan-200/90 bg-cyan-50/80 text-cyan-800 dark:border-cyan-800/60 dark:bg-cyan-950/50 dark:text-cyan-200",
    swatchColor: "bg-cyan-100 text-cyan-800 border border-cyan-200",
    barColor: "bg-teal-600 dark:bg-teal-500",
  },
  F: {
    code: "F",
    shortName: "Konstruksi",
    fullName: "F. Konstruksi",
    badgeColor:
      "border-emerald-200/90 bg-emerald-50/80 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-200",
    swatchColor: "bg-emerald-100 text-emerald-800 border border-emerald-200",
    barColor: "bg-emerald-600 dark:bg-emerald-500",
  },
  G: {
    code: "G",
    shortName: "Perdagangan",
    fullName: "G. Perdagangan Besar dan Eceran; Reparasi Mobil & Motor",
    badgeColor:
      "border-sky-200/90 bg-sky-50/80 text-sky-800 dark:border-sky-800/60 dark:bg-sky-950/50 dark:text-sky-200",
    swatchColor: "bg-sky-100 text-sky-800 border border-sky-200",
    barColor: "bg-slate-700 dark:bg-slate-400",
  },
  H: {
    code: "H",
    shortName: "Transportasi",
    fullName: "H. Transportasi dan Pergudangan",
    badgeColor:
      "border-indigo-200/90 bg-indigo-50/80 text-indigo-800 dark:border-indigo-800/60 dark:bg-indigo-950/50 dark:text-indigo-200",
    swatchColor: "bg-indigo-100 text-indigo-800 border border-indigo-200",
    barColor: "bg-slate-700 dark:bg-slate-400",
  },
  I: {
    code: "I",
    shortName: "Akomodasi & Mamin",
    fullName: "I. Penyediaan Akomodasi dan Makan Minum",
    badgeColor:
      "border-orange-200/90 bg-orange-50/80 text-orange-800 dark:border-orange-800/60 dark:bg-orange-950/50 dark:text-orange-200",
    swatchColor: "bg-orange-100 text-orange-800 border border-orange-200",
    barColor: "bg-slate-700 dark:bg-slate-400",
  },
  J: {
    code: "J",
    shortName: "Informasi & Komunikasi",
    fullName: "J. Informasi dan Komunikasi",
    badgeColor:
      "border-blue-200/90 bg-blue-50/80 text-blue-800 dark:border-blue-800/60 dark:bg-blue-950/50 dark:text-blue-200",
    swatchColor: "bg-blue-100 text-blue-800 border border-blue-200",
    barColor: "bg-slate-700 dark:bg-slate-400",
  },
  K: {
    code: "K",
    shortName: "Jasa Keuangan",
    fullName: "K. Jasa Keuangan dan Asuransi",
    badgeColor:
      "border-lime-200/90 bg-lime-50/80 text-lime-800 dark:border-lime-800/60 dark:bg-lime-950/50 dark:text-lime-200",
    swatchColor: "bg-lime-100 text-lime-800 border border-lime-200",
    barColor: "bg-emerald-600 dark:bg-emerald-500",
  },
  L: {
    code: "L",
    shortName: "Real Estat",
    fullName: "L. Real Estat",
    badgeColor:
      "border-slate-200 bg-slate-100/90 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200",
    swatchColor: "bg-slate-100 text-slate-800 border border-slate-200",
    barColor: "bg-slate-700 dark:bg-slate-400",
  },
  M_N: {
    code: "M_N",
    shortName: "Jasa Perusahaan",
    fullName: "M,N. Jasa Perusahaan",
    badgeColor:
      "border-violet-200/90 bg-violet-50/80 text-violet-800 dark:border-violet-800/60 dark:bg-violet-950/50 dark:text-violet-200",
    swatchColor: "bg-violet-100 text-violet-800 border border-violet-200",
    barColor: "bg-slate-700 dark:bg-slate-400",
  },
  O: {
    code: "O",
    shortName: "Adm. Pemerintahan",
    fullName: "O. Administrasi Pemerintahan, Pertahanan & Jaminan Sosial Wajib",
    badgeColor:
      "border-slate-200 bg-slate-100/90 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200",
    swatchColor: "bg-slate-100 text-slate-800 border border-slate-200",
    barColor: "bg-slate-800 dark:bg-slate-300",
  },
  P: {
    code: "P",
    shortName: "Jasa Pendidikan",
    fullName: "P. Jasa Pendidikan",
    badgeColor:
      "border-sky-200/90 bg-sky-50/80 text-sky-800 dark:border-sky-800/60 dark:bg-sky-950/50 dark:text-sky-200",
    swatchColor: "bg-sky-100 text-sky-800 border border-sky-200",
    barColor: "bg-slate-700 dark:bg-slate-400",
  },
  Q: {
    code: "Q",
    shortName: "Jasa Kesehatan",
    fullName: "Q. Jasa Kesehatan dan Kegiatan Sosial",
    badgeColor:
      "border-rose-200/90 bg-rose-50/80 text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-200",
    swatchColor: "bg-rose-100 text-rose-800 border border-rose-200",
    barColor: "bg-slate-700 dark:bg-slate-400",
  },
  R_S_T_U: {
    code: "R_S_T_U",
    shortName: "Jasa Lainnya",
    fullName: "R,S,T,U. Jasa Lainnya",
    badgeColor:
      "border-slate-200 bg-slate-100/90 text-slate-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-200",
    swatchColor: "bg-slate-100 text-slate-800 border border-slate-200",
    barColor: "bg-slate-600 dark:bg-slate-400",
  },
};

export const KBLI_LIST = Object.values(KBLI_CATEGORIES);

export const EXPENDITURE_COMPONENTS = {
  PK_RT: {
    code: "PK_RT",
    label: "PK-RT",
    fullName: "Pengeluaran Konsumsi Rumah Tangga",
    description: "Harga bahan pokok, inflasi pangan, daya beli masyarakat",
    badgeColor:
      "border-slate-200 bg-slate-100/80 text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200",
  },
  PK_LNPRT: {
    code: "PK_LNPRT",
    label: "PK-LNPRT",
    fullName: "Pengeluaran Konsumsi LNPRT",
    description: "Belanja ormas, lembaga sosial, keagamaan & parpol",
    badgeColor:
      "border-slate-200 bg-slate-100/80 text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200",
  },
  PK_P: {
    code: "PK_P",
    label: "PK-P",
    fullName: "Pengeluaran Konsumsi Pemerintah",
    description: "Belanja pegawai, barang/jasa APBD, THR/Gaji-13, bansos",
    badgeColor:
      "border-slate-200 bg-slate-100/80 text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200",
  },
  PMTB: {
    code: "PMTB",
    label: "PMTB",
    fullName: "Pembentukan Modal Tetap Bruto (Investasi)",
    description: "Proyek fisik infrastruktur, bangunan, alat berat & mesin",
    badgeColor:
      "border-emerald-200/90 bg-emerald-50/80 text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-200",
  },
  PI: {
    code: "PI",
    label: "PI",
    fullName: "Perubahan Inventori",
    description: "Penimbunan stok batubara, CPO, beras Bulog & barang gudang",
    badgeColor:
      "border-slate-200 bg-slate-100/80 text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200",
  },
  EKSPOR: {
    code: "EKSPOR",
    label: "Ekspor",
    fullName: "Ekspor Barang & Jasa (LN & Antar-Daerah)",
    description: "Pengiriman CPO, batubara, kayu, udang ke luar KTT",
    badgeColor:
      "border-teal-200/90 bg-teal-50/80 text-teal-800 dark:border-teal-800/60 dark:bg-teal-950/50 dark:text-teal-200",
  },
  IMPOR: {
    code: "IMPOR",
    label: "Impor",
    fullName: "Impor Barang & Jasa (LN & Antar-Daerah)",
    description: "Pemasukan BBM, material konstruksi, pangan dari luar KTT",
    badgeColor:
      "border-slate-200 bg-slate-100/80 text-slate-700 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-200",
  },
  TIDAK_RELEVAN: {
    code: "TIDAK_RELEVAN",
    label: "Tidak Relevan",
    fullName: "Tidak Berdampak Langsung ke Pengeluaran",
    description: "Dampak administratif atau sektoral murni",
    badgeColor:
      "border-slate-200/80 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400",
  },
} as const;

export const SOURCE_MEDIA_LABELS: Record<string, string> = {
  koran_kaltara: "Koran Kaltara",
  radar_tarakan: "Radar Tarakan",
  tribun_kaltara: "Tribun Kaltara",
  benuanta: "Benuanta",
  fokus_borneo: "Fokus Borneo",
  antara_kaltara: "Antara Kaltara",
  national_media: "Media Nasional",
};

// ==========================================
// PDRB TANA TIDUNG 2025 SINGLE SOURCE OF TRUTH
// ==========================================
export const PDRB_KTT_WEIGHTS = {
  // Sisi Lapangan Usaha (KBLI) - Distribusi Persentase 2025
  lapanganUsaha: {
    B: { code: "B", name: "Pertambangan dan Penggalian (Batubara)", weight: 37.80, isDominant: true },
    A: { code: "A", name: "Pertanian, Kehutanan, dan Perikanan (Sawit)", weight: 23.41, isDominant: true },
    F: { code: "F", name: "Konstruksi (Infrastruktur Fisik)", weight: 18.46, isDominant: true },
    O: { code: "O", name: "Administrasi Pemerintahan & Pemkab KTT", weight: 8.47, isDominant: true },
    G: { code: "G", name: "Perdagangan Besar & Eceran", weight: 5.06, isDominant: false },
    H: { code: "H", name: "Transportasi dan Pergudangan", weight: 2.61, isDominant: false },
    C: { code: "C", name: "Industri Pengolahan", weight: 1.52, isDominant: false },
    OTHER: { code: "OTHER", name: "Sektor Lainnya Gabungan", weight: 2.67, isDominant: false },
  },
  // Top 4 Sektor menyumbang 88.14% PDRB KTT
  top4LapanganUsahaShare: 88.14,

  // Sisi Pengeluaran PDRB - Distribusi Persentase 2025
  pengeluaran: {
    NET_EKSPOR: { code: "NET_EKSPOR", label: "Pos 6 • Net Ekspor Antar Daerah", weight: 49.98, isDominant: true },
    PMTB: { code: "PMTB", label: "Pos 4 • Pembentukan Modal Tetap Bruto (Investasi Fisik)", weight: 31.38, isDominant: true },
    PK_P: { code: "PK_P", label: "Pos 2 • Pengeluaran Konsumsi Pemerintah", weight: 9.80, isDominant: false },
    PK_RT: { code: "PK_RT", label: "Pos 1 • Pengeluaran Konsumsi Rumah Tangga", weight: 7.06, isDominant: false },
    PK_LNPRT: { code: "PK_LNPRT", label: "Pos 3 • Pengeluaran Konsumsi LNPRT", weight: 1.13, isDominant: false },
    PI: { code: "PI", label: "Pos 5 • Perubahan Inventori", weight: 0.65, isDominant: false },
  },
  // Net Ekspor + PMTB menyumbang 81.36% PDRB KTT
  top2PengeluaranShare: 81.36,
} as const;

export const STATUS_META: Record<
  string,
  { label: string; badgeClass: string }
> = {
  pending: {
    label: "Pending",
    badgeClass:
      "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/70 dark:text-amber-200",
  },
  approved: {
    label: "Disetujui",
    badgeClass:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/70 dark:bg-emerald-950/70 dark:text-emerald-200",
  },
  rejected: {
    label: "Ditolak",
    badgeClass:
      "border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-800/70 dark:bg-rose-950/70 dark:text-rose-200",
  },
  needs_revision: {
    label: "Perlu Revisi",
    badgeClass:
      "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-800/70 dark:bg-blue-950/70 dark:text-blue-200",
  },
};
