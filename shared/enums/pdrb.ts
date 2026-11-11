// shared/enums/pdrb.ts

export enum KbliCategoryEnum {
  A = 'A',
  B = 'B',
  C = 'C',
  D = 'D',
  E = 'E',
  F = 'F',
  G = 'G',
  H = 'H',
  I = 'I',
  J = 'J',
  K = 'K',
  L = 'L',
  M = 'M',
  N = 'N',
  O = 'O',
  P = 'P',
  Q = 'Q',
  R = 'R',
  S = 'S',
  T = 'T',
  U = 'U',
}

export interface KbliCategoryMeta {
  code: KbliCategoryEnum;
  name: string;
  fullLabel: string;
  pdrb17GroupCode: string;
  pdrb17GroupLabel: string;
}

export const KBLI_CATEGORY_META: Record<KbliCategoryEnum, KbliCategoryMeta> = {
  [KbliCategoryEnum.A]: {
    code: KbliCategoryEnum.A,
    name: 'Pertanian, Kehutanan, dan Perikanan',
    fullLabel: 'A - Pertanian, Kehutanan, dan Perikanan',
    pdrb17GroupCode: 'A',
    pdrb17GroupLabel: 'Pertanian, Kehutanan, dan Perikanan',
  },
  [KbliCategoryEnum.B]: {
    code: KbliCategoryEnum.B,
    name: 'Pertambangan dan Penggalian',
    fullLabel: 'B - Pertambangan dan Penggalian',
    pdrb17GroupCode: 'B',
    pdrb17GroupLabel: 'Pertambangan dan Penggalian',
  },
  [KbliCategoryEnum.C]: {
    code: KbliCategoryEnum.C,
    name: 'Industri Pengolahan',
    fullLabel: 'C - Industri Pengolahan',
    pdrb17GroupCode: 'C',
    pdrb17GroupLabel: 'Industri Pengolahan',
  },
  [KbliCategoryEnum.D]: {
    code: KbliCategoryEnum.D,
    name: 'Pengadaan Listrik dan Gas',
    fullLabel: 'D - Pengadaan Listrik dan Gas',
    pdrb17GroupCode: 'D',
    pdrb17GroupLabel: 'Pengadaan Listrik dan Gas',
  },
  [KbliCategoryEnum.E]: {
    code: KbliCategoryEnum.E,
    name: 'Pengadaan Air, Pengelolaan Sampah, Limbah dan Daur Ulang',
    fullLabel: 'E - Pengadaan Air, Pengelolaan Sampah, Limbah dan Daur Ulang',
    pdrb17GroupCode: 'E',
    pdrb17GroupLabel: 'Pengadaan Air, Pengelolaan Sampah, Limbah dan Daur Ulang',
  },
  [KbliCategoryEnum.F]: {
    code: KbliCategoryEnum.F,
    name: 'Konstruksi',
    fullLabel: 'F - Konstruksi',
    pdrb17GroupCode: 'F',
    pdrb17GroupLabel: 'Konstruksi',
  },
  [KbliCategoryEnum.G]: {
    code: KbliCategoryEnum.G,
    name: 'Perdagangan Besar dan Eceran; Reparasi Mobil dan Sepeda Motor',
    fullLabel: 'G - Perdagangan Besar dan Eceran; Reparasi Mobil dan Sepeda Motor',
    pdrb17GroupCode: 'G',
    pdrb17GroupLabel: 'Perdagangan Besar dan Eceran; Reparasi Mobil dan Sepeda Motor',
  },
  [KbliCategoryEnum.H]: {
    code: KbliCategoryEnum.H,
    name: 'Pengangkutan dan Pergudangan',
    fullLabel: 'H - Pengangkutan dan Pergudangan',
    pdrb17GroupCode: 'H',
    pdrb17GroupLabel: 'Transportasi dan Pergudangan',
  },
  [KbliCategoryEnum.I]: {
    code: KbliCategoryEnum.I,
    name: 'Penyediaan Akomodasi dan Makan Minum',
    fullLabel: 'I - Penyediaan Akomodasi dan Makan Minum',
    pdrb17GroupCode: 'I',
    pdrb17GroupLabel: 'Penyediaan Akomodasi dan Makan Minum',
  },
  [KbliCategoryEnum.J]: {
    code: KbliCategoryEnum.J,
    name: 'Informasi dan Komunikasi',
    fullLabel: 'J - Informasi dan Komunikasi',
    pdrb17GroupCode: 'J',
    pdrb17GroupLabel: 'Informasi dan Komunikasi',
  },
  [KbliCategoryEnum.K]: {
    code: KbliCategoryEnum.K,
    name: 'Aktivitas Keuangan dan Asuransi',
    fullLabel: 'K - Aktivitas Keuangan dan Asuransi',
    pdrb17GroupCode: 'K',
    pdrb17GroupLabel: 'Jasa Keuangan dan Asuransi',
  },
  [KbliCategoryEnum.L]: {
    code: KbliCategoryEnum.L,
    name: 'Real Estat',
    fullLabel: 'L - Real Estat',
    pdrb17GroupCode: 'L',
    pdrb17GroupLabel: 'Real Estat',
  },
  [KbliCategoryEnum.M]: {
    code: KbliCategoryEnum.M,
    name: 'Aktivitas Profesional, Ilmiah dan Teknis',
    fullLabel: 'M - Aktivitas Profesional, Ilmiah dan Teknis',
    pdrb17GroupCode: 'M,N',
    pdrb17GroupLabel: 'Jasa Perusahaan',
  },
  [KbliCategoryEnum.N]: {
    code: KbliCategoryEnum.N,
    name: 'Aktivitas Penyewaan dan Sewa Guna Usaha Tanpa Hak Opsi, Ketenagakerjaan, Agen Perjalanan dan Penunjang Usaha Lainnya',
    fullLabel:
      'N - Aktivitas Penyewaan dan Sewa Guna Usaha Tanpa Hak Opsi, Ketenagakerjaan, Agen Perjalanan dan Penunjang Usaha Lainnya',
    pdrb17GroupCode: 'M,N',
    pdrb17GroupLabel: 'Jasa Perusahaan',
  },
  [KbliCategoryEnum.O]: {
    code: KbliCategoryEnum.O,
    name: 'Administrasi Pemerintahan, Pertahanan dan Jaminan Sosial Wajib',
    fullLabel: 'O - Administrasi Pemerintahan, Pertahanan dan Jaminan Sosial Wajib',
    pdrb17GroupCode: 'O',
    pdrb17GroupLabel: 'Administrasi Pemerintahan, Pertahanan dan Jaminan Sosial Wajib',
  },
  [KbliCategoryEnum.P]: {
    code: KbliCategoryEnum.P,
    name: 'Pendidikan',
    fullLabel: 'P - Pendidikan',
    pdrb17GroupCode: 'P',
    pdrb17GroupLabel: 'Jasa Pendidikan',
  },
  [KbliCategoryEnum.Q]: {
    code: KbliCategoryEnum.Q,
    name: 'Aktivitas Kesehatan Manusia dan Aktivitas Sosial',
    fullLabel: 'Q - Aktivitas Kesehatan Manusia dan Aktivitas Sosial',
    pdrb17GroupCode: 'Q',
    pdrb17GroupLabel: 'Jasa Kesehatan dan Kegiatan Sosial',
  },
  [KbliCategoryEnum.R]: {
    code: KbliCategoryEnum.R,
    name: 'Kesenian, Hiburan dan Rekreasi',
    fullLabel: 'R - Kesenian, Hiburan dan Rekreasi',
    pdrb17GroupCode: 'R,S,T,U',
    pdrb17GroupLabel: 'Jasa Lainnya',
  },
  [KbliCategoryEnum.S]: {
    code: KbliCategoryEnum.S,
    name: 'Aktivitas Jasa Lainnya',
    fullLabel: 'S - Aktivitas Jasa Lainnya',
    pdrb17GroupCode: 'R,S,T,U',
    pdrb17GroupLabel: 'Jasa Lainnya',
  },
  [KbliCategoryEnum.T]: {
    code: KbliCategoryEnum.T,
    name: 'Aktivitas Rumah Tangga Sebagai Pemberi Kerja; Aktivitas yang Menghasilkan Barang dan Jasa oleh Rumah Tangga yang Digunakan untuk Memenuhi Kebutuhan Sendiri',
    fullLabel: 'T - Aktivitas Rumah Tangga Sebagai Pemberi Kerja dan Produksi Sendiri',
    pdrb17GroupCode: 'R,S,T,U',
    pdrb17GroupLabel: 'Jasa Lainnya',
  },
  [KbliCategoryEnum.U]: {
    code: KbliCategoryEnum.U,
    name: 'Aktivitas Badan Internasional dan Badan Ekstra Internasional Lainnya',
    fullLabel: 'U - Aktivitas Badan Internasional dan Badan Ekstra Internasional Lainnya',
    pdrb17GroupCode: 'R,S,T,U',
    pdrb17GroupLabel: 'Jasa Lainnya',
  },
};

