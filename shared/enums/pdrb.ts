// shared/enums/pdrb.ts

export function formatLapusLabel(code: string, name: string): string {
  return `${code.trim()} - ${name.trim()}`;
}

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
  V = 'V',
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
    fullLabel: formatLapusLabel('A', 'Pertanian, Kehutanan, dan Perikanan'),
    pdrb17GroupCode: 'A',
    pdrb17GroupLabel: 'Pertanian, Kehutanan, dan Perikanan',
  },
  [KbliCategoryEnum.B]: {
    code: KbliCategoryEnum.B,
    name: 'Pertambangan dan Penggalian',
    fullLabel: formatLapusLabel('B', 'Pertambangan dan Penggalian'),
    pdrb17GroupCode: 'B',
    pdrb17GroupLabel: 'Pertambangan dan Penggalian',
  },
  [KbliCategoryEnum.C]: {
    code: KbliCategoryEnum.C,
    name: 'Industri',
    fullLabel: formatLapusLabel('C', 'Industri'),
    pdrb17GroupCode: 'C',
    pdrb17GroupLabel: 'Industri Pengolahan',
  },
  [KbliCategoryEnum.D]: {
    code: KbliCategoryEnum.D,
    name: 'Penyediaan Listrik, Gas, Uap/Air Panas, dan Udara Dingin',
    fullLabel: formatLapusLabel('D', 'Penyediaan Listrik, Gas, Uap/Air Panas, dan Udara Dingin'),
    pdrb17GroupCode: 'D',
    pdrb17GroupLabel: 'Pengadaan Listrik dan Gas',
  },
  [KbliCategoryEnum.E]: {
    code: KbliCategoryEnum.E,
    name: 'Penyediaan Air; Pengelolaan Air Limbah, Penanganan Limbah, dan Remediasi',
    fullLabel: formatLapusLabel(
      'E',
      'Penyediaan Air; Pengelolaan Air Limbah, Penanganan Limbah, dan Remediasi',
    ),
    pdrb17GroupCode: 'E',
    pdrb17GroupLabel: 'Pengadaan Air, Pengelolaan Sampah, Limbah dan Daur Ulang',
  },
  [KbliCategoryEnum.F]: {
    code: KbliCategoryEnum.F,
    name: 'Konstruksi',
    fullLabel: formatLapusLabel('F', 'Konstruksi'),
    pdrb17GroupCode: 'F',
    pdrb17GroupLabel: 'Konstruksi',
  },
  [KbliCategoryEnum.G]: {
    code: KbliCategoryEnum.G,
    name: 'Perdagangan Besar dan Eceran',
    fullLabel: formatLapusLabel('G', 'Perdagangan Besar dan Eceran'),
    pdrb17GroupCode: 'G',
    pdrb17GroupLabel: 'Perdagangan Besar dan Eceran',
  },
  [KbliCategoryEnum.H]: {
    code: KbliCategoryEnum.H,
    name: 'Transportasi dan Penyimpanan',
    fullLabel: formatLapusLabel('H', 'Transportasi dan Penyimpanan'),
    pdrb17GroupCode: 'H',
    pdrb17GroupLabel: 'Transportasi dan Pergudangan',
  },
  [KbliCategoryEnum.I]: {
    code: KbliCategoryEnum.I,
    name: 'Aktivitas Penyediaan Akomodasi dan Makan Minum',
    fullLabel: formatLapusLabel('I', 'Aktivitas Penyediaan Akomodasi dan Makan Minum'),
    pdrb17GroupCode: 'I',
    pdrb17GroupLabel: 'Penyediaan Akomodasi dan Makan Minum',
  },
  [KbliCategoryEnum.J]: {
    code: KbliCategoryEnum.J,
    name: 'Aktivitas Penerbitan, Penyiaran, serta Produksi dan Distribusi Konten',
    fullLabel: formatLapusLabel(
      'J',
      'Aktivitas Penerbitan, Penyiaran, serta Produksi dan Distribusi Konten',
    ),
    pdrb17GroupCode: 'J,K',
    pdrb17GroupLabel: 'Informasi dan Komunikasi',
  },
  [KbliCategoryEnum.K]: {
    code: KbliCategoryEnum.K,
    name: 'Aktivitas Telekomunikasi, Pemrograman Komputer, Konsultansi, Infrastruktur Komputasi, dan Jasa Informasi Lainnya',
    fullLabel: formatLapusLabel(
      'K',
      'Aktivitas Telekomunikasi, Pemrograman Komputer, Konsultansi, Infrastruktur Komputasi, dan Jasa Informasi Lainnya',
    ),
    pdrb17GroupCode: 'J,K',
    pdrb17GroupLabel: 'Informasi dan Komunikasi',
  },
  [KbliCategoryEnum.L]: {
    code: KbliCategoryEnum.L,
    name: 'Aktivitas Keuangan dan Asuransi',
    fullLabel: formatLapusLabel('L', 'Aktivitas Keuangan dan Asuransi'),
    pdrb17GroupCode: 'L',
    pdrb17GroupLabel: 'Jasa Keuangan dan Asuransi',
  },
  [KbliCategoryEnum.M]: {
    code: KbliCategoryEnum.M,
    name: 'Aktivitas Real Estat',
    fullLabel: formatLapusLabel('M', 'Aktivitas Real Estat'),
    pdrb17GroupCode: 'M',
    pdrb17GroupLabel: 'Real Estat',
  },
  [KbliCategoryEnum.N]: {
    code: KbliCategoryEnum.N,
    name: 'Aktivitas Profesional, Ilmiah, dan Teknis',
    fullLabel: formatLapusLabel('N', 'Aktivitas Profesional, Ilmiah, dan Teknis'),
    pdrb17GroupCode: 'N,O',
    pdrb17GroupLabel: 'Jasa Perusahaan',
  },
  [KbliCategoryEnum.O]: {
    code: KbliCategoryEnum.O,
    name: 'Aktivitas Administratif dan Penunjang Usaha',
    fullLabel: formatLapusLabel('O', 'Aktivitas Administratif dan Penunjang Usaha'),
    pdrb17GroupCode: 'N,O',
    pdrb17GroupLabel: 'Jasa Perusahaan',
  },
  [KbliCategoryEnum.P]: {
    code: KbliCategoryEnum.P,
    name: 'Administrasi Pemerintahan dan Pertahanan, serta Jaminan Sosial Wajib',
    fullLabel: formatLapusLabel(
      'P',
      'Administrasi Pemerintahan dan Pertahanan, serta Jaminan Sosial Wajib',
    ),
    pdrb17GroupCode: 'P',
    pdrb17GroupLabel: 'Administrasi Pemerintahan, Pertahanan dan Jaminan Sosial Wajib',
  },
  [KbliCategoryEnum.Q]: {
    code: KbliCategoryEnum.Q,
    name: 'Pendidikan',
    fullLabel: formatLapusLabel('Q', 'Pendidikan'),
    pdrb17GroupCode: 'Q',
    pdrb17GroupLabel: 'Jasa Pendidikan',
  },
  [KbliCategoryEnum.R]: {
    code: KbliCategoryEnum.R,
    name: 'Aktivitas Kesehatan Manusia dan Aktivitas Sosial',
    fullLabel: formatLapusLabel('R', 'Aktivitas Kesehatan Manusia dan Aktivitas Sosial'),
    pdrb17GroupCode: 'R',
    pdrb17GroupLabel: 'Jasa Kesehatan dan Kegiatan Sosial',
  },
  [KbliCategoryEnum.S]: {
    code: KbliCategoryEnum.S,
    name: 'Kesenian, Olahraga, dan Rekreasi',
    fullLabel: formatLapusLabel('S', 'Kesenian, Olahraga, dan Rekreasi'),
    pdrb17GroupCode: 'S,T,U,V',
    pdrb17GroupLabel: 'Jasa Lainnya',
  },
  [KbliCategoryEnum.T]: {
    code: KbliCategoryEnum.T,
    name: 'Aktivitas Jasa Lainnya',
    fullLabel: formatLapusLabel('T', 'Aktivitas Jasa Lainnya'),
    pdrb17GroupCode: 'S,T,U,V',
    pdrb17GroupLabel: 'Jasa Lainnya',
  },
  [KbliCategoryEnum.U]: {
    code: KbliCategoryEnum.U,
    name: 'Aktivitas Rumah Tangga Sebagai Pemberi Kerja dan Aktivitas Produksi Barang dan Jasa oleh Rumah Tangga untuk Keperluan Sendiri yang Tidak Terdiferensiasi',
    fullLabel: formatLapusLabel(
      'U',
      'Aktivitas Rumah Tangga Sebagai Pemberi Kerja dan Aktivitas Produksi Barang dan Jasa oleh Rumah Tangga untuk Keperluan Sendiri yang Tidak Terdiferensiasi',
    ),
    pdrb17GroupCode: 'S,T,U,V',
    pdrb17GroupLabel: 'Jasa Lainnya',
  },
  [KbliCategoryEnum.V]: {
    code: KbliCategoryEnum.V,
    name: 'Aktivitas Badan Internasional dan Badan Ekstra Internasional Lainnya',
    fullLabel: formatLapusLabel(
      'V',
      'Aktivitas Badan Internasional dan Badan Ekstra Internasional Lainnya',
    ),
    pdrb17GroupCode: 'S,T,U,V',
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
  fullLabel: string;
  kbliCodes: ReadonlyArray<KbliCategoryEnum>;
  description: string;
  typicalSignals: string;
}

