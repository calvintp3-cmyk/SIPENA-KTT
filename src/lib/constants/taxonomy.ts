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
  barColor: string;
}

export const KBLI_CATEGORIES: Record<KbliMeta["code"], KbliMeta> = {
  A: {
    code: "A",
    shortName: "Pertanian & Perikanan",
    fullName: "A. Pertanian, Kehutanan, dan Perikanan",
    badgeColor: "text-amber-300 bg-amber-950/60 border-amber-800/70",
    barColor: "bg-amber-500",
  },
  B: {
    code: "B",
    shortName: "Pertambangan",
    fullName: "B. Pertambangan dan Penggalian",
    badgeColor: "text-orange-300 bg-orange-950/60 border-orange-800/70",
    barColor: "bg-orange-500",
  },
  C: {
    code: "C",
    shortName: "Industri Pengolahan",
    fullName: "C. Industri Pengolahan",
    badgeColor: "text-cyan-300 bg-cyan-950/60 border-cyan-800/70",
    barColor: "bg-cyan-500",
  },
  D: {
    code: "D",
    shortName: "Listrik & Gas",
    fullName: "D. Pengadaan Listrik dan Gas",
    badgeColor: "text-yellow-300 bg-yellow-950/60 border-yellow-800/70",
    barColor: "bg-yellow-500",
  },
  E: {
    code: "E",
    shortName: "Air & Pengelolaan Limbah",
    fullName: "E. Pengadaan Air, Pengelolaan Sampah, Limbah & Daur Ulang",
    badgeColor: "text-teal-300 bg-teal-950/60 border-teal-800/70",
    barColor: "bg-teal-500",
  },
  F: {
    code: "F",
    shortName: "Konstruksi",
    fullName: "F. Konstruksi",
    badgeColor: "text-emerald-300 bg-emerald-950/60 border-emerald-800/70",
    barColor: "bg-emerald-500",
  },
  G: {
    code: "G",
    shortName: "Perdagangan",
    fullName: "G. Perdagangan Besar dan Eceran; Reparasi Mobil & Motor",
    badgeColor: "text-sky-300 bg-sky-950/60 border-sky-800/70",
    barColor: "bg-sky-500",
  },
  H: {
    code: "H",
    shortName: "Transportasi",
    fullName: "H. Transportasi dan Pergudangan",
    badgeColor: "text-indigo-300 bg-indigo-950/60 border-indigo-800/70",
    barColor: "bg-indigo-500",
  },
  I: {
    code: "I",
    shortName: "Akomodasi & Mamin",
    fullName: "I. Penyediaan Akomodasi dan Makan Minum",
    badgeColor: "text-rose-300 bg-rose-950/60 border-rose-800/70",
    barColor: "bg-rose-500",
  },
  J: {
    code: "J",
    shortName: "Informasi & Komunikasi",
    fullName: "J. Informasi dan Komunikasi",
    badgeColor: "text-blue-300 bg-blue-950/60 border-blue-800/70",
    barColor: "bg-blue-500",
  },
  K: {
    code: "K",
    shortName: "Jasa Keuangan",
    fullName: "K. Jasa Keuangan dan Asuransi",
    badgeColor: "text-lime-300 bg-lime-950/60 border-lime-800/70",
    barColor: "bg-lime-500",
  },
  L: {
    code: "L",
    shortName: "Real Estat",
    fullName: "L. Real Estat",
    badgeColor: "text-fuchsia-300 bg-fuchsia-950/60 border-fuchsia-800/70",
    barColor: "bg-fuchsia-500",
  },
  M_N: {
    code: "M_N",
    shortName: "Jasa Perusahaan",
    fullName: "M,N. Jasa Perusahaan",
    badgeColor: "text-violet-300 bg-violet-950/60 border-violet-800/70",
    barColor: "bg-violet-500",
  },
  O: {
    code: "O",
    shortName: "Adm. Pemerintahan",
    fullName: "O. Administrasi Pemerintahan, Pertahanan & Jaminan Sosial Wajib",
    badgeColor: "text-purple-300 bg-purple-950/60 border-purple-800/70",
    barColor: "bg-purple-500",
  },
  P: {
    code: "P",
    shortName: "Jasa Pendidikan",
    fullName: "P. Jasa Pendidikan",
    badgeColor: "text-pink-300 bg-pink-950/60 border-pink-800/70",
    barColor: "bg-pink-500",
  },
  Q: {
    code: "Q",
    shortName: "Jasa Kesehatan",
    fullName: "Q. Jasa Kesehatan dan Kegiatan Sosial",
    badgeColor: "text-red-300 bg-red-950/60 border-red-800/70",
    barColor: "bg-red-500",
  },
  R_S_T_U: {
    code: "R_S_T_U",
    shortName: "Jasa Lainnya",
    fullName: "R,S,T,U. Jasa Lainnya",
    badgeColor: "text-slate-300 bg-slate-800 border-slate-700",
    barColor: "bg-slate-400",
  },
};

