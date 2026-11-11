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