export enum KbliImpactEnum {
  INCREASE_NTB = 'INCREASE_NTB',
  DECREASE_NTB = 'DECREASE_NTB',
  INCREASE_PRICE = 'INCREASE_PRICE',
  DECREASE_PRICE = 'DECREASE_PRICE',
}

export const KBLI_IMPACT_LABELS: Record<KbliImpactEnum, string> = {
  [KbliImpactEnum.INCREASE_NTB]: 'Meningkatkan NTB',
  [KbliImpactEnum.DECREASE_NTB]: 'Menurunkan NTB',
  [KbliImpactEnum.INCREASE_PRICE]: 'Meningkatkan Harga',
  [KbliImpactEnum.DECREASE_PRICE]: 'Menurunkan Harga',
};

export enum ExpenditureComponentEnum {
  PK_RT = 'PK_RT',
  PK_LNPRT = 'PK_LNPRT',
  PK_P = 'PK_P',
  PMTB = 'PMTB',
  INVENTORY_CHANGE = 'INVENTORY_CHANGE',
  NET_EXPORT = 'NET_EXPORT',
}

export const EXPENDITURE_COMPONENT_LABELS: Record<
  ExpenditureComponentEnum,
  { short: string; official: string }
> = {
  [ExpenditureComponentEnum.PK_RT]: {
    short: 'PK-RT',
    official: 'PK-RT (Pengeluaran Konsumsi Rumah Tangga)',
  },
  [ExpenditureComponentEnum.PK_LNPRT]: {
    short: 'PK-LNPRT',
    official: 'PK-LNPRT (Pengeluaran Konsumsi LNPRT)',
  },
  [ExpenditureComponentEnum.PK_P]: {
    short: 'PK-P',
    official: 'PK-P (Pengeluaran Konsumsi Pemerintah)',
  },
  [ExpenditureComponentEnum.PMTB]: {
    short: 'PMTB',
    official: 'PMTB (Pembentukan Modal Tetap Bruto)',
  },
  [ExpenditureComponentEnum.INVENTORY_CHANGE]: {
    short: 'Perubahan Inventori',
    official: 'Perubahan Inventori',
  },
  [ExpenditureComponentEnum.NET_EXPORT]: {
    short: 'Ekspor Bersih Antar Daerah/Luar Negeri',
    official: 'Ekspor Bersih Antar Daerah/Luar Negeri',
  },
};

