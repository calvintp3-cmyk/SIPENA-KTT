import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

import bcrypt from "bcryptjs";
import { db, pool } from "./index";
import {
  users,
  articles,
  economicPhenomena,
  auditLogs,
  odonEntries,
  odonClassifications,
  kbliConversions,
  articleProposals,
} from "./schema";
import { normalizeAndHashUrl } from "../lib/url-hash";
import {
  getExpenditureWeightPercent,
  getSectorWeightPercent,
} from "../lib/constants/taxonomy";
import { resolveFullKbli2020To2025 } from "../lib/kbli/crosswalk-server";
import lampiran5Data from "../lib/kbli/lampiran5-2020-2025.json";
import { count, eq } from "drizzle-orm";

async function seed() {
  console.log("Seeding SIPENA-KTT PostgreSQL database...");

  // 1. Seed BPS Tana Tidung Staff Accounts
  const defaultPassHash = await bcrypt.hash("BpsKtt6504!", 10);

  const seedUsers = [
    {
      email: "admin@bps6504.go.id",
      name: "Koordinator Nerwilis (Admin)",
      passwordHash: defaultPassHash,
      role: "admin" as const,
      nip: "199204152014101001",
    },
    {
      email: "analis@bps6504.go.id",
      name: "R. Wicaksono (Analis PDRB)",
      passwordHash: defaultPassHash,
      role: "editor" as const,
      nip: "199508212018021002",
    },
    {
      email: "viewer@bps6504.go.id",
      name: "Kepala BPS Kab. Tana Tidung",
      passwordHash: defaultPassHash,
      role: "viewer" as const,
      nip: "197911032002121003",
    },
  ];

  for (const u of seedUsers) {
    await db
      .insert(users)
      .values(u)
      .onConflictDoNothing({ target: users.email });
  }

  const [analyst] = await db
    .select()
    .from(users)
    .where(eq(users.email, "analis@bps6504.go.id"))
    .limit(1);

  const verifierId = analyst?.id ?? null;

  // 2. Seed Realistic Articles & Economic Phenomena for Kabupaten Tana Tidung
  const seedDataset = [
    {
      url: "https://radartarakan.jawapos.com/tana-tidung/2025/03/28/pemkab-ktt-kebut-jalan-poros-bundaran-sebawang",
      title: "Pemkab Tana Tidung Kebut Pembangunan Akses Jalan Poros Tideng Pale - Bundaran Sebawang",
      source: "radar_tarakan" as const,
      publishedDate: new Date("2025-03-28T09:15:00+08:00"),
      author: "Redaksi Radar Tarakan",
      content:
        "TIDENG PALE — Pemerintah Kabupaten Tana Tidung terus memacu penyelesaian pengerjaan infrastruktur jalan poros yang menghubungkan ibukota Tideng Pale menuju kawasan pusat pemerintahan di Bundaran Sebawang.\n\nKepala Dinas Pekerjaan Umum dan Penataan Ruang (PUPR) menyampaikan bahwa dalam APBD Tahun Anggaran 2025 dialokasikan dana sebesar Rp 45 Miliar untuk merampungkan pengaspalan dan pelebaran jalan sepanjang 12,5 kilometer. Material seperti aspal dan batu gunung didatangkan melalui pelabuhan sungai terdekat.",
      phenomenon: {
        isEconomicPhenomenon: true,
        summary:
          "Pemerintah Kabupaten Tana Tidung mengalokasikan Rp 45 Miliar pada TA 2025 untuk penyelesaian akses jalan poros Tideng Pale - Bundaran Sebawang sepanjang 12,5 km, mendorong peningkatan output sektor konstruksi jalan dan penyerapan material semen serta aspal.",
        kbliCategory: "F" as const,
        kbliSubsector: "Konstruksi Jalan dan Jembatan",
        expenditureComponent: "PMTB" as const,
        impactType: "positif" as const,
        priceVolumeEffect: "volume" as const,
        affectedCommodities: ["Semen", "Aspal", "Batu Gunung"],
        keyNumericalData: { anggaran_idr: 45000000000, panjang_km: 12.5 },
        quarter: "Q1" as const,
        year: 2025,
        confidenceScore: 0.94,
        status: "pending" as const,
        reviewerNotes: null,
      },
    },
    {
      url: "https://korankaltara.com/harga-tbs-sawit-tana-tidung-turun-8-persen-akhir-triwulan-i",
      title: "Harga Tandan Buah Segar (TBS) Sawit di Tana Tidung Turun 8% Mengikuti Dinamika Pasar Global",
      source: "koran_kaltara" as const,
      publishedDate: new Date("2025-03-27T14:20:00+08:00"),
      author: "Wartawan KTT",
      content:
        "SESAYAP — Petani kelapa sawit swadaya di Kecamatan Sesayap dan Betayau melaporkan penurunan harga beli Tandan Buah Segar (TBS) di tingkat pabrik kelapa sawit (PKS) selama Maret 2025. Harga TBS terkoreksi sekitar 8 persen dari Rp 2.450/kg menjadi Rp 2.250/kg akibat penyesuaian harga acuan CPO global dan ongkos angkut menuju dermaga muat.",
      phenomenon: {
        isEconomicPhenomenon: true,
        summary:
          "Harga beli Tandan Buah Segar (TBS) kelapa sawit di Kecamatan Sesayap dan Betayau mengalami koreksi sebesar 8% dari Rp 2.450/kg menjadi Rp 2.250/kg pada akhir Q1 2025 akibat penyesuaian harga acuan CPO global.",
        kbliCategory: "A" as const,
        kbliSubsector: "Perkebunan Kelapa Sawit",
        expenditureComponent: "PK_RT" as const,
        impactType: "negatif" as const,
        priceVolumeEffect: "harga" as const,
        affectedCommodities: ["Tandan Buah Segar (TBS)", "Kelapa Sawit", "CPO"],
        keyNumericalData: { harga_lama_idr: 2450, harga_baru_idr: 2250, perubahan_persen: -8.0 },
        quarter: "Q1" as const,
        year: 2025,
        confidenceScore: 0.92,
        status: "pending" as const,
        reviewerNotes: null,
      },
    },
    {
      url: "https://benuanta.co.id/2025/03/26/produksi-batubara-muruk-rian-sesuaikan-kuota-rkab",
      title: "Operasional Tambang Batubara di Muruk Rian Sesuaikan Target Pengapalan Triwulan I 2025",
      source: "benuanta" as const,
      publishedDate: new Date("2025-03-26T10:45:00+08:00"),
      author: "Tim Benuanta",
      content:
        "MURUK RIAN — Sejumlah perusahaan pemegang IUP pertambangan batubara di wilayah Muruk Rian Kabupaten Tana Tidung melakukan penyesuaian jadwal pengapalan tongkang di Sungai Sesayap menyusul persetujuan RKAB 2025. Total volume produksi triwulan pertama tercatat stabil di kisaran 420 ribu metrik ton dengan tujuan pasar ekspor Asia Timur.",
      phenomenon: {
        isEconomicPhenomenon: true,
        summary:
          "Perusahaan pertambangan batubara di Kecamatan Muruk Rian merealisasikan pengapalan sekitar 420.000 metrik ton pada Triwulan I 2025 pasca-persetujuan RKAB, menopang kinerja sektor pertambangan dan nilai ekspor antar-daerah/luar negeri.",
        kbliCategory: "B" as const,
        kbliSubsector: "Pertambangan Batubara",
        expenditureComponent: "EKSPOR" as const,
        impactType: "positif" as const,
        priceVolumeEffect: "volume" as const,
        affectedCommodities: ["Batubara"],
        keyNumericalData: { volume_ton: 420000 },
        quarter: "Q1" as const,
        year: 2025,
        confidenceScore: 0.89,
        status: "pending" as const,
        reviewerNotes: null,
      },
    },
    {
      url: "https://kaltara.tribunnews.com/2025/03/25/dishub-ktt-tambah-jadwal-speedboat-tideng-pale-tarakan",
      title: "Dishub Tana Tidung Tambah Jadwal Operasional Speedboat Reguler Rute Tideng Pale - Tarakan",
      source: "tribun_kaltara" as const,
      publishedDate: new Date("2025-03-25T16:10:00+08:00"),
      author: "Tribun Kaltara",
      content:
        "TIDENG PALE — Dinas Perhubungan Kabupaten Tana Tidung menambah dua jadwal operasional armada speedboat reguler setiap hari di Pelabuhan Sedulun rute Tideng Pale menuju Pelabuhan SDF Tengkayu I Tarakan guna mengantisipasi lonjakan penumpang menjelang Idulfitri 1446 H.",
      phenomenon: {
        isEconomicPhenomenon: true,
        summary:
          "Dinas Perhubungan Tana Tidung menambah 2 jadwal keberangkatan harian speedboat reguler rute Tideng Pale - Tarakan dari Pelabuhan Sedulun menjelang Idulfitri 1446 H, meningkatkan volume layanan jasa angkutan sungai.",
        kbliCategory: "H" as const,
        kbliSubsector: "Angkutan Sungai dan Penyeberangan",
        expenditureComponent: "PK_RT" as const,
        impactType: "positif" as const,
        priceVolumeEffect: "volume" as const,
        affectedCommodities: ["Jasa Angkutan Penumpang Sungai", "Speedboat"],
        keyNumericalData: { tambahan_armada_per_hari: 2 },
        quarter: "Q1" as const,
        year: 2025,
        confidenceScore: 0.91,
        status: "approved" as const,
        reviewerNotes: "Terkonfirmasi peningkatan frekuensi penumpang di Pelabuhan Sedulun.",
      },
    },
    {
      url: "https://kaltara.antaranews.com/berita/410234/realisasi-thr-asn-pemkab-tana-tidung-2025",
      title: "Pemkab Tana Tidung Cairkan Rp 18,4 Miliar THR ASN dan PPPK Jelang Lebaran 2025",
      source: "antara_kaltara" as const,
      publishedDate: new Date("2025-03-21T11:00:00+08:00"),
      author: "Antara Kaltara",
      content:
        "TIDENG PALE — Badan Pengelola Keuangan dan Aset Daerah (BPKAD) Kabupaten Tana Tidung mencairkan Tunjangan Hari Raya (THR) bagi 1.850 ASN dan PPPK dengan total anggaran mencapai Rp 18,4 Miliar pada akhir Maret 2025 untuk mendorong daya beli masyarakat lokal.",
      phenomenon: {
        isEconomicPhenomenon: true,
        summary:
          "BPKAD Kabupaten Tana Tidung merealisasikan pencairan THR senilai Rp 18,4 Miliar bagi 1.850 ASN dan PPPK pada Maret 2025, memberikan dorongan langsung pada Belanja Pegawai (PK-P) serta konsumsi rumah tangga menjelang hari raya.",
        kbliCategory: "O" as const,
        kbliSubsector: "Administrasi Pemerintahan & Belanja Pegawai",
        expenditureComponent: "PK_P" as const,
        impactType: "positif" as const,
        priceVolumeEffect: "keduanya" as const,
        affectedCommodities: ["Belanja Pegawai APBD", "Konsumsi Ritel"],
        keyNumericalData: { nominal_idr: 18400000000, penerima_asn: 1850 },
        quarter: "Q1" as const,
        year: 2025,
        confidenceScore: 0.97,
        status: "approved" as const,
        reviewerNotes: "Diverifikasi dengan data realisasi SP2D BPKAD Triwulan I.",
      },
    },
    {
      url: "https://korankaltara.com/panen-udang-windu-tambak-tana-lia-meningkat-q1-2025",
      title: "Produksi Tambak Udang Windu dan Bandeng di Kecamatan Tana Lia Naik 12% pada Awal 2025",
      source: "koran_kaltara" as const,
      publishedDate: new Date("2025-03-18T09:30:00+08:00"),
      author: "Koran Kaltara",
      content:
        "TANA LIA — Petambak tradisional di wilayah pesisir Kecamatan Tana Lia mencatatkan kenaikan hasil panen udang windu dan ikan bandeng sebesar 12 persen selama Januari–Maret 2025 berkat kondisi pasang surut dan salinitas air yang mendukung serta lancarnya pasokan benur dari Tarakan.",
      phenomenon: {
        isEconomicPhenomenon: true,
        summary:
          "Hasil panen perikanan budidaya air payau (udang windu dan bandeng) di Kecamatan Tana Lia tumbuh 12% pada Triwulan I 2025, meningkatkan suplai komoditas perikanan lokal dan pengiriman keluar daerah.",
        kbliCategory: "A" as const,
        kbliSubsector: "Perikanan Budidaya Air Payau",
        expenditureComponent: "EKSPOR" as const,
        impactType: "positif" as const,
        priceVolumeEffect: "volume" as const,
        affectedCommodities: ["Udang Windu", "Ikan Bandeng"],
        keyNumericalData: { pertumbuhan_persen: 12.0 },
        quarter: "Q1" as const,
        year: 2025,
        confidenceScore: 0.9,
        status: "approved" as const,
        reviewerNotes: "Sesuai laporan Dinas Perikanan KTT Q1.",
      },
    },
    {
      url: "https://radartarakan.jawapos.com/tana-tidung/2025/03/14/pembangunan-gedung-rsud-akhmad-berahim-tahap-lanjutan",
      title: "Proyek Lanjutan Gedung Layanan Terpadu RSUD Akhmad Berahim Masuk Tahap Struktur",
      source: "radar_tarakan" as const,
      publishedDate: new Date("2025-03-14T13:10:00+08:00"),
      author: "Radar Tarakan",
      content:
        "SESAYAP HILIR — Pengerjaan fisik gedung layanan terpadu RSUD Akhmad Berahim senilai Rp 29 Miliar telah mencapai progres pengecoran lantai dua. Kontraktor pelaksana mengerahkan 85 tenaga kerja lokal dan mendatangkan besi beton serta semen curah dari luar daerah.",
      phenomenon: {
        isEconomicPhenomenon: true,
        summary:
          "Proyek konstruksi gedung layanan terpadu RSUD Akhmad Berahim bernilai Rp 29 Miliar memasuki tahap struktur dengan serapan 85 tenaga kerja pada Triwulan I 2025, berkontribusi pada kategori Konstruksi dan PMTB.",
        kbliCategory: "F" as const,
        kbliSubsector: "Konstruksi Gedung Kesehatan",
        expenditureComponent: "PMTB" as const,
        impactType: "positif" as const,
        priceVolumeEffect: "volume" as const,
        affectedCommodities: ["Besi Beton", "Semen Curah", "Pasir"],
        keyNumericalData: { nilai_proyek_idr: 29000000000, tenaga_kerja: 85 },
        quarter: "Q1" as const,
        year: 2025,
        confidenceScore: 0.93,
        status: "approved" as const,
        reviewerNotes: "Progres fisik terkonfirmasi di lapangan.",
      },
    },
    {
      url: "https://benuanta.co.id/2025/03/10/pabrik-kelapa-sawit-sesayap-perluas-kapasitas-olah-cpo",
      title: "Pabrik Kelapa Sawit di Sesayap Tingkatkan Kapasitas Olah CPO Menjadi 45 Ton per Jam",
      source: "benuanta" as const,
      publishedDate: new Date("2025-03-10T15:00:00+08:00"),
      author: "Benuanta",
      content:
        "SESAYAP — Sebuah pabrik pengolahan kelapa sawit swasta di wilayah Sesayap meresmikan penambahan lini boiler baru yang meningkatkan kapasitas olah TBS dari 30 ton/jam menjadi 45 ton/jam guna mengimbangi produktivitas kebun inti dan plasma yang memasuki usia puncak.",
      phenomenon: {
        isEconomicPhenomenon: true,
        summary:
          "Penambahan lini boiler baru pada pabrik kelapa sawit di Sesayap meningkatkan kapasitas pengolahan TBS menjadi 45 ton/jam (naik 50%), mendorong output Industri Pengolahan CPO dan investasi barang modal mesin.",
        kbliCategory: "C" as const,
        kbliSubsector: "Industri Minyak Mentah Kelapa Sawit (CPO)",
        expenditureComponent: "PMTB" as const,
        impactType: "positif" as const,
        priceVolumeEffect: "volume" as const,
        affectedCommodities: ["Crude Palm Oil (CPO)", "Inti Sawit"],
        keyNumericalData: { kapasitas_lama_ton_jam: 30, kapasitas_baru_ton_jam: 45 },
        quarter: "Q1" as const,
        year: 2025,
        confidenceScore: 0.95,
        status: "approved" as const,
        reviewerNotes: "Sangat relevan untuk subsektor Industri Makanan & Minuman (C).",
      },
    },
    {
      url: "https://kaltara.tribunnews.com/2025/03/05/harga-beras-premium-pasar-imaddudin-tideng-pale-terjaga",
      title: "Operasi Pasar Murah Bulog Jaga Stabilitas Harga Beras dan Minyak Goreng di Tideng Pale",
      source: "tribun_kaltara" as const,
      publishedDate: new Date("2025-03-05T10:15:00+08:00"),
      author: "Tribun Kaltara",
      content:
        "TIDENG PALE — Dinas Perindagkop UKM KTT bersama Perum Bulog menyalurkan 25 ton beras SPHP dan 4.000 liter minyak goreng di Pasar Imaddudin Tideng Pale untuk meredam gejolak harga pangan memasuki awal Ramadan.",
      phenomenon: {
        isEconomicPhenomenon: true,
        summary:
          "Penyaluran 25 ton beras SPHP dan 4.000 liter minyak goreng melalui operasi pasar di Pasar Imaddudin Tideng Pale menjaga stabilitas harga pangan eceran pada awal Ramadan (Q1 2025).",
        kbliCategory: "G" as const,
        kbliSubsector: "Perdagangan Eceran Bahan Pangan",
        expenditureComponent: "PK_RT" as const,
        impactType: "netral" as const,
        priceVolumeEffect: "harga" as const,
        affectedCommodities: ["Beras SPHP", "Minyak Goreng"],
        keyNumericalData: { beras_ton: 25, minyak_liter: 4000 },
        quarter: "Q1" as const,
        year: 2025,
        confidenceScore: 0.88,
        status: "approved" as const,
        reviewerNotes: "Tercatat dalam pemantauan IPH KTT.",
      },
    },
    {
      url: "https://korankaltara.com/pemkab-tana-tidung-gelar-lomba-perahu-hias-hut-kecamatan",
      title: "Ratusan Warga Meriahkan Lomba Perahu Hias dan Upacara Adat di Tepian Sungai Sesayap",
      source: "koran_kaltara" as const,
      publishedDate: new Date("2025-03-02T17:00:00+08:00"),
      author: "Koran Kaltara",
      content:
        "TIDENG PALE — Ratusan warga memadati tepian Sungai Sesayap untuk menyaksikan perlombaan perahu hias dalam rangka memperingati hari jadi kecamatan setempat. Acara berlangsung meriah dengan dihadiri tokoh adat dan perangkat desa.",
      phenomenon: {
        isEconomicPhenomenon: false,
        summary:
          "Berita liputan seremonial lomba perahu hias dan upacara adat tanpa rincian nilai transaksi ekonomi signifikan, proyek anggaran, maupun dampak indikator PDRB.",
        kbliCategory: "R_S_T_U" as const,
        kbliSubsector: "Kegiatan Kebudayaan & Seremonial",
        expenditureComponent: "TIDAK_RELEVAN" as const,
        impactType: "netral" as const,
        priceVolumeEffect: "tidak_langsung" as const,
        affectedCommodities: [],
        keyNumericalData: {},
        quarter: "Q1" as const,
        year: 2025,
        confidenceScore: 0.86,
        status: "rejected" as const,
        reviewerNotes: "Auto-classified: Non-economic ceremonial event.",
      },
    },
    {
      url: "https://radartarakan.jawapos.com/tana-tidung/2025/02/20/pln-tideng-pale-tambah-kapasitas-trafo-gardu-induk",
      title: "PLN ULP Tideng Pale Tambah Kapasitas Pembangkit & Trafo Untuk Kawasan Pusat Pemerintahan",
      source: "radar_tarakan" as const,
      publishedDate: new Date("2025-02-20T08:40:00+08:00"),
      author: "Radar Tarakan",
      content:
        "TIDENG PALE — PLN melakukan penambahan kapasitas daya sebesar 2 MW dan penggantian trafo distribusi untuk melayani kompleks perkantoran baru serta pertumbuhan sambungan pelanggan rumah tangga di Kecamatan Sesayap.",
      phenomenon: {
        isEconomicPhenomenon: true,
        summary:
          "Penambahan kapasitas kelistrikan sebesar 2 MW oleh PLN ULP Tideng Pale memperluas suplai energi ke kawasan perkantoran dan pelanggan rumah tangga di Sesayap pada Q1 2025.",
        kbliCategory: "D" as const,
        kbliSubsector: "Ketenagalistrikan",
        expenditureComponent: "PMTB" as const,
        impactType: "positif" as const,
        priceVolumeEffect: "volume" as const,
        affectedCommodities: ["Tenaga Listrik (kWh)"],
        keyNumericalData: { tambahan_daya_mw: 2 },
        quarter: "Q1" as const,
        year: 2025,
        confidenceScore: 0.91,
        status: "approved" as const,
        reviewerNotes: "Sesuai data pertumbuhan kWh terjual kategori D.",
      },
    },
    {
      url: "https://kaltara.antaranews.com/berita/408111/jaringan-fiber-optik-kominfo-tana-tidung-menjangkau-muruk-rian",
      title: "Perluasan Jaringan Fiber Optik Blankspot Menjangkau Lima Desa di Muruk Rian",
      source: "antara_kaltara" as const,
      publishedDate: new Date("2025-02-12T11:30:00+08:00"),
      author: "Antara Kaltara",
      content:
        "MURUK RIAN — Pemerintah Kabupaten Tana Tidung bersama penyedia layanan telekomunikasi menuntaskan penarikan kabel fiber optik di lima desa wilayah pedalaman Muruk Rian guna menunjang layanan administrasi digital dan transaksi UMKM.",
      phenomenon: {
        isEconomicPhenomenon: true,
        summary:
          "Penuntasan jaringan fiber optik di lima desa Kecamatan Muruk Rian memperluas akses layanan telekomunikasi data dan mempercepat aktivitas digitalisasi sektor informasi dan komunikasi pada Triwulan I 2025.",
        kbliCategory: "J" as const,
        kbliSubsector: "Telekomunikasi Kabel & Data",
        expenditureComponent: "PMTB" as const,
        impactType: "positif" as const,
        priceVolumeEffect: "volume" as const,
        affectedCommodities: ["Layanan Data Telekomunikasi"],
        keyNumericalData: { jumlah_desa: 5 },
        quarter: "Q1" as const,
        year: 2025,
        confidenceScore: 0.87,
        status: "approved" as const,
        reviewerNotes: "Mendukung perluasan cakupan kategori J.",
      },
    },
    {
      url: "https://fokusborneo.com/daerah/tana-tidung/pelabuhan-bebatu-pacu-pengapalan-batubara-q1-2025/",
      title: "Terminal Khusus Pelabuhan Bebatu Pacu Pengapalan Batubara dan Komoditas Perkebunan Tana Tidung",
      source: "fokus_borneo" as const,
      publishedDate: new Date("2025-03-29T09:00:00+08:00"),
      author: "Redaksi Fokus Borneo",
      content:
        "SESAYAP HILIR — Aktivitas muat tongkang batubara dan komoditas turunan kelapa sawit melalui kawasan Pelabuhan Bebatu Kabupaten Tana Tidung menunjukkan tren penguatan sepanjang akhir Triwulan I 2025 didukung membaiknya alur pelayaran Sungai Sesayap.",
      phenomenon: {
        isEconomicPhenomenon: true,
        summary:
          "Kelancaran bongkar muat tongkang batubara dan komoditas kelapa sawit di Pelabuhan Bebatu Kecamatan Sesayap Hilir menjaga kelancaran arus pengiriman barang keluar daerah Kabupaten Tana Tidung pada Triwulan I 2025.",
        kbliCategory: "B" as const,
        kbliSubsector: "Pertambangan Batu Bara",
        expenditureComponent: "EKSPOR" as const,
        impactType: "positif" as const,
        priceVolumeEffect: "volume" as const,
        affectedCommodities: ["Batu Bara", "Kelapa Sawit"],
        keyNumericalData: { triwulan: "Q1", tahun: 2025 },
        quarter: "Q1" as const,
        year: 2025,
        confidenceScore: 0.96,
        status: "approved" as const,
        reviewerNotes: "Selaras dengan dominasi Sektor B (37.80%) dan Net Ekspor (49.98%).",
      },
    },
  ];

  for (const entry of seedDataset) {
    const { canonicalUrl, urlHash } = normalizeAndHashUrl(entry.url);

    // Insert or fetch article
    await db
      .insert(articles)
      .values({
        url: canonicalUrl,
        urlHash,
        title: entry.title,
        source: entry.source,
        publishedDate: entry.publishedDate,
        author: entry.author,
        content: entry.content,
        isScraped: true,
        isProcessed: true,
      })
      .onConflictDoNothing({ target: articles.urlHash });

    const [articleRow] = await db
      .select()
      .from(articles)
      .where(eq(articles.urlHash, urlHash))
      .limit(1);

    if (!articleRow) continue;

    const isVerified = entry.phenomenon.status !== "pending";

    await db
      .insert(economicPhenomena)
      .values({
        articleId: articleRow.id,
        isEconomicPhenomenon: entry.phenomenon.isEconomicPhenomenon,
        summary: entry.phenomenon.summary,
        kbliCategory: entry.phenomenon.kbliCategory,
        kbliSubsector: entry.phenomenon.kbliSubsector,
        expenditureComponent: entry.phenomenon.expenditureComponent,
        impactType: entry.phenomenon.impactType,
        priceVolumeEffect: entry.phenomenon.priceVolumeEffect,
        affectedCommodities: entry.phenomenon.affectedCommodities,
        keyNumericalData: entry.phenomenon.keyNumericalData as Record<string, string | number | null>,
        quarter: entry.phenomenon.quarter,
        year: entry.phenomenon.year,
        confidenceScore: entry.phenomenon.confidenceScore,
        status: entry.phenomenon.status,
        reviewerNotes: entry.phenomenon.reviewerNotes,
        verifiedBy: isVerified ? verifierId : null,
        verifiedAt: isVerified ? new Date("2025-03-29T08:00:00+08:00") : null,
      })
      .onConflictDoNothing({ target: economicPhenomena.articleId });
  }

  // 3. Seed Audit Logs for verified phenomena if none exist
  const existingLogs = await db.select().from(auditLogs).limit(1);
  if (existingLogs.length === 0 && verifierId) {
    const approvedRows = await db
      .select()
      .from(economicPhenomena)
      .where(eq(economicPhenomena.status, "approved"))
      .limit(3);

    for (const row of approvedRows) {
      await db.insert(auditLogs).values({
        phenomenonId: row.id,
        userId: verifierId,
        action: "APPROVE",
        previousValues: { status: "pending" },
        newValues: { status: "approved", kbliCategory: row.kbliCategory },
        ipAddress: "127.0.0.1",
      });
    }
  }

  // 4. Seed Official KBLI 2020 <-> 2025 Crosswalk (Lampiran 5 BPS0000)
  const [{ value: kbliTotal }] = await db
    .select({ value: count() })
    .from(kbliConversions);
  const rawCrosswalk = lampiran5Data as Array<{
    c20: string;
    t20: string;
    c25: string;
    t25: string;
    pdrb: string;
    k25: string;
    type: string;
  }>;

  if (Number(kbliTotal) < rawCrosswalk.length) {
    if (Number(kbliTotal) > 0) {
      await db.delete(kbliConversions);
    }
    const chunkSize = 500;
    for (let i = 0; i < rawCrosswalk.length; i += chunkSize) {
      const slice = rawCrosswalk.slice(i, i + chunkSize).map((item) => ({
        code2020: item.c20,
        title2020: item.t20,
        code2025: item.c25,
        title2025: item.t25,
        lampiranRef: "BPS0000-L5",
        conversionType: item.type,
      }));
      await db.insert(kbliConversions).values(slice);
    }
    console.log(`Seeded ${rawCrosswalk.length} KBLI 2020 <-> 2025 crosswalk records.`);
  }

  // 5. Seed Initial Verified ODON Sheet 6503 Entries if table is empty
  const [{ value: odonTotal }] = await db
    .select({ value: count() })
    .from(odonEntries);

  if (Number(odonTotal) === 0) {
    const [adminUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, "admin@bps6504.go.id"))
      .limit(1);
    const odonVerifierId = adminUser?.id ?? verifierId;

    const odonSeedItems = [
      {
        url: "https://fokusborneo.com/daerah/tana-tidung/pelabuhan-bebatu-pacu-pengapalan-batubara-q1-2025/",
        entryDate: new Date("2025-03-30T07:15:00+08:00"),
        publishedDate: new Date("2025-03-29T09:00:00+08:00"),
        sourceMedia: "fokus_borneo" as const,
        title: "Terminal Khusus Pelabuhan Bebatu Pacu Pengapalan Batubara dan Komoditas Perkebunan Tana Tidung",
        summary:
          "Kelancaran bongkar muat tongkang batubara dan komoditas kelapa sawit di Pelabuhan Bebatu Kecamatan Sesayap Hilir menjaga kelancaran arus pengiriman barang keluar daerah Kabupaten Tana Tidung pada Triwulan I 2025.",
        quarter: "Q1" as const,
        year: 2025,
        kbliCode2020: "05100",
        kbliCategory: "B" as const,
        expenditureComponent: "EKSPOR" as const,
        impactType: "positif" as const,
        impactNarrative: "Pengiriman komoditas primer melalui alur Pelabuhan Bebatu menopang Net Ekspor KTT.",
      },
      {
        url: "https://kaltara.antaranews.com/berita/410234/realisasi-thr-asn-pemkab-tana-tidung-2025",
        entryDate: new Date("2025-03-22T07:15:00+08:00"),
        publishedDate: new Date("2025-03-21T11:00:00+08:00"),
        sourceMedia: "antara_kaltara" as const,
        title: "Pemkab Tana Tidung Cairkan Rp 18,4 Miliar THR ASN dan PPPK Jelang Lebaran 2025",
        summary:
          "BPKAD Kabupaten Tana Tidung merealisasikan pencairan THR senilai Rp 18,4 Miliar bagi 1.850 ASN dan PPPK pada Maret 2025, mendorong Belanja Pegawai (PK-P) serta konsumsi rumah tangga menjelang Idulfitri.",
        quarter: "Q1" as const,
        year: 2025,
        kbliCode2020: "84119",
        kbliCategory: "O" as const,
        expenditureComponent: "PK_P" as const,
        impactType: "positif" as const,
        impactNarrative: "Realisasi belanja pegawai APBD mendorong konsumsi pemerintah (PK-P) Triwulan I.",
      },
      {
        url: "https://kaltara.tribunnews.com/2025/03/25/dishub-ktt-tambah-jadwal-speedboat-tideng-pale-tarakan",
        entryDate: new Date("2025-03-26T07:15:00+08:00"),
        publishedDate: new Date("2025-03-25T16:10:00+08:00"),
        sourceMedia: "tribun_kaltara" as const,
        title: "Dishub Tana Tidung Tambah Jadwal Operasional Speedboat Reguler Rute Tideng Pale - Tarakan",
        summary:
          "Dinas Perhubungan Tana Tidung menambah 2 jadwal keberangkatan harian speedboat reguler rute Tideng Pale - Tarakan dari Pelabuhan Sedulun menjelang Idulfitri 1446 H.",
        quarter: "Q1" as const,
        year: 2025,
        kbliCode2020: "50211",
        kbliCategory: "H" as const,
        expenditureComponent: "PK_RT" as const,
        impactType: "positif" as const,
        impactNarrative: "Kenaikan frekuensi penumpang transportasi sungai rute Pelabuhan Sedulun - Tarakan.",
      },
      {
        url: "https://korankaltara.com/panen-udang-windu-tambak-tana-lia-meningkat-q1-2025",
        entryDate: new Date("2025-03-19T07:15:00+08:00"),
        publishedDate: new Date("2025-03-18T09:30:00+08:00"),
        sourceMedia: "koran_kaltara" as const,
        title: "Produksi Tambak Udang Windu dan Bandeng di Kecamatan Tana Lia Naik 12% pada Awal 2025",
        summary:
          "Hasil panen perikanan budidaya air payau (udang windu dan bandeng) di Kecamatan Tana Lia tumbuh 12% pada Triwulan I 2025, meningkatkan pengiriman komoditas perikanan keluar daerah.",
        quarter: "Q1" as const,
        year: 2025,
        kbliCode2020: "03251",
        kbliCategory: "A" as const,
        expenditureComponent: "EKSPOR" as const,
        impactType: "positif" as const,
        impactNarrative: "Peningkatan output budidaya tambak air payau di wilayah pesisir Tana Lia.",
      },
      {
        url: "https://radartarakan.jawapos.com/tana-tidung/2025/03/14/pembangunan-gedung-rsud-akhmad-berahim-tahap-lanjutan",
        entryDate: new Date("2025-03-15T07:15:00+08:00"),
        publishedDate: new Date("2025-03-14T13:10:00+08:00"),
        sourceMedia: "radar_tarakan" as const,
        title: "Proyek Lanjutan Gedung Layanan Terpadu RSUD Akhmad Berahim Masuk Tahap Struktur",
        summary:
          "Proyek konstruksi gedung layanan terpadu RSUD Akhmad Berahim bernilai Rp 29 Miliar memasuki tahap struktur dengan serapan 85 tenaga kerja pada Triwulan I 2025.",
        quarter: "Q1" as const,
        year: 2025,
        kbliCode2020: "41015",
        kbliCategory: "F" as const,
        expenditureComponent: "PMTB" as const,
        impactType: "positif" as const,
        impactNarrative: "Pembentukan modal tetap bruto berupa bangunan fasilitas kesehatan daerah.",
      },
      {
        url: "https://benuanta.co.id/2025/03/10/pabrik-kelapa-sawit-sesayap-perluas-kapasitas-olah-cpo",
        entryDate: new Date("2025-03-11T07:15:00+08:00"),
        publishedDate: new Date("2025-03-10T15:00:00+08:00"),
        sourceMedia: "benuanta" as const,
        title: "Pabrik Kelapa Sawit di Sesayap Tingkatkan Kapasitas Olah CPO Menjadi 45 Ton per Jam",
        summary:
          "Penambahan lini boiler baru pada pabrik kelapa sawit di Sesayap meningkatkan kapasitas pengolahan TBS menjadi 45 ton/jam (naik 50%), mendorong Industri Pengolahan CPO dan PMTB mesin.",
        quarter: "Q1" as const,
        year: 2025,
        kbliCode2020: "10431",
        kbliCategory: "C" as const,
        expenditureComponent: "PMTB" as const,
        impactType: "positif" as const,
        impactNarrative: "Ekspansi kapasitas industri pengolahan CPO (3.54% PDRB) dan belanja mesin.",
      },
      {
        url: "https://kaltara.tribunnews.com/2025/03/05/harga-beras-premium-pasar-imaddudin-tideng-pale-terjaga",
        entryDate: new Date("2025-03-06T07:15:00+08:00"),
        publishedDate: new Date("2025-03-05T10:15:00+08:00"),
        sourceMedia: "tribun_kaltara" as const,
        title: "Operasi Pasar Murah Bulog Jaga Stabilitas Harga Beras dan Minyak Goreng di Tideng Pale",
        summary:
          "Penyaluran 25 ton beras SPHP dan 4.000 liter minyak goreng melalui operasi pasar di Pasar Imaddudin Tideng Pale menjaga stabilitas harga pangan eceran pada awal Ramadan.",
        quarter: "Q1" as const,
        year: 2025,
        kbliCode2020: "47111",
        kbliCategory: "G" as const,
        expenditureComponent: "PK_RT" as const,
        impactType: "netral" as const,
        impactNarrative: "Stabilisasi harga komoditas pangan rumah tangga melalui perdagangan eceran.",
      },
      {
        url: "https://radartarakan.jawapos.com/tana-tidung/2025/02/20/pln-tideng-pale-tambah-kapasitas-trafo-gardu-induk",
        entryDate: new Date("2025-02-21T07:15:00+08:00"),
        publishedDate: new Date("2025-02-20T08:40:00+08:00"),
        sourceMedia: "radar_tarakan" as const,
        title: "PLN ULP Tideng Pale Tambah Kapasitas Pembangkit & Trafo Untuk Kawasan Pusat Pemerintahan",
        summary:
          "PLN melakukan penambahan kapasitas daya 2 MW dan penggantian trafo distribusi untuk melayani kawasan perkantoran serta sambungan rumah tangga di Kecamatan Sesayap.",
        quarter: "Q1" as const,
        year: 2025,
        kbliCode2020: "35111",
        kbliCategory: "D" as const,
        expenditureComponent: "PMTB" as const,
        impactType: "positif" as const,
        impactNarrative: "Penambahan kapasitas infrastruktur ketenagalistrikan di ibu kota KTT.",
      },
    ];

    for (const item of odonSeedItems) {
      const { canonicalUrl, urlHash } = normalizeAndHashUrl(item.url);
      const [articleRow] = await db
        .select({ id: articles.id })
        .from(articles)
        .where(eq(articles.urlHash, urlHash))
        .limit(1);

      const resolvedKbli = resolveFullKbli2020To2025(item.kbliCode2020);

      const [insertedEntry] = await db
        .insert(odonEntries)
        .values({
          articleId: articleRow?.id ?? null,
          entryDate: item.entryDate,
          publishedDate: item.publishedDate,
          sourceMedia: item.sourceMedia,
          sourceUrl: canonicalUrl,
          title: item.title,
          economicPhenomenonSummary: item.summary,
          quarter: item.quarter,
          year: item.year,
          status: "verified",
          curatorNotes: "Seeded Sheet 6503 baseline (SSoT KBLI 2025 & PDRB ADHB 2025).",
          verifiedBy: odonVerifierId,
          verifiedAt: item.entryDate,
        })
        .returning({ id: odonEntries.id });

      if (insertedEntry) {
        await db.insert(odonClassifications).values({
          odonId: insertedEntry.id,
          kbliCategory: item.kbliCategory,
          kbliCode2020: item.kbliCode2020,
          kbliTitle2020: resolvedKbli?.title2020 ?? item.kbliCode2020,
          kbliCode2025: resolvedKbli?.code2025 ?? item.kbliCode2020,
          kbliTitle2025: resolvedKbli?.title2025 ?? item.kbliCode2020,
          pdrbWeight: Number((getSectorWeightPercent(item.kbliCategory) / 100).toFixed(4)),
          expenditureComponent: item.expenditureComponent,
          expenditureWeight: Number(
            (getExpenditureWeightPercent(item.expenditureComponent) / 100).toFixed(4)
          ),
          impactType: item.impactType,
          impactNarrative: item.impactNarrative,
        });
      }
    }
    console.log(`Seeded ${odonSeedItems.length} verified ODON Sheet 6503 records.`);
  }

  // 6. Seed Sample Article Proposals (Crowdsourced Moderation Queue) if empty
  const [{ value: proposalTotal }] = await db
    .select({ value: count() })
    .from(articleProposals);

  if (Number(proposalTotal) === 0) {
    await db.insert(articleProposals).values([
      {
        url: "https://radartarakan.jawapos.com/tana-tidung/2025/03/28/pemkab-ktt-resmikan-sentra-pengolahan-kayu-tana-lia",
        title: "Pemkab Tana Tidung Dorong Hilirisasi Penggergajian Kayu Rakyat di Kecamatan Tana Lia",
        submitterName: "Dinas Perindagkop & UKM Kab. Tana Tidung",
        submitterAgency: "OPD Pemkab Tana Tidung",
        submitterEmail: "disperindagkop@tanatidungkab.go.id",
        economicNotes:
          "Penguatan kapasitas usaha penggergajian kayu (KBLI C 16101) dan suplai bahan baku pemanfaatan kayu hutan produksi (KBLI A 02111 -> 02102).",
        status: "pending",
      },
      {
        url: "https://fokusborneo.com/daerah/tana-tidung/distribusi-bbm-solar-tideng-pale-lancar-pasca-perbaikan-dermaga/",
        title: "Distribusi BBM Solar untuk Angkutan Sungai di Dermaga Tideng Pale Kembali Lancar",
        submitterName: "Hendra Wijaya",
        submitterAgency: "Asosiasi Angkutan Sungai KTT",
        submitterEmail: null,
        economicNotes:
          "Kelancaran pasokan BBM menekan biaya operasional speedboat reguler dan kapal barang angkutan Sungai Sesayap (KBLI H 50211 / 50221).",
        status: "pending",
      },
    ]);
    console.log("Seeded 2 initial article_proposals for moderation queue.");
  }

  console.log("Seeding completed successfully!");
}

seed()
  .catch((err) => {
    console.error("Seed error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await pool.end();
  });