export const PDRB_17_SECTORS: ReadonlyArray<Pdrb17SectorMeta> = [
  {
    groupCode: 'A',
    shortName: 'Pertanian, Kehutanan & Perikanan',
    officialName: 'Pertanian, Kehutanan, dan Perikanan',
    fullLabel: formatLapusLabel('A', 'Pertanian, Kehutanan, dan Perikanan'),
    kbliCodes: [KbliCategoryEnum.A],
    description:
      'Tanaman pangan, perkebunan kelapa sawit/TBS, kehutanan/perkayuan, serta perikanan tangkap & budidaya tambak di pesisir KTT.',
    typicalSignals: 'Harga TBS sawit, panen padi/hortikultura, ekspor hasil perikanan & kayu, subsidi pupuk.',
  },
  {
    groupCode: 'B',
    shortName: 'Pertambangan & Penggalian',
    officialName: 'Pertambangan dan Penggalian',
    fullLabel: formatLapusLabel('B', 'Pertambangan dan Penggalian'),
    kbliCodes: [KbliCategoryEnum.B],
    description:
      'Pertambangan batubara (termasuk pencucian/benefisiasi), minyak & gas bumi, serta penggalian material konstruksi (pasir, batu, sirtu).',
    typicalSignals: 'Produksi batubara & lifting migas, harga acuan HBA/ICP, aktivitas kuari material lokal.',
  },
  {
    groupCode: 'C',
    shortName: 'Industri Pengolahan',
    officialName: 'Industri Pengolahan',
    fullLabel: formatLapusLabel('C', 'Industri Pengolahan'),
    kbliCodes: [KbliCategoryEnum.C],
    description:
      'Pengolahan CPO/pabrik kelapa sawit (PKS), industri kayu lapis/chipmill, industri makanan-minuman, dan UMKM olahan (KBLI 2025: Industri).',
    typicalSignals: 'Kapasitas giling CPO, ekspor produk olahan kayu, investasi pabrik baru & IKM pangan.',
  },
  {
    groupCode: 'D',
    shortName: 'Pengadaan Listrik & Gas',
    officialName: 'Pengadaan Listrik dan Gas',
    fullLabel: formatLapusLabel('D', 'Pengadaan Listrik dan Gas'),
    kbliCodes: [KbliCategoryEnum.D],
    description:
      'Pembangkitan & distribusi tenaga listrik PLN/swasta, EBT, serta suplai gas untuk rumah tangga dan industri.',
    typicalSignals: 'Penambahan kapasitas PLTD/PLTS, rasio elektrifikasi desa, tarif & konsumsi kWh.',
  },
  {
    groupCode: 'E',
    shortName: 'Pengadaan Air & Pengelolaan Limbah',
    officialName: 'Pengadaan Air, Pengelolaan Sampah, Limbah dan Daur Ulang',
    fullLabel: formatLapusLabel('E', 'Pengadaan Air, Pengelolaan Sampah, Limbah dan Daur Ulang'),
    kbliCodes: [KbliCategoryEnum.E],
    description:
      'Layanan air bersih PDAM Tirta Taka, sistem penyediaan air minum (SPAM), pengelolaan persampahan, limbah, dan remediasi lingkungan.',
    typicalSignals: 'Perluasan sambungan rumah PDAM, pembangunan IPA/SPAM, program persampahan daerah.',
  },
  {
    groupCode: 'F',
    shortName: 'Konstruksi',
    officialName: 'Konstruksi',
    fullLabel: formatLapusLabel('F', 'Konstruksi'),
    kbliCodes: [KbliCategoryEnum.F],
    description:
      'Pembangunan gedung pemerintahan/Puspem KTT, proyek jalan & jembatan, irigasi, pelabuhan, gedung sekolah/RSUD, serta perumahan.',
    typicalSignals: 'Progres fisik APBD/APBN, tender infrastruktur jalan-jembatan, pembangunan kawasan Puspem.',
  },
  {
    groupCode: 'G',
    shortName: 'Perdagangan Besar & Eceran',
    officialName: 'Perdagangan Besar dan Eceran',
    fullLabel: formatLapusLabel('G', 'Perdagangan Besar dan Eceran'),
    kbliCodes: [KbliCategoryEnum.G],
    description:
      'Perdagangan barang kebutuhan pokok, niaga BBM & material bangunan, pasar tradisional, ritel modern, serta niaga-el (KBLI 2025 memindahkan reparasi kendaraan ke KBLI T).',
    typicalSignals: 'Pasokan & harga sembako, omzet pasar rakyat, penjualan kendaraan/BBM, bazar UMKM.',
  },
  {
    groupCode: 'H',
    shortName: 'Transportasi & Pergudangan',
    officialName: 'Transportasi dan Pergudangan',
    fullLabel: formatLapusLabel('H', 'Transportasi dan Pergudangan'),
    kbliCodes: [KbliCategoryEnum.H],
    description:
      'Angkutan sungai/laut (speedboat, feri, tongkang logistik), angkutan darat lintas kabupaten, pelabuhan, kurir, dan pergudangan.',
    typicalSignals: 'Arus bongkar muat Pelabuhan Tideng Pale/Sesayap, trayek speedboat & feri, subsidi SOA logistik.',
  },
  {
    groupCode: 'I',
    shortName: 'Akomodasi & Makan Minum',
    officialName: 'Penyediaan Akomodasi dan Makan Minum',
    fullLabel: formatLapusLabel('I', 'Penyediaan Akomodasi dan Makan Minum'),
    kbliCodes: [KbliCategoryEnum.I],
    description:
      'Usaha perhotelan, penginapan, homestay, rumah makan, kafe, jasa katering, serta acara daerah.',
    typicalSignals: 'Tingkat hunian kamar hotel (TPK), event/rapat dinas daerah, pembukaan sentra kuliner.',
  },
  {
    groupCode: 'J,K',
    shortName: 'Informasi & Komunikasi',
    officialName: 'Informasi dan Komunikasi (KBLI J & K)',
    fullLabel: formatLapusLabel('J,K', 'Informasi dan Komunikasi (KBLI J & K)'),
    kbliCodes: [KbliCategoryEnum.J, KbliCategoryEnum.K],
    description:
      'Mencakup KBLI 2025 J (penerbitan media, penyiaran TV/radio, produksi konten digital) dan KBLI 2025 K (telekomunikasi, BTS, internet desa, TI & komputasi).',
    typicalSignals: 'Pembangunan BTS blankspot, perluasan jaringan internet desa, digitalisasi layanan publik & media lokal.',
  },
  {
    groupCode: 'L',
    shortName: 'Jasa Keuangan & Asuransi',
    officialName: 'Jasa Keuangan dan Asuransi',
    fullLabel: formatLapusLabel('L', 'Jasa Keuangan dan Asuransi'),
    kbliCodes: [KbliCategoryEnum.L],
    description:
      'Layanan perbankan umum/BPD Kaltimtara, penyaluran KUR/kredit usaha, koperasi simpan pinjam, asuransi, dan fintech.',
    typicalSignals: 'Realisasi kredit UMKM/KUR, transaksi perbankan digital QRIS, likuiditas simpanan daerah.',
  },
  {
    groupCode: 'M',
    shortName: 'Real Estat',
    officialName: 'Real Estat',
    fullLabel: formatLapusLabel('M', 'Real Estat'),
    kbliCodes: [KbliCategoryEnum.M],
    description:
      'Pengembangan kawasan perumahan, transaksi sewa lahan/ruko/gedung/gudang penyimpanan mandiri, serta nilai properti komersial & residensial.',
    typicalSignals: 'Pembangunan klaster perumahan subsidi/komersial, kenaikan sewa properti & ruko.',
  },
  {
    groupCode: 'N,O',
    shortName: 'Jasa Perusahaan',
    officialName: 'Jasa Perusahaan (KBLI N & O)',
    fullLabel: formatLapusLabel('N,O', 'Jasa Perusahaan (KBLI N & O)'),
    kbliCodes: [KbliCategoryEnum.N, KbliCategoryEnum.O],
    description:
      'Mencakup KBLI 2025 N (konsultan teknik/hukum, AMDAL, survei, sertifikasi) dan KBLI 2025 O (penyewaan alat berat/armada, biro perjalanan, tenaga kerja, kebersihan).',
    typicalSignals: 'Jasa konsultan perencanaan konstruksi, sewa alat berat tambang/proyek, travel dinas.',
  },
  {
    groupCode: 'P',
    shortName: 'Administrasi Pemerintahan',
    officialName: 'Administrasi Pemerintahan, Pertahanan dan Jaminan Sosial Wajib',
    fullLabel: formatLapusLabel(
      'P',
      'Administrasi Pemerintahan, Pertahanan dan Jaminan Sosial Wajib',
    ),
    kbliCodes: [KbliCategoryEnum.P],
    description:
      'Aktivitas operasional Pemkab Tana Tidung, belanja pegawai/operasional OPD, TKD/DBH/DAK/DAU, serta administrasi jaminan sosial wajib.',
    typicalSignals: 'Realisasi APBD KTT, penyaluran gaji/TPP ASN, dana transfer pusat (DBH/DAK/DAU).',
  },
  {
    groupCode: 'Q',
    shortName: 'Jasa Pendidikan',
    officialName: 'Jasa Pendidikan',
    fullLabel: formatLapusLabel('Q', 'Jasa Pendidikan'),
    kbliCodes: [KbliCategoryEnum.Q],
    description:
      'Layanan pendidikan formal/nonformal (PAUD, SD, SMP, SMA/SMK, kursus, beasiswa daerah, pelatihan vokasi/BLK).',
    typicalSignals: 'Realisasi BOS/BOSDA/beasiswa KTT, operasional satuan pendidikan & pelatihan vokasi.',
  },
  {
    groupCode: 'R',
    shortName: 'Jasa Kesehatan & Kegiatan Sosial',
    officialName: 'Jasa Kesehatan dan Kegiatan Sosial',
    fullLabel: formatLapusLabel('R', 'Jasa Kesehatan dan Kegiatan Sosial'),
    kbliCodes: [KbliCategoryEnum.R],
    description:
      'Layanan RSUD Akhmad Berahim, puskesmas, klinik/apotek, tenaga kesehatan, serta layanan sosial masyarakat.',
    typicalSignals: 'Peningkatan layanan RSUD/puskesmas, program jaminan kesehatan daerah, bansos rentan.',
  },
  {
    groupCode: 'S,T,U,V',
    shortName: 'Jasa Lainnya',
    officialName: 'Jasa Lainnya (KBLI S, T, U & V)',
    fullLabel: formatLapusLabel('S,T,U,V', 'Jasa Lainnya (KBLI S, T, U & V)'),
    kbliCodes: [
      KbliCategoryEnum.S,
      KbliCategoryEnum.T,
      KbliCategoryEnum.U,
      KbliCategoryEnum.V,
    ],
    description:
      'Mencakup KBLI 2025 S (festival budaya Irau, wisata, olahraga/rekreasi), KBLI 2025 T (organisasi kemasyarakatan/ibadah, reparasi/bengkel mobil & motor, salon/laundry), KBLI 2025 U (jasa rumah tangga), dan KBLI 2025 V (badan internasional).',
    typicalSignals: 'Festival budaya Irau/wisata Tana Tidung, event olahraga daerah, bengkel kendaraan & jasa personal.',
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
      'Penumpukan atau penarikan stok barang jadi, bahan baku industri, komoditas tambang (stockpile), serta cadangan pangan di gudang.',
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
 * Mengurai kode grup 17 sektor PDRB (mis. 'J,K', 'N,O', 'S,T,U,V', atau 'A') menjadi array kode KBLI 2025 Enum.
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
 * Mengembalikan metadata sektor PDRB (17 sektor) tempat bernaungnya sebuah kode KBLI 2025 (22 huruf).
 */
export function getPdrb17GroupForKbli(code: KbliCategoryEnum): Pdrb17SectorMeta {
  const groupCode = KBLI_CATEGORY_META[code].pdrb17GroupCode;
  return PDRB_17_SECTORS.find((s) => s.groupCode === groupCode) ?? PDRB_17_SECTORS[0]!;
}