export enum ExpenditureImpactEnum {
  INCREASE_REAL = 'INCREASE_REAL',
  DECREASE_REAL = 'DECREASE_REAL',
  INCREASE_DEFLATOR = 'INCREASE_DEFLATOR',
  DECREASE_DEFLATOR = 'DECREASE_DEFLATOR',
}

export const EXPENDITURE_IMPACT_LABELS: Record<ExpenditureImpactEnum, string> = {
  [ExpenditureImpactEnum.INCREASE_REAL]: 'Meningkatkan Pengeluaran Riil',
  [ExpenditureImpactEnum.DECREASE_REAL]: 'Menurunkan Pengeluaran Riil',
  [ExpenditureImpactEnum.INCREASE_DEFLATOR]: 'Meningkatkan Indeks Harga/Deflator',
  [ExpenditureImpactEnum.DECREASE_DEFLATOR]: 'Menurunkan Indeks Harga/Deflator',
};

export enum VerificationStatusEnum {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  IGNORED = 'IGNORED',
}

export const VERIFICATION_STATUS_LABELS: Record<VerificationStatusEnum, string> = {
  [VerificationStatusEnum.PENDING]: 'Menunggu Review',
  [VerificationStatusEnum.VERIFIED]: 'Terverifikasi',
  [VerificationStatusEnum.IGNORED]: 'Diabaikan',
};

export enum ArticleSourceTypeEnum {
  REGIONAL = 'REGIONAL',
  NATIONAL = 'NATIONAL',
  MANUAL = 'MANUAL',
}

export enum LlmStatusEnum {
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  SKIPPED_MANUAL = 'SKIPPED_MANUAL',
}

export enum ScraperRunTypeEnum {
  SCHEDULED = 'SCHEDULED',
  MANUAL = 'MANUAL',
  RETRY_LLM = 'RETRY_LLM',
}