export const KBLI_LIST = Object.values(KBLI_CATEGORIES);

export const EXPENDITURE_COMPONENTS = {
  PK_RT: {
    code: "PK_RT",
    label: "PK-RT",
    fullName: "Pengeluaran Konsumsi Rumah Tangga",
    description: "Harga bahan pokok, inflasi pangan, daya beli masyarakat",
    badgeColor: "bg-sky-950/70 text-sky-300 border-sky-800/70",
  },
  PK_LNPRT: {
    code: "PK_LNPRT",
    label: "PK-LNPRT",
    fullName: "Pengeluaran Konsumsi LNPRT",
    description: "Belanja ormas, lembaga sosial, keagamaan & parpol",
    badgeColor: "bg-indigo-950/70 text-indigo-300 border-indigo-800/70",
  },
  PK_P: {
    code: "PK_P",
    label: "PK-P",
    fullName: "Pengeluaran Konsumsi Pemerintah",
    description: "Belanja pegawai, barang/jasa APBD, THR/Gaji-13, bansos",
    badgeColor: "bg-purple-950/70 text-purple-300 border-purple-800/70",
  },
  PMTB: {
    code: "PMTB",
    label: "PMTB",
    fullName: "Pembentukan Modal Tetap Bruto (Investasi)",
    description: "Proyek fisik infrastruktur, bangunan, alat berat & mesin",
    badgeColor: "bg-emerald-950/70 text-emerald-300 border-emerald-800/70",
  },
  PI: {
    code: "PI",
    label: "PI",
    fullName: "Perubahan Inventori",
    description: "Penimbunan stok batubara, CPO, beras Bulog & barang gudang",
    badgeColor: "bg-teal-950/70 text-teal-300 border-teal-800/70",
  },
  EKSPOR: {
    code: "EKSPOR",
    label: "Ekspor",
    fullName: "Ekspor Barang & Jasa (LN & Antar-Daerah)",
    description: "Pengiriman CPO, batubara, kayu, udang ke luar KTT",
    badgeColor: "bg-amber-950/70 text-amber-300 border-amber-800/70",
  },
  IMPOR: {
    code: "IMPOR",
    label: "Impor",
    fullName: "Impor Barang & Jasa (LN & Antar-Daerah)",
    description: "Pemasukan BBM, material konstruksi, pangan dari luar KTT",
    badgeColor: "bg-rose-950/70 text-rose-300 border-rose-800/70",
  },
  TIDAK_RELEVAN: {
    code: "TIDAK_RELEVAN",
    label: "Tidak Relevan",
    fullName: "Tidak Berdampak Langsung ke Pengeluaran",
    description: "Dampak administratif atau sektoral murni",
    badgeColor: "bg-slate-800 text-slate-400 border-slate-700",
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
    badgeClass: "bg-amber-950 text-amber-300 border-amber-800",
  },
  approved: {
    label: "Disetujui",
    badgeClass: "bg-emerald-950 text-emerald-300 border-emerald-800",
  },
  rejected: {
    label: "Ditolak",
    badgeClass: "bg-rose-950/70 text-rose-300 border-rose-800",
  },
  needs_revision: {
    label: "Perlu Revisi",
    badgeClass: "bg-sky-950 text-sky-300 border-sky-800",
  },
};

