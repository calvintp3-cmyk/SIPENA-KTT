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
      "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/70 dark:bg-amber-950/70 dark:text-amber-200",
    swatchColor: "bg-amber-700 dark:ring-1 dark:ring-inset dark:ring-white/15",
    barColor: "bg-amber-600 dark:bg-amber-500",
  },
  B: {
    code: "B",
    shortName: "Pertambangan",
    fullName: "B. Pertambangan dan Penggalian",
    badgeColor:
      "border-orange-300 bg-orange-50 text-orange-900 dark:border-orange-700/70 dark:bg-orange-950/70 dark:text-orange-200",
    swatchColor: "bg-orange-700 dark:ring-1 dark:ring-inset dark:ring-white/15",
    barColor: "bg-orange-600 dark:bg-orange-500",
  },
  C: {
    code: "C",
    shortName: "Industri Pengolahan",
    fullName: "C. Industri Pengolahan",
    badgeColor:
      "border-cyan-300 bg-cyan-50 text-cyan-900 dark:border-cyan-700/70 dark:bg-cyan-950/70 dark:text-cyan-200",
    swatchColor: "bg-cyan-700 dark:ring-1 dark:ring-inset dark:ring-white/15",
    barColor: "bg-cyan-600 dark:bg-cyan-500",
  },
  D: {
    code: "D",
    shortName: "Listrik & Gas",
    fullName: "D. Pengadaan Listrik dan Gas",
    badgeColor:
      "border-yellow-300 bg-yellow-50 text-yellow-900 dark:border-yellow-700/70 dark:bg-yellow-950/70 dark:text-yellow-200",
    swatchColor: "bg-yellow-700 dark:ring-1 dark:ring-inset dark:ring-white/15",
    barColor: "bg-yellow-600 dark:bg-yellow-500",
  },
  E: {
    code: "E",
    shortName: "Air & Pengelolaan Limbah",
    fullName: "E. Pengadaan Air, Pengelolaan Sampah, Limbah & Daur Ulang",
    badgeColor:
      "border-teal-300 bg-teal-50 text-teal-900 dark:border-teal-700/70 dark:bg-teal-950/70 dark:text-teal-200",
    swatchColor: "bg-teal-700 dark:ring-1 dark:ring-inset dark:ring-white/15",
    barColor: "bg-teal-600 dark:bg-teal-500",
  },
  F: {
    code: "F",
    shortName: "Konstruksi",
    fullName: "F. Konstruksi",
    badgeColor:
      "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700/70 dark:bg-emerald-950/70 dark:text-emerald-200",
    swatchColor: "bg-emerald-700 dark:ring-1 dark:ring-inset dark:ring-white/15",
    barColor: "bg-emerald-600 dark:bg-emerald-500",
  },
  G: {
    code: "G",
    shortName: "Perdagangan",
    fullName: "G. Perdagangan Besar dan Eceran; Reparasi Mobil & Motor",
    badgeColor:
      "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700/70 dark:bg-sky-950/70 dark:text-sky-200",
    swatchColor: "bg-sky-700 dark:ring-1 dark:ring-inset dark:ring-white/15",
    barColor: "bg-sky-700 dark:bg-sky-500",
  },
  H: {
    code: "H",
    shortName: "Transportasi",
    fullName: "H. Transportasi dan Pergudangan",
    badgeColor:
      "border-indigo-300 bg-indigo-50 text-indigo-900 dark:border-indigo-700/70 dark:bg-indigo-950/70 dark:text-indigo-200",
    swatchColor: "bg-indigo-700 dark:ring-1 dark:ring-inset dark:ring-white/15",
    barColor: "bg-indigo-600 dark:bg-indigo-500",
  },
  I: {
    code: "I",
    shortName: "Akomodasi & Mamin",
    fullName: "I. Penyediaan Akomodasi dan Makan Minum",
    badgeColor:
      "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700/70 dark:bg-rose-950/70 dark:text-rose-200",
    swatchColor: "bg-rose-700 dark:ring-1 dark:ring-inset dark:ring-white/15",
    barColor: "bg-rose-600 dark:bg-rose-500",
  },
  J: {
    code: "J",
    shortName: "Informasi & Komunikasi",
    fullName: "J. Informasi dan Komunikasi",
    badgeColor:
      "border-blue-300 bg-blue-50 text-blue-900 dark:border-blue-700/70 dark:bg-blue-950/70 dark:text-blue-200",
    swatchColor: "bg-blue-700 dark:ring-1 dark:ring-inset dark:ring-white/15",
    barColor: "bg-blue-600 dark:bg-blue-500",
  },
  K: {
    code: "K",
    shortName: "Jasa Keuangan",
    fullName: "K. Jasa Keuangan dan Asuransi",
    badgeColor:
      "border-lime-300 bg-lime-50 text-lime-900 dark:border-lime-700/70 dark:bg-lime-950/70 dark:text-lime-200",
    swatchColor: "bg-lime-700 dark:ring-1 dark:ring-inset dark:ring-white/15",
    barColor: "bg-lime-700 dark:bg-lime-500",
  },
  L: {
    code: "L",
    shortName: "Real Estat",
    fullName: "L. Real Estat",
    badgeColor:
      "border-fuchsia-300 bg-fuchsia-50 text-fuchsia-900 dark:border-fuchsia-700/70 dark:bg-fuchsia-950/70 dark:text-fuchsia-200",
    swatchColor: "bg-fuchsia-700 dark:ring-1 dark:ring-inset dark:ring-white/15",
    barColor: "bg-fuchsia-700 dark:bg-fuchsia-500",
  },
  M_N: {
    code: "M_N",
    shortName: "Jasa Perusahaan",
    fullName: "M,N. Jasa Perusahaan",
    badgeColor:
      "border-violet-300 bg-violet-50 text-violet-900 dark:border-violet-700/70 dark:bg-violet-950/70 dark:text-violet-200",
    swatchColor: "bg-violet-700 dark:ring-1 dark:ring-inset dark:ring-white/15",
    barColor: "bg-violet-600 dark:bg-violet-500",
  },
  O: {
    code: "O",
    shortName: "Adm. Pemerintahan",
    fullName: "O. Administrasi Pemerintahan, Pertahanan & Jaminan Sosial Wajib",
    badgeColor:
      "border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
    swatchColor: "bg-slate-700 dark:ring-1 dark:ring-inset dark:ring-white/15",
    barColor: "bg-slate-700 dark:bg-slate-400",
  },
  P: {
    code: "P",
    shortName: "Jasa Pendidikan",
    fullName: "P. Jasa Pendidikan",
    badgeColor:
      "border-pink-300 bg-pink-50 text-pink-900 dark:border-pink-700/70 dark:bg-pink-950/70 dark:text-pink-200",
    swatchColor: "bg-pink-700 dark:ring-1 dark:ring-inset dark:ring-white/15",
    barColor: "bg-pink-600 dark:bg-pink-500",
  },
  Q: {
    code: "Q",
    shortName: "Jasa Kesehatan",
    fullName: "Q. Jasa Kesehatan dan Kegiatan Sosial",
    badgeColor:
      "border-red-300 bg-red-50 text-red-900 dark:border-red-700/70 dark:bg-red-950/70 dark:text-red-200",
    swatchColor: "bg-red-700 dark:ring-1 dark:ring-inset dark:ring-white/15",
    barColor: "bg-red-600 dark:bg-red-500",
  },
  R_S_T_U: {
    code: "R_S_T_U",
    shortName: "Jasa Lainnya",
    fullName: "R,S,T,U. Jasa Lainnya",
    badgeColor:
      "border-slate-300 bg-slate-100 text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200",
    swatchColor: "bg-slate-600 dark:ring-1 dark:ring-inset dark:ring-white/15",
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
      "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700/70 dark:bg-sky-950/70 dark:text-sky-200",
  },
  PK_LNPRT: {
    code: "PK_LNPRT",
    label: "PK-LNPRT",
    fullName: "Pengeluaran Konsumsi LNPRT",
    description: "Belanja ormas, lembaga sosial, keagamaan & parpol",
    badgeColor:
      "border-indigo-300 bg-indigo-50 text-indigo-900 dark:border-indigo-700/70 dark:bg-indigo-950/70 dark:text-indigo-200",
  },
  PK_P: {
    code: "PK_P",
    label: "PK-P",
    fullName: "Pengeluaran Konsumsi Pemerintah",
    description: "Belanja pegawai, barang/jasa APBD, THR/Gaji-13, bansos",
    badgeColor:
      "border-slate-300 bg-slate-100 text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200",
  },
  PMTB: {
    code: "PMTB",
    label: "PMTB",
    fullName: "Pembentukan Modal Tetap Bruto (Investasi)",
    description: "Proyek fisik infrastruktur, bangunan, alat berat & mesin",
    badgeColor:
      "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700/70 dark:bg-emerald-950/70 dark:text-emerald-200",
  },
  PI: {
    code: "PI",
    label: "PI",
    fullName: "Perubahan Inventori",
    description: "Penimbunan stok batubara, CPO, beras Bulog & barang gudang",
    badgeColor:
      "border-teal-300 bg-teal-50 text-teal-900 dark:border-teal-700/70 dark:bg-teal-950/70 dark:text-teal-200",
  },
  EKSPOR: {
    code: "EKSPOR",
    label: "Ekspor",
    fullName: "Ekspor Barang & Jasa (LN & Antar-Daerah)",
    description: "Pengiriman CPO, batubara, kayu, udang ke luar KTT",
    badgeColor:
      "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/70 dark:bg-amber-950/70 dark:text-amber-200",
  },
  IMPOR: {
    code: "IMPOR",
    label: "Impor",
    fullName: "Impor Barang & Jasa (LN & Antar-Daerah)",
    description: "Pemasukan BBM, material konstruksi, pangan dari luar KTT",
    badgeColor:
      "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700/70 dark:bg-rose-950/70 dark:text-rose-200",
  },
  TIDAK_RELEVAN: {
    code: "TIDAK_RELEVAN",
    label: "Tidak Relevan",
    fullName: "Tidak Berdampak Langsung ke Pengeluaran",
    description: "Dampak administratif atau sektoral murni",
    badgeColor:
      "border-slate-300 bg-slate-100 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
} as const;

export const SOURCE_MEDIA_LABELS: Record<string, string> = {
  koran_kaltara: "Koran Kaltara",
  radar_tarakan: "Radar Tarakan",
  tribun_kaltara: "Tribun Kaltara",
  benuanta: "Benuanta",
  antara_kaltara: "Antara Kaltara",
  national_media: "Media Nasional",
};

export const STATUS_META: Record<
  string,
  { label: string; badgeClass: string }
> = {
  pending: {
    label: "Pending",
    badgeClass:
      "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-700/80 dark:bg-amber-950/80 dark:text-amber-200",
  },
  approved: {
    label: "Disetujui",
    badgeClass:
      "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-700/80 dark:bg-emerald-950/80 dark:text-emerald-200",
  },
  rejected: {
    label: "Ditolak",
    badgeClass:
      "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-700/80 dark:bg-rose-950/80 dark:text-rose-200",
  },
  needs_revision: {
    label: "Perlu Revisi",
    badgeClass:
      "border-sky-300 bg-sky-50 text-sky-900 dark:border-sky-700/80 dark:bg-sky-950/80 dark:text-sky-200",
  },
};