export enum ScraperRunStatusEnum {
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  PARTIAL = 'PARTIAL',
  FAILED = 'FAILED',
}

export enum UserRoleEnum {
  ADMIN = 'ADMIN',
  OPERATOR = 'OPERATOR',
}

export interface Pdrb17SectorMeta {
  groupCode: string;
  shortName: string;
  officialName: string;
  kbliCodes: ReadonlyArray<KbliCategoryEnum>;
  description: string;
  typicalSignals: string;
}

export const PDRB_17_SECTORS: ReadonlyArray<Pdrb17SectorMeta> = [
  {
    groupCode: 'A',
    shortName: 'Pertanian, Kehutanan & Perikanan',
    officialName: 'Pertanian, Kehutanan, dan Perikanan',
    kbliCodes: [KbliCategoryEnum.A],
    description:
      'Tanaman pangan, perkebunan kelapa sawit/TBS, kehutanan/perkayuan, serta perikanan tangkap & budidaya tambak di pesisir KTT.',
    typicalSignals: 'Harga TBS sawit, panen padi/hortikultura, ekspor hasil perikanan & kayu, subsidi pupuk.',
  },
  {
    groupCode: 'B',
    shortName: 'Pertambangan & Penggalian',
    officialName: 'Pertambangan dan Penggalian',
    kbliCodes: [KbliCategoryEnum.B],
    description:
      'Pertambangan batubara, minyak & gas bumi, serta penggalian material konstruksi (pasir, batu, sirtu).',
    typicalSignals: 'Produksi batubara & lifting migas, harga acuan HBA/ICP, aktivitas kuari material lokal.',
  },
  {
    groupCode: 'C',
    shortName: 'Industri Pengolahan',
    officialName: 'Industri Pengolahan',
    kbliCodes: [KbliCategoryEnum.C],
    description:
      'Pengolahan CPO/pabrik kelapa sawit (PKS), industri kayu lapis/chipmill, industri makanan-minuman, dan UMKM olahan.',
    typicalSignals: 'Kapasitas giling CPO, ekspor produk olahan kayu, investasi pabrik baru & IKM pangan.',
  },
  {
    groupCode: 'D',
    shortName: 'Pengadaan Listrik & Gas',
    officialName: 'Pengadaan Listrik dan Gas',
    kbliCodes: [KbliCategoryEnum.D],
    description:
      'Pembangkitan & distribusi tenaga listrik PLN/swasta serta suplai gas untuk rumah tangga dan industri.',
    typicalSignals: 'Penambahan kapasitas PLTD/PLTS, rasio elektrifikasi desa, tarif & konsumsi kWh.',
  },
  {
    groupCode: 'E',
    shortName: 'Pengadaan Air & Pengelolaan Limbah',
    officialName: 'Pengadaan Air, Pengelolaan Sampah, Limbah dan Daur Ulang',
    kbliCodes: [KbliCategoryEnum.E],
    description:
      'Layanan air bersih PDAM Tirta Taka, sistem penyediaan air minum (SPAM), serta pengelolaan persampahan & limbah.',
    typicalSignals: 'Perluasan sambungan rumah PDAM, pembangunan IPA/SPAM, program persampahan daerah.',
  },
  {
    groupCode: 'F',
    shortName: 'Konstruksi',
    officialName: 'Konstruksi',
    kbliCodes: [KbliCategoryEnum.F],
    description:
      'Pembangunan gedung pemerintahan/Puspem KTT, proyek jalan & jembatan, irigasi, pelabuhan, serta perumahan.',
    typicalSignals: 'Progres fisik APBD/APBN, tender infrastruktur jalan-jembatan, pembangunan kawasan Puspem.',
  },
  {
    groupCode: 'G',
    shortName: 'Perdagangan Besar & Eceran',
    officialName: 'Perdagangan Besar dan Eceran; Reparasi Mobil dan Sepeda Motor',
    kbliCodes: [KbliCategoryEnum.G],
    description:
      'Perdagangan barang kebutuhan pokok, niaga BBM & material bangunan, pasar tradisional, ritel modern, serta bengkel kendaraan.',
    typicalSignals: 'Pasokan & harga sembako, omzet pasar rakyat, penjualan kendaraan/BBM, bazar UMKM.',
  },
  {
    groupCode: 'H',
    shortName: 'Transportasi & Pergudangan',
    officialName: 'Transportasi dan Pergudangan',
    kbliCodes: [KbliCategoryEnum.H],
    description:
      'Angkutan sungai/laut (speedboat, feri, tongkang logistik), angkutan darat lintas kabupaten, pelabuhan, dan pergudangan.',
    typicalSignals: 'Arus bongkar muat Pelabuhan Tideng Pale/Sesayap, trayek speedboat & feri, tarif logistik.',
  },
  {
    groupCode: 'I',
    shortName: 'Akomodasi & Makan Minum',
    officialName: 'Penyediaan Akomodasi dan Makan Minum',
    kbliCodes: [KbliCategoryEnum.I],
    description:
      'Usaha perhotelan, penginapan, homestay, rumah makan, kafe, serta jasa katering dan acara daerah.',
    typicalSignals: 'Tingkat hunian kamar hotel (TPK), event/rapat dinas daerah, pembukaan sentra kuliner.',
  },
  {
    groupCode: 'J',
    shortName: 'Informasi & Komunikasi',
    officialName: 'Informasi dan Komunikasi',
    kbliCodes: [KbliCategoryEnum.J],
    description:
      'Jaringan telekomunikasi seluler & fiber optik, menara BTS, layanan internet, serta penyiaran & media lokal.',
    typicalSignals: 'Pembangunan BTS blankspot, perluasan jaringan internet desa, digitalisasi layanan publik.',
  },
  {
    groupCode: 'K',
    shortName: 'Jasa Keuangan & Asuransi',
    officialName: 'Jasa Keuangan dan Asuransi',
    kbliCodes: [KbliCategoryEnum.K],
    description:
      'Layanan perbankan umum/BPD Kaltimtara, penyaluran KUR/kredit usaha, koperasi simpan pinjam, dan asuransi.',
    typicalSignals: 'Realisasi kredit UMKM/KUR, transaksi perbankan digital QRIS, likuiditas simpanan daerah.',
  },
  {
    groupCode: 'L',
    shortName: 'Real Estat',
    officialName: 'Real Estat',
    kbliCodes: [KbliCategoryEnum.L],
    description:
      'Pengembangan kawasan perumahan, transaksi sewa lahan/ruko/gedung, serta nilai properti komersial & residensial.',
    typicalSignals: 'Pembangunan klaster perumahan subsidi/komersial, kenaikan sewa properti & ruko.',
  },
  {
    groupCode: 'M,N',
    shortName: 'Jasa Perusahaan',
    officialName: 'Jasa Perusahaan (KBLI M & N)',
    kbliCodes: [KbliCategoryEnum.M, KbliCategoryEnum.N],
    description:
      'Mencakup KBLI M (konsultan teknik/hukum, survei, jasa profesional) dan KBLI N (penyewaan alat berat/kendaraan, biro perjalanan, tenaga kerja, kebersihan).',
    typicalSignals: 'Jasa konsultan perencanaan konstruksi, sewa alat berat tambang/proyek, travel dinas.',
  },
  {
    groupCode: 'O',
    shortName: 'Administrasi Pemerintahan',
    officialName: 'Administrasi Pemerintahan, Pertahanan dan Jaminan Sosial Wajib',
    kbliCodes: [KbliCategoryEnum.O],
    description:
      'Aktivitas operasional Pemkab Tana Tidung, belanja pegawai/operasional OPD, TKD/DBH, serta program jaminan sosial.',
    typicalSignals: 'Realisasi APBD KTT, penyaluran gaji/TPP ASN, dana transfer pusat (DBH/DAK/DAU).',
  },
  {
    groupCode: 'P',
    shortName: 'Jasa Pendidikan',
    officialName: 'Jasa Pendidikan',
    kbliCodes: [KbliCategoryEnum.P],
    description:
      'Layanan pendidikan formal/nonformal (PAUD, SD, SMP, SMA/SMK, kursus, beasiswa daerah, sarana belajar).',
    typicalSignals: 'Realisasi BOSDA/beasiswa KTT, operasional satuan pendidikan & pelatihan vokasi.',
  },
  {
    groupCode: 'Q',
    shortName: 'Jasa Kesehatan & Kegiatan Sosial',
    officialName: 'Jasa Kesehatan dan Kegiatan Sosial',
    kbliCodes: [KbliCategoryEnum.Q],
    description:
      'Layanan RSUD Akhmad Berahim, puskesmas, klinik/apotek, tenaga kesehatan, serta layanan sosial masyarakat.',
    typicalSignals: 'Peningkatan layanan RSUD/puskesmas, program jaminan kesehatan daerah, bansos rentan.',
  },
  {
    groupCode: 'R,S,T,U',
    shortName: 'Jasa Lainnya',
    officialName: 'Jasa Lainnya (KBLI R, S, T & U)',
    kbliCodes: [
      KbliCategoryEnum.R,
      KbliCategoryEnum.S,
      KbliCategoryEnum.T,
      KbliCategoryEnum.U,
    ],
    description:
      'Mencakup KBLI R (wisata, festival budaya, olahraga/rekreasi), KBLI S (organisasi kemasyarakatan, reparasi personal, salon/laundry), KBLI T (jasa rumah tangga), dan KBLI U (badan internasional).',
    typicalSignals: 'Festival budaya Irau/wisata Tana Tidung, event olahraga daerah, jasa personal.',
  },
];

export interface ExpenditureComponentMeta {
  code: ExpenditureComponentEnum;
  short: string;
  official: string;
  description: string;
}

export const PDRB_6_EXPENDITURE_LIST: ReadonlyArray<ExpenditureComponentMeta> = [
  {
    code: ExpenditureComponentEnum.PK_RT,
    short: 'PK-RT',
    official: 'PK-RT (Pengeluaran Konsumsi Rumah Tangga)',
    description:
      'Belanja konsumsi makanan-minuman, sandang, perumahan, transportasi, pendidikan, dan hiburan oleh rumah tangga KTT.',
  },
  {
    code: ExpenditureComponentEnum.PK_LNPRT,
    short: 'PK-LNPRT',
    official: 'PK-LNPRT (Pengeluaran Konsumsi LNPRT)',
    description:
      'Pengeluaran operasional lembaga nonprofit melayani rumah tangga (ormas, keagamaan, adat, parpol, LSM lokal).',
  },
  {
    code: ExpenditureComponentEnum.PK_P,
    short: 'PK-P',
    official: 'PK-P (Pengeluaran Konsumsi Pemerintah)',
    description:
      'Realisasi belanja pegawai, belanja barang/jasa operasional OPD Pemkab Tana Tidung dan instansi vertikal.',
  },
  {
    code: ExpenditureComponentEnum.PMTB,
    short: 'PMTB',
    official: 'PMTB (Pembentukan Modal Tetap Bruto)',
    description:
      'Belanja modal konstruksi gedung/jalan, pengadaan mesin, alat berat, kendaraan niaga, dan investasi fisik jangka panjang.',
  },
  {
    code: ExpenditureComponentEnum.INVENTORY_CHANGE,
    short: 'Perubahan Inventori',
    official: 'Perubahan Inventori',
    description:
      'Penumpukan atau penarikan stok barang jadi, bahan baku industri, komoditas tambang, serta cadangan pangan di gudang.',
  },
  {
    code: ExpenditureComponentEnum.NET_EXPORT,
    short: 'Ekspor Bersih Antar Daerah/Luar Negeri',
    official: 'Ekspor Bersih Antar Daerah/Luar Negeri',
    description:
      'Arus keluar komoditas unggulan KTT (batubara, CPO/TBS, perikanan, kayu) dikurangi arus masuk barang konsumsi/modal dari luar daerah.',
  },
];

/**
 * Mengurai kode grup 17 sektor PDRB (mis. 'M,N', 'R,S,T,U', atau 'A') menjadi array kode KBLI Enum.
 */
export function resolvePdrbGroupCodes(groupCode: string | null | undefined): KbliCategoryEnum[] {
  const normalized = groupCode?.trim().toUpperCase();
  if (!normalized || normalized === 'ALL') return [];
  const matchedSector = PDRB_17_SECTORS.find((s) => s.groupCode === normalized);
  if (matchedSector) {
    return [...matchedSector.kbliCodes];
  }
  if (normalized in KbliCategoryEnum) {
    return [normalized as KbliCategoryEnum];
  }
  return [];
}

/**
 * Mengembalikan metadata sektor PDRB (17 sektor) tempat bernaungnya sebuah kode KBLI (21 huruf).
 */
export function getPdrb17GroupForKbli(code: KbliCategoryEnum): Pdrb17SectorMeta {
  const groupCode = KBLI_CATEGORY_META[code].pdrb17GroupCode;
  return PDRB_17_SECTORS.find((s) => s.groupCode === groupCode) ?? PDRB_17_SECTORS[0]!;
}

