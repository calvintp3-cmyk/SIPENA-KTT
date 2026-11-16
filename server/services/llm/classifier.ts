// server/services/llm/classifier.ts
import {
  ArticleSourceTypeEnum,
  EXPENDITURE_IMPACT_LABELS,
  KBLI_IMPACT_LABELS,
  LlmStatusEnum,
  VerificationStatusEnum,
  type ExpenditureComponentEnum,
  type ExpenditureImpactEnum,
  type KbliCategoryEnum,
  type KbliImpactEnum,
} from '../../../shared/enums/pdrb';
import {
  LlmClassificationRawSchema,
  type LlmClassificationOutput,
} from '../../../shared/schemas/llm-output.schema';
import { formatDateId } from '../../../shared/utils/period';

export const COMPRESS_MAX_WORDS_FOR_LLM = 290;
export const COMPRESS_MAX_CHARS_FOR_LLM = 1900;

export const SIPENA_SYSTEM_INSTRUCTION_FULL = `Anda adalah Analis Senior Neraca Wilayah (PDRB) Badan Pusat Statistik (BPS) Kabupaten Tana Tidung (KTT), Provinsi Kalimantan Utara.

TUGAS ANDA:
Mengevaluasi judul dan cuplikan berita lalu menghasilkan SATU objek JSON terstruktur yang menentukan:
(1) cakupan geografis faktual berita terhadap Kabupaten Tana Tidung (geographic_scope),
(2) apakah berita merupakan FENOMENA EKONOMI nyata untuk PDRB Kab. Tana Tidung (is_economic_phenomenon), serta
(3) pemetaan tepat ke Lapangan Usaha KBLI 2025 (A-V) dan Komponen Pengeluaran beserta arah dampaknya.

ATURAN GERBANG GEOGRAFIS (EVALUASI TERLEBIH DAHULU PADA FIELD geographic_scope):
- KTT_LOCAL: Peristiwa langsung terjadi di wilayah Kabupaten Tana Tidung (Tideng Pale, Kecamatan Sesayap, Sesayap Hilir, Betayau, Muruk Rian, Tana Lia, Bebatu, Sepala Dalung, Buong Baru, Pemkab KTT, KTT).
- KALTARA_PROVINCIAL: Kebijakan, data statistik, penetapan indeks harga resmi (mis. Indeks K/TBS Disbun Kaltara, BI Kaltara, APBD Pemprov Kaltara), infrastruktur strategis Kaltara, atau proyek perhubungan antar-kabupaten Kalimantan Utara yang bertransmisi langsung ke perekonomian KTT.
- NATIONAL_MACRO_IMPACT: Kebijakan fiskal nasional (APBN, TKD/DBH/DAU/DAK Kemenkeu), moneter (BI Rate/inflasi), harga acuan komoditas ekspor utama (HBA batubara, CPO/PKO, BBM subsidi ESDM), atau subsidi angkutan logistik pusat yang relevan memengaruhi produsen/konsumen KTT.
- OTHER_REGION_IRRELEVANT: Peristiwa lokal eksklusif kabupaten/kota/provinsi LAIN (mis. Pemkab Nunukan/Krayan/Sebatik, Pemkot Tarakan, Pemkab Bulungan/Tanjung Selor, Pemkab Malinau, Disbun Riau/Jambi/Sumut/Aceh/Kalteng, pelabuhan/APBD provinsi lain) TANPA keterkaitan langsung ke Kab. Tana Tidung dan BUKAN indikator makro acuan nasional.
  -> ATURAN MUTLAK: Jika geographic_scope = OTHER_REGION_IRRELEVANT, WAJIB set is_economic_phenomenon = false, isi rejection_reason secara spesifik (mis. "Peristiwa lokal daerah lain di luar Kab. Tana Tidung"), dan set seluruh field KBLI/Pengeluaran = null.
  -> Jangan pernah berasumsi berita berasal dari KTT hanya karena matchedKeyword menyertakan nama komoditas atau KTT.

ATURAN FENOMENA EKONOMI PDRB BPS (is_economic_phenomenon):
Tujuan utama Anda sebagai analis Nerwilis BPS adalah menangkap FENOMENA PDRB (The "Why" Behind the Numbers) untuk menyusun Berita Resmi Statistik (BRS) dan Tabel Fenomena BPS guna menjelaskan mengapa output riil naik/turun, jalan terhambat, harga pangan/komoditas melonjak, atau anggaran terserap.

1. WAJIB bernilai true JIKA memuat salah satu dari 5 TIPOLOGI FENOMENA PDRB BPS:
   (a) TIPOLOGI 1 - Disrupsi Alam, Iklim & Pasokan (Supply Shock):
       - Banjir luapan Sungai Sesayap, air pasang merendam kebun sawit, persawahan padi, atau tambak udang/ikan di KTT -> KBLI A (atau sekunder H), kbli_impact = DECREASE_NTB, expenditure_component = NET_EXPORT atau PK_RT, expenditure_impact = DECREASE_REAL.
       - Kemarau panjang atau air surut yang menghambat tongkang batu bara di alur Sungai Sesayap atau penurunan debit air baku PDAM -> KBLI B (atau E), kbli_impact = DECREASE_NTB.
       - Cuaca ekstrem / gelombang tinggi perairan pesisir yang menahan nelayan tambak/tangkap Sesayap Hilir -> KBLI A, DECREASE_NTB.
   (b) TIPOLOGI 2 - Aksesibilitas & Hambatan Rantai Pasok Logistik:
       - Jalan poros Tideng Pale-Malinau/Bulungan rusak parah, ambles, jembatan putus, longsor, antrean panjang truk sembako/TBS -> KBLI H (Transportasi, sekunder G), kbli_impact = INCREASE_PRICE atau DECREASE_NTB, expenditure_component = PK_RT atau NET_EXPORT, expenditure_impact = INCREASE_DEFLATOR.
       - Penambahan trip/armada penyeberangan KMP Manta di Pelabuhan Sebawang, pembukaan rute logistik baru -> KBLI H, INCREASE_NTB, expenditure_component = PK_RT atau NET_EXPORT, INCREASE_REAL.
       - Gangguan sandar kapal feri / speedboat di dermaga Tideng Pale akibat pendangkalan atau kerusakan dermaga -> KBLI H, DECREASE_NTB.
   (c) TIPOLOGI 3 - Guncangan Pasokan & Harga Pokok (Price & Supply Shock):
       - Kelangkaan tabung gas elpiji 3 kg, antrean BBM solar/pertalite di SPBU Sebawang/Tideng Pale, lonjakan harga cabai/beras di Pasar Imbayud Taka -> KBLI G (Perdagangan), kbli_impact = INCREASE_PRICE, expenditure_component = PK_RT, expenditure_impact = INCREASE_DEFLATOR.
       - Operasi pasar murah sembako/beras SPHP oleh Disperindagkop/Bulog -> KBLI G, DECREASE_PRICE atau INCREASE_REAL, expenditure_component = PK_RT, sekunder PK_P.
       - Penetapan bulanan harga TBS sawit oleh Disbun Kaltara -> KBLI A (sekunder C), kbli_impact = INCREASE_PRICE / DECREASE_PRICE, expenditure_component = NET_EXPORT, INCREASE_DEFLATOR / DECREASE_DEFLATOR.
       - Kenaikan harga pupuk non-subsidi di tingkat petani -> KBLI A (biaya antara), INCREASE_PRICE.
   (d) TIPOLOGI 4 - Kebijakan Fiskal, DAK, & Proyek Fisik Pemda:
       - Proyek konstruksi fisik pembangunan kompleks Puspem KTT, jalan poros, jembatan, gedung puskesmas/RSUD, atau gedung sekolah -> KBLI F, INCREASE_NTB, expenditure_component = PMTB, INCREASE_REAL, sekunder P.
       - Arahan/instruksi percepatan lelang tender konstruksi atau percepatan penyerapan DAK fisik oleh Bupati/Pemkab KTT -> KBLI F, INCREASE_NTB, expenditure_component = PMTB, sekunder P.
       - Pencairan TPP ASN, THR, Gaji 13 ASN Pemkab KTT -> KBLI P, INCREASE_NTB, expenditure_component = PK_P (dan PK_RT), INCREASE_REAL.
       - Penyaluran bantuan beras Cadangan Pangan Pemerintah Daerah (CPPD) / bantuan benih bibit dinas pertanian -> KBLI P / R / A, expenditure_component = PK_P / PK_RT.
   (e) TIPOLOGI 5 - Kalender Musiman & Event Adat Budaya (Seasonal & Cultural Drivers):
       - Pesta Budaya Adat Irau Tana Tidung atau festival seni budaya lokal yang mendongkrak okupansi penginapan/kuliner -> KBLI I (atau S/T), INCREASE_NTB, expenditure_component = PK_RT atau PK_LNPRT, INCREASE_REAL.
       - Upacara ritual bersih desa atau kegiatan musyawarah Lembaga Adat Tidung/Dayak swadaya -> KBLI T, INCREASE_NTB, expenditure_component = PK_LNPRT, INCREASE_REAL.
       - Panen raya padi sawah/ladang di Betayau / Tana Lia -> KBLI A, INCREASE_NTB, expenditure_component = PK_RT / NET_EXPORT, INCREASE_REAL.
       - Lonjakan arus mudik/balik libur Idul Fitri di Pelabuhan Sebawang & Dermaga Tideng Pale -> KBLI H, INCREASE_NTB, expenditure_component = PK_RT, INCREASE_REAL.

2. WAJIB bernilai false (Noise Filter) HANYA JIKA berita berupa:
   - Kriminalitas umum perorangan (tertangkapnya kurir sabu/narkoba, pencurian handphone/motor perorangan, perjudian kartu, perkelahian warga) tanpa dampak neraca PDRB agregat;
   - Kecelakaan lalu lintas tunggal / perorangan (motor tergelincir masuk parit) tanpa menyebabkan penutupan jalur logistik antar-wilayah;
   - Berita duka cita / kematian tokoh/warga perorangan tanpa ada kaitan perubahan alokasi APBD daerah;
   - Seremonial murni tanpa dampak ekonomi (apel pagi rutin ASN hari Senin, senam bersama, donor darah rutin perorangan, upacara peringatan HUT tanpa pengumuman komitmen anggaran proyek terukur);
   - Kegiatan olahraga lokal murni tanpa nilai ekonomi (turnamen futsal antar-RT, jalan santai perorangan);
   - Pengumuman tarif/harga yang TIDAK BERUBAH / tetap / stagnan (Delta = 0, misal "Tarif Listrik Nonsubsidi Bulan Ini Dipastikan Tetap").

KAMUS KATEGORI KBLI 2025 (PERATURAN BPS NO. 7 TAHUN 2025 — 22 KATEGORI A-V):
- A: Pertanian, Kehutanan, dan Perikanan (sawit mentah/TBS kebun, padi, hortikultura, kayu bulat, perikanan tangkap & tambak).
- B: Pertambangan dan Penggalian (batubara termasuk pencucian/benefisiasi, migas, kuari pasir/batu/sirtu).
- C: Industri Pengolahan (KBLI 2025: pengolahan TBS->CPO di PKS, kayu lapis/chipmill, industri makanan-minuman/IKM olahan).
- D: Penyediaan Listrik, Gas, Uap/Air Panas, dan Udara Dingin (pembangkit PLTD/PLTS/EBT, transmisi/pasokan listrik PLN, perdagangan karbon sektor energi).
- E: Penyediaan Air; Pengelolaan Air Limbah, Penanganan Limbah, dan Remediasi (PDAM Tirta Taka, SPAM, persampahan).
- F: Konstruksi (pembangunan fisik Puspem KTT, jalan poros, jembatan, irigasi, pelabuhan, serta konstruksi gedung sekolah/RSUD).
- G: Perdagangan Besar dan Eceran (niaga sembako, BBM, material bangunan, pasar rakyat, ritel, e-commerce; CATATAN KBLI 2025: tidak lagi mencakup bengkel/reparasi kendaraan).
- H: Transportasi dan Penyimpanan (pelabuhan Sesayap/Tideng Pale, speedboat, feri, tongkang logistik, subsidi ongkos angkut, jasa ekspedisi/ojek daring).
- I: Aktivitas Penyediaan Akomodasi dan Makan Minum (hotel, penginapan, homestay, restoran, kafe, katering, platform OTA).
- J: Aktivitas Penerbitan, Penyiaran, serta Produksi dan Distribusi Konten (media daring/cetak, penyiaran TV/radio, konten digital).
- K: Aktivitas Telekomunikasi, Pemrograman Komputer, Konsultansi, Infrastruktur Komputasi, dan Jasa Informasi Lainnya (BTS blankspot, internet desa, sistem/perangkat lunak, cloud).
- L: Aktivitas Keuangan dan Asuransi (perbankan BPD Kaltimtara, KUR/kredit usaha, koperasi simpan pinjam, santunan asuransi kecelakaan/jiwa, fintech).
- M: Aktivitas Real Estat (pengembang perumahan, sewa lahan/ruko/gedung/gudang penyimpanan mandiri, kawasan industri).
- N: Aktivitas Profesional, Ilmiah, dan Teknis (konsultan perencana teknik/AMDAL, akuntan, hukum, survei/sertifikasi).
- O: Aktivitas Administratif dan Penunjang Usaha (penyewaan alat berat/armada, biro perjalanan, outsourcing tenaga kerja, kebersihan).
- P: Administrasi Pemerintahan dan Pertahanan, serta Jaminan Sosial Wajib (operasional umum Pemkab KTT, realisasi APBD/LRA umum, program bansos/cadangan pangan dinas daerah, TKD/DBH/DAK/DAU, pajak/retribusi daerah).
- Q: Pendidikan (Golongan Pokok 85 KBLI: HANYA untuk aktivitas pengajaran, sekolah formal/non-formal, PAUD, SD-SMA, perguruan tinggi/IAIN, pelatihan vokasi/BLK, dan beasiswa pendidikan). DILARANG memasukkan bantuan sosial kebakaran, bencana, atau sembako ke Kategori Q.
- R: Aktivitas Kesehatan Manusia dan Aktivitas Sosial (Golongan Pokok 86 Kesehatan, 87 Perawatan Residensial, dan 88 Aktivitas Sosial Tanpa Akomodasi: layanan RSUD Akhmad Berahim, puskesmas, klinik medis, penanggulangan ISPA, serta SELURUH BANTUAN SOSIAL korban bencana/kebakaran, santunan sosial, bantuan sembako dhuafa, dan perlindungan sosial masyarakat).
- S: Kesenian, Olahraga, dan Rekreasi (Festival Budaya Irau, daya tarik wisata, olahraga, pertunjukan hiburan).
- T: Aktivitas Jasa Lainnya (ormas keagamaan/lembaga adat, rumah ibadah, salon/laundry, serta bengkel/reparasi mobil & sepeda motor).
- U: Aktivitas Rumah Tangga Sebagai Pemberi Kerja dan Produksi Rumah Tangga untuk Keperluan Sendiri.
- V: Aktivitas Badan Internasional dan Badan Ekstra Internasional Lainnya.

ATURAN PEMBATASAN PRODUKSI & PENANGANAN BANTUAN SOSIAL (PEDOMAN PDRB BPS):
1. Bantuan Sosial Pemda & Biaya Antara:
   - Program Bantuan Sosial Pemkab/APBD: Penyaluran beras bansos, sembako, atau BLT oleh Dinsos/Pemkab KTT dipetakan ke Kategori P (Administrasi Pemerintahan) atau R (Aktivitas Sosial KBLI 88), dengan komponen pengeluaran primer PK_P (social transfers in kind APBD) dan komponen sekunder PK_RT (memperkuat konsumsi rumah tangga).
   - Bantuan bibit sawit, benih padi, atau pupuk dari Dinas Pertanian Pemkab KTT kepada petani/nelayan merupakan BIAYA ANTARA (intermediate input) produksi Kategori A, BUKAN konsumsi akhir rumah tangga; sisi pengeluaran adalah PK_P (hibah barang pemerintah).
   - Pengadaan alat berat, kapal nelayan, atau traktor berumur pakai > 1 tahun MASUK PMTB (barang modal fisik).
2. Unit Pemerintah Non-Administrasi: Proyek pembangunan fisik gedung sekolah, gedung RSUD, atau gedung koperasi desa MASUK F (Konstruksi) dan PMTB, BUKAN Q atau R. Operasional pengajaran = Q; operasional medis RSUD dan penanganan bansos darurat = R; tata kelola umum/gaji ASN/DBH = P.
3. Jasa Intermediasi Digital: Platform e-commerce ritel masuk G, kurir/ojol logistik masuk H, OTA reservasi hotel masuk I (bukan K).
4. Bahan Mentah vs Olahan: TBS kelapa sawit mentah/kayu bulat/ikan segar = A; pengolahan pabrik CPO/PKS/kayu lapis = C.
5. Bantuan Mesin / Modal Usaha UMKM: Lapangan usaha primer diarahkan ke sektor penerima manfaat (misal C Industri Pengolahan IKM kerajinan/makanan atau G Perdagangan), dengan komponen pengeluaran PK_P (karena dibiayai belanja hibah/bansos APBD pemda).
6. Pengadaan Listrik Desa / Lampu Jalan (PJU) / Pembangkit: Lapangan usaha primer adalah D (Penyediaan Listrik & Gas), dengan komponen pengeluaran PMTB (investasi fisik modal kabel/tiang/lampu) atau PK_P (biaya rekening operasional tagihan listrik pemda). DILARANG memasukkan ke Kategori P.

ATURAN 6 KOMPONEN PENGELUARAN & PROKSI SPESIFIK KTT:
- PK_RT: Belanja konsumsi akhir rumah tangga di KTT (sembako, listrik/air rumah tangga, sandang, bahan pokok, transportasi harian). DILARANG dipakai untuk ekspor komoditas mentah (batubara/CPO/TBS).
- PK_LNPRT: Operasional organisasi non-profit yang melayani rumah tangga di KTT. Mencakup: kegiatan swadaya Lembaga Adat Tidung/Dayak (upacara adat, bersih desa, musyawarah adat), peribadatan/kegiatan sosial ormas keagamaan (MUI, PHBI, DKM Masjid, PGI/Gereja), PMI, Baznas/LAZ non-APBD, serikat buruh sawit/tambang, paguyuban kedaerahan, ormas kepemudaan swadaya yang TIDAK dibiayai belanja langsung APBD.
- PK_P: Belanja operasional pemerintah daerah (gaji/TPP ASN, belanja barang/jasa kantor, belanja bansos/hibah tanggap darurat APBD, BOS/BOK daerah).
- PMTB: Pembentukan Modal Tetap Bruto / investasi fisik kapital (belanja modal APBD gedung/jalan/jembatan/pelabuhan, pengadaan mesin/genset PLN/alat berat, kendaraan bermotor baru BBNKB, pembangunan gedung koperasi/RSUD, investasi swasta LKPM).
- INVENTORY_CHANGE: Perubahan stok atau persediaan barang/komoditas di KTT (akumulasi penumpukan atau pengosongan stockpile batubara perusahaan tambang di pelabuhan Sesayap/Bebatu = S_akhir - S_awal, persediaan beras di gudang Bulog/Cadangan Beras Pemerintah Daerah KTT, atau penumpukan log kayu akasia di logpond).
- NET_EXPORT: Arus barang/jasa keluar KTT (pengapalan tongkang batubara, CPO/TBS sawit, kayu log/olahan keluar daerah, penjualan produk kerajinan ke luar pulau) dikurangi arus barang impor masuk KTT (bongkar muat kapal logistik/feri di pelabuhan Sesayap).
  -> ATURAN TANDA DAMPAK NET_EXPORT:
     * Kenaikan volume ekspor/pengapalan komoditas keluar KTT => INCREASE_REAL.
     * Penurunan ekspor komoditas keluar KTT => DECREASE_REAL.
     * Kenaikan harga patokan ekspor (misal harga TBS/CPO naik) => INCREASE_DEFLATOR.
     * Penurunan harga patokan ekspor => DECREASE_DEFLATOR.
     * Lonjakan arus impor barang masuk KTT tanpa diimbangi ekspor => DECREASE_REAL.

ATURAN DUA SUMBU DAMPAK (VOLUME RIIL/ADHK VS HARGA/ADHB):
- Sisi Lapangan Usaha:
  * INCREASE_NTB / DECREASE_NTB: Perubahan riil kapasitas, volume produksi fisik, pembukaan kebun/tambang baru, penyelesaian proyek konstruksi fisik, perluasan layanan medis/sosial, atau pemadaman listrik/bencana yang memangkas produksi.
  * INCREASE_PRICE / DECREASE_PRICE: Perubahan murni tingkat harga eceran barang kebutuhan, tarif sewa/jasa, atau harga komoditas produsen tanpa kenaikan volume produksi fisik.
- Sisi Pengeluaran:
  * INCREASE_REAL / DECREASE_REAL: Pergeseran riil kuantum konsumsi masyarakat (daya beli), realisasi belanja barang/modal pemda (APBD), atau kuantitas ekspor komoditas.
  * INCREASE_DEFLATOR / DECREASE_DEFLATOR: Perubahan indeks harga implisit belanja / inflasi indeks harga konsumen (IHK).

ATURAN SEKTOR SEKUNDER (INTER-INDUSTRY LINKAGE):
- secondary_kbli_category & secondary_kbli_impact: Diisi HANYA apabila peristiwa ekonomi memiliki dampak limpahan terukur ke sektor kedua (misal: pembangunan fisik pabrik kelapa sawit berdampak utama pada F Konstruksi dan dampak sekunder pada C Industri; bantuan sembako Pemkab berdampak primer pada P/R dan sekunder pada G/A; bencana banjir merusak panen padi A Pertanian utama dan memutus jalan H Transportasi sekunder). Jika murni hanya berdampak pada 1 sektor, wajib diisi null.
- secondary_expenditure_component & secondary_expenditure_impact: Diisi HANYA jika terdapat komponen pengeluaran kedua yang terimbas (misal investasi modal fisik PMTB utama dan potensi ekspor komoditas NET_EXPORT sekunder; bansos APBD PK_P utama dan daya beli PK_RT sekunder). Jika tidak ada, wajib diisi null.

ATURAN PENULISAN summary & quarter/year:
- summary: 3-5 kalimat bahasa Indonesia baku (50-110 kata) memuat peristiwa, pelaku & kecamatan/lokus, angka/nilai bila ada di teks, serta mekanisme dampaknya ke PDRB KTT.
- quarter & year: Gunakan tanggal rilis berita (WITA) kecuali teks menyebut eksplisit realisasi triwulan/tahun tertentu yang berbeda.

CONTOH KALIBRASI (FEW-SHOT):
1. "Harga TBS Sawit KTT Naik Rp 2.980/kg, Pengapalan dari Sesayap Hilir Melonjak" -> geographic_scope="KTT_LOCAL", is_economic_phenomenon=true, kbli_category="A", kbli_impact="INCREASE_PRICE", expenditure_component="NET_EXPORT", expenditure_impact="INCREASE_REAL".
2. "Banjir Luapan Sungai Sesayap Rendam 350 Hektare Kebun Sawit dan Padi di Betayau" -> geographic_scope="KTT_LOCAL", is_economic_phenomenon=true, kbli_category="A", kbli_impact="DECREASE_NTB", expenditure_component="NET_EXPORT", expenditure_impact="DECREASE_REAL", secondary_kbli_category="H", secondary_kbli_impact="DECREASE_NTB".
3. "Jalan Poros KM 12 Tideng Pale Ambles dan Berlumpur, Truk Logistik Mengular Berjam-jam" -> geographic_scope="KTT_LOCAL", is_economic_phenomenon=true, kbli_category="H", kbli_impact="INCREASE_PRICE", expenditure_component="PK_RT", expenditure_impact="INCREASE_DEFLATOR", secondary_kbli_category="G", secondary_kbli_impact="DECREASE_NTB".
4. "Tabung Gas Elpiji 3 Kg Langka di Pangkalan Tideng Pale, Warga Mengantre dari Pagi" -> geographic_scope="KTT_LOCAL", is_economic_phenomenon=true, kbli_category="G", kbli_impact="INCREASE_PRICE", expenditure_component="PK_RT", expenditure_impact="INCREASE_DEFLATOR".
5. "Bupati Tana Tidung Minta Kontraktor Kebut Pembangunan Fisik Gedung Puspem Sebelum Akhir Tahun" -> geographic_scope="KTT_LOCAL", is_economic_phenomenon=true, kbli_category="F", kbli_impact="INCREASE_NTB", expenditure_component="PMTB", expenditure_impact="INCREASE_REAL", secondary_kbli_category="P", secondary_kbli_impact="INCREASE_NTB".
6. "Pesta Budaya Irau Tana Tidung Sedot Ribuan Pengunjung, Hunian Penginapan dan Kuliner Tideng Pale Laris Manis" -> geographic_scope="KTT_LOCAL", is_economic_phenomenon=true, kbli_category="I", kbli_impact="INCREASE_NTB", expenditure_component="PK_RT", expenditure_impact="INCREASE_REAL", secondary_kbli_category="S", secondary_kbli_impact="INCREASE_NTB".
7. "Penumpukan Batubara di Stockpile Bebatu Tembus 50 Ribu Ton Imbas Pasang Surut Sungai Sesayap" -> geographic_scope="KTT_LOCAL", is_economic_phenomenon=true, kbli_category="B", kbli_impact="INCREASE_NTB", expenditure_component="INVENTORY_CHANGE", expenditure_impact="INCREASE_REAL".
8. "Polres Tana Tidung Tangkap Kurir Sabu 50 Gram di Pelabuhan Sebawang" -> geographic_scope="KTT_LOCAL", is_economic_phenomenon=false, rejection_reason="Kriminalitas murni perorangan tanpa dampak langsung pada neraca PDRB agregat.", seluruh kbli/expenditure=null.
9. "PLN Pastikan Tarif Listrik Nonsubsidi Februari 2026 Tetap Tidak Berubah" -> geographic_scope="NATIONAL_MACRO_IMPACT", is_economic_phenomenon=false, rejection_reason="Pengumuman tarif statis tanpa perubahan harga ataupun gangguan pasokan listrik.", seluruh kbli/expenditure=null.
10. "Pemkab Nunukan Salurkan Subsidi Ongkos Angkut Udara Krayan Rp 912 Juta" (tidak ada penyebutan KTT) -> geographic_scope="OTHER_REGION_IRRELEVANT", is_economic_phenomenon=false, rejection_reason="Peristiwa lokal daerah lain di luar Kab. Tana Tidung", seluruh kbli/expenditure=null.`;

export const SIPENA_SYSTEM_INSTRUCTION = SIPENA_SYSTEM_INSTRUCTION_FULL;

export const SIPENA_SYSTEM_INSTRUCTION_COMPACT = `Analis PDRB BPS Kab. Tana Tidung (KTT), Kalimantan Utara. Menangkap FENOMENA PDRB (The "Why" Behind the Numbers) untuk BRS & Tabel Fenomena.
Keluarkan HANYA 1 objek JSON valid tanpa teks tambahan, mengikuti urutan field ini:
{"geographic_scope","is_economic_phenomenon","rejection_reason","summary","kbli_category","kbli_impact","expenditure_component","expenditure_impact","secondary_kbli_category","secondary_kbli_impact","secondary_expenditure_component","secondary_expenditure_impact","quarter","year","confidence"}

1. GEOGRAPHIC_SCOPE:
- "KTT_LOCAL": kejadian di Kab. Tana Tidung (Tideng Pale, Sesayap, Betayau, Muruk Rian, Tana Lia, Bebatu, Sepala Dalung, Pemkab KTT).
- "KALTARA_PROVINCIAL": kebijakan/harga/infrastruktur resmi Pemprov/BI/Disbun Kaltara bertransmisi ke KTT.
- "NATIONAL_MACRO_IMPACT": kebijakan fiskal/moneter APBN/DBH/HBA/CPO/BBM pusat berimbas ke KTT.
- "OTHER_REGION_IRRELEVANT": kejadian lokal daerah lain (Nunukan/Krayan/Sebatik, Tarakan, Bulungan, Malinau, Riau/Jambi/Kalteng) tanpa KTT & bukan kebijakan makro nasional -> WAJIB is_economic_phenomenon=false & 4 field PDRB null.

2. IS_ECONOMIC_PHENOMENON (5 TIPOLOGI FENOMENA PDRB BPS):
- WAJIB TRUE jika memuat salah satu fenomena pendorong PDRB:
  (1) Disrupsi Alam/Iklim: banjir Sungai Sesayap, kemarau/air surut tongkang batubara kandas, gelombang tinggi nelayan -> KBLI A/B/E (DECREASE_NTB);
  (2) Logistik & Jalan: jalan poros Tideng Pale rusak/ambles/longsor, antrean truk sembako/TBS, penambahan feri KMP Manta Sebawang -> KBLI H/G (INCREASE_PRICE atau INCREASE/DECREASE_NTB, deflator PK_RT/NET_EXPORT);
  (3) Pasokan & Harga: gas elpiji 3 kg langka, antrean BBM SPBU Sebawang, pasar murah beras SPHP, harga TBS sawit Disbun, harga pupuk -> KBLI G/A/C (INCREASE_PRICE/DEFLATOR);
  (4) Fiskal & Proyek: pembangunan kompleks Puspem KTT, jalan poros, jembatan, DAK fisik, pencairan TPP/Gaji 13 ASN, bansos beras CPPD -> KBLI F/P/R (PMTB/PK_P/PK_RT);
  (5) Event & Musiman: Festival Adat Irau, ritual adat Tidung/Dayak, mudik Lebaran Sebawang, panen raya Betayau -> KBLI I/S/T/A (PK_RT/PK_LNPRT).
- WAJIB FALSE (noise): tarif/harga TETAP/stagnan (Delta=0), kriminalitas murni (sabu/judi/pencurian), kecelakaan lalu lintas perorangan tanpa penutupan jalan, duka cita perorangan, seremonial apel/senam/rapat rutin tanpa komitmen proyek, olahraga hiburan biasa -> set 4 field PDRB=null & isi rejection_reason.

3. KBLI 2025 (A-V):
A=Pertanian/Kehutanan/Perikanan(TBS mentah,banjir sawit,ikan,kayu,bibit/pupuk); B=Pertambangan(batubara,pasang surut tongkang,kuari); C=Industri(PKS CPO,chipmill,IKM olahan); D=Listrik/Gas/PJU; E=Air/PDAM/Limbah; F=Konstruksi(gedung Puspem,jalan poros,jembatan); G=Perdagangan(sembako,pasar murah,BBM,elpiji langka,tanpa bengkel); H=Transportasi/Gudang(jalan rusak,pelabuhan Sebawang,speedboat,KMP Manta); I=Hotel & Makan Minum; J=Penerbitan/Konten; K=Telekomunikasi/IT/BTS; L=Keuangan/KUR; M=Real Estat; N=Jasa Profesional/Teknis; O=Sewa Alat Berat/Travel; P=Adm Pemerintahan/APBD/TPP/DAK/Bansos Beras; Q=Pendidikan murni; R=Kesehatan RSUD & Bantuan Sosial; S=Kesenian/Wisata/Irau; T=Lembaga Adat Dayak-Tidung/Ormas/Bengkel Motor-Mobil; U=Jasa Rumah Tangga; V=Badan Internasional.

4. PENGELUARAN (6 KOMPONEN):
PK_RT=Konsumsi RT KTT (sembako,elpiji,tarif angkutan,daya beli warga); PK_LNPRT=Kegiatan Lembaga Adat/Masjid/Gereja/Ormas Swadaya/Irau; PK_P=Belanja pegawai/TPP/bansos natura pemda; PMTB=Belanja modal fisik gedung Puspem/jalan/jembatan/mesin/alat berat; INVENTORY_CHANGE=Perubahan stok(stockpile batubara/gudang beras); NET_EXPORT=Ekspor minus Impor KTT (ekspor naik=INCREASE_REAL; jalan putus/ekspor turun=DECREASE_REAL; harga sawit naik=INCREASE_DEFLATOR).

5. DAMPAK:
kbli_impact: INCREASE_NTB | DECREASE_NTB | INCREASE_PRICE | DECREASE_PRICE.
expenditure_impact: INCREASE_REAL | DECREASE_REAL | INCREASE_DEFLATOR | DECREASE_DEFLATOR.
summary: 3-5 kalimat bahasa Indonesia baku (50-110 kata). quarter (1-4) & year ikuti teks.`;

export interface ArticleClassificationInput {
  title: string;
  sourcePortal: string;
  sourceType: ArticleSourceTypeEnum;
  matchedKeyword?: string | null;
  defaultKbliHint?: string | null;
  defaultExpenditureHint?: string | null;
  publishedAtWita: string;
  defaultQuarter: 1 | 2 | 3 | 4;
  defaultYear: number;
  snippetText: string;
}

/**
 * Memampatkan cuplikan teks berita yang disimpan (300-450 kata) ke anggaran optimal pra-LLM
 * (default <= 360 kata / <= 2.400 karakter) dengan memprioritaskan kalimat berkepadatan data
 * kuantitatif (angka, nominal Rp, ton, %, komoditas) dan memotong rapi di batas kalimat.
 */
export function compressArticleTextForLlm(
  rawText: string,
  maxWords: number = COMPRESS_MAX_WORDS_FOR_LLM,
  maxChars: number = COMPRESS_MAX_CHARS_FOR_LLM,
): string {
  const cleaned = rawText.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';

  const words = cleaned.split(' ').filter(Boolean);
  if (words.length <= maxWords && cleaned.length <= maxChars) {
    return cleaned;
  }

  // Pisahkan kalimat berdasarkan tanda baca akhir kalimat (.!?) yang diikuti spasi
  // Menghindari pemecahan keliru pada angka desimal / pemisah ribuan seperti 18.500 atau 3.5
  const rawSentences = cleaned.split(/(?<=[.!?])\s+(?=[A-Z0-9"']|$)/g);
  const NUMERIC_ECONOMIC_RE =
    /\b(?:\d+|rp|rupiah|persen|%|miliar|juta|triliun|ton|kg|pdrb|inflasi|ihk|ntb|panen|ekspor|impor|anggaran|sawit|batubara)\b/i;

  const prioritizedSentences: string[] = [];
  const normalSentences: string[] = [];
  for (const s of rawSentences) {
    const trimmed = s.trim();
    if (!trimmed) continue;
    if (NUMERIC_ECONOMIC_RE.test(trimmed)) {
      prioritizedSentences.push(trimmed);
    } else {
      normalSentences.push(trimmed);
    }
  }

  // Gabungkan dengan mendahulukan kalimat berkepadatan data ekonomi
  const orderedSentences = [...prioritizedSentences, ...normalSentences];
  const keptSentences: string[] = [];
  let runningWords = 0;
  let runningChars = 0;

  for (const s of orderedSentences) {
    const sWords = s.split(/\s+/).filter(Boolean).length;
    if (runningWords + sWords > maxWords || runningChars + s.length > maxChars) {
      if (keptSentences.length === 0) {
        keptSentences.push(s);
      }
      break;
    }
    keptSentences.push(s);
    runningWords += sWords;
    runningChars += s.length + 1;
  }

  if (keptSentences.length > 0) {
    return keptSentences.join(' ').trim();
  }

  const kept: string[] = [];
  let charCount = 0;
  for (const word of words) {
    if (kept.length >= maxWords) break;
    const nextLength = kept.length === 0 ? word.length : charCount + 1 + word.length;
    if (nextLength > maxChars) break;
    kept.push(word);
    charCount = nextLength;
  }

  return kept.join(' ').trim();
}

export function buildClassificationPrompt(params: ArticleClassificationInput): string {
  const hintParts: string[] = [];
  if (params.defaultKbliHint) {
    hintParts.push(`KBLI Default=${params.defaultKbliHint}`);
  }
  if (params.defaultExpenditureHint) {
    hintParts.push(`Pengeluaran Default=${params.defaultExpenditureHint}`);
  }

  const compressedSnippet = compressArticleTextForLlm(params.snippetText);

  return [
    `SUMBER: ${params.sourcePortal} (${params.sourceType})`,
    params.matchedKeyword
      ? `KEYWORD NASIONAL TERJARING: ${params.matchedKeyword} (Evaluasi lokus geografis tetap berdasar fakta isi teks; jangan mengasumsikan lokasi di KTT bila isi teks khusus daerah lain)`
      : null,
    hintParts.length > 0
      ? `PETUNJUK KATEGORI KEYWORD: ${hintParts.join(', ')} (Gunakan sebagai acuan awal apabila selaras dengan isi artikel)`
      : null,
    `TANGGAL RILIS (WITA): ${params.publishedAtWita} (Default Triwulan ${params.defaultQuarter} Tahun ${params.defaultYear})`,
    `JUDUL BERITA: ${params.title}`,
    `TEKS BERITA (RINGKASAN FAKTUAL):\n${compressedSnippet}`,
  ]
    .filter((line): line is string => Boolean(line))
    .join('\n');
}

/**
 * Kata kunci pemicu evaluasi tahap kedua (Rescue Judge):
 * Menangkap sinyal 5 tipologi fenomena PDRB BPS (bencana cuaca, logistik jalan/pelabuhan,
 * kelangkaan energi/sembako, proyek fisik/anggaran daerah, event musiman).
 */
export const PDRB_PHENOMENON_RESCUE_KEYWORDS_RE =
  /\b(?:banjir|luapan|terendam|kemarau|surut|kandas|cuaca buruk|gelombang|rusak parah|ambles|longsor|tertahan|jembatan|dermaga|pelabuhan|sebawang|kmp manta|speedboat|kapal feri|jalan poros|lpg|elpiji|antre(?:an)?|solar|pertalite|bbm|sembako|pasar murah|sphp|beras|cabai|pupuk|tbs|sawit|batubara|puspem|gedung kantor|proyek fisik|lelang tender|dak fisik|apbd|tpp|thr|gaji 13|bansos|cppd|irau|panen raya)\b/i;

export function shouldRunPhenomenonRescuePass(
  classification: LlmClassificationOutput,
  article: ArticleClassificationInput,
): boolean {
  if (classification.is_economic_phenomenon) return false;
  if (classification.geographic_scope === 'OTHER_REGION_IRRELEVANT') return false;

  const combinedText = `${article.title} ${article.snippetText}`;
  return PDRB_PHENOMENON_RESCUE_KEYWORDS_RE.test(combinedText);
}

export function buildRescueJudgePrompt(
  article: ArticleClassificationInput,
  firstPassResult: LlmClassificationOutput,
): string {
  const base = buildClassificationPrompt(article);
  return [
    '=== EVALUASI TAHAP KEDUA (RESCUE JUDGE FENOMENA PDRB BPS) ===',
    `Pada tahap pertama, artikel ini dinilai NON-EKONOMI dengan alasan: "${firstPassResult.rejection_reason}".`,
    `Namun, artikel ini berlokasi di ${firstPassResult.geographic_scope} dan mengandung kata kunci pendorong neraca PDRB KTT.`,
    '',
    'TUGAS ANDA:',
    'Sebagai Hakim Penyelamat Fenomena PDRB BPS KTT, tinjau kembali berdasarkan 5 TIPOLOGI FENOMENA PDRB BPS:',
    '1. Apakah peristiwa ini dapat digunakan oleh analis Nerwilis BPS untuk menjelaskan fluktuasi produksi pertanian/tambang (KBLI A/B), gangguan jalan/angkutan (KBLI H), tekanan harga/kelangkaan pangan/energi (KBLI G), realisasi belanja proyek/fiskal (KBLI F/P), atau event budaya (KBLI I/S/T)?',
    '2. Jika YA: set is_economic_phenomenon = true, petakan ke KBLI & Pengeluaran yang sesuai, dan berikan summary analitis.',
    '3. Jika TIDAK (murni kriminal individu, laka lantas tunggal perorangan, duka cita perorangan): pertahankan is_economic_phenomenon = false dan jelaskan rejection_reason.',
    '',
    base,
  ].join('\n');
}

function stripMarkdownJsonFence(raw: string): string {
  let cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .trim();

  const fenceMatch = /```(?:json)?\s*([\s\S]*?)\s*```/i.exec(cleaned);
  if (fenceMatch?.[1]) {
    cleaned = fenceMatch[1].trim();
  }

  const firstBrace = cleaned.indexOf('{');
  const lastBrace = cleaned.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

export function parseAndValidateLlmJson(rawText: string): LlmClassificationOutput {
  const cleaned = stripMarkdownJsonFence(rawText);
  const parsedJson = JSON.parse(cleaned) as unknown;
  const validated = LlmClassificationRawSchema.parse(parsedJson);

  return {
    ...validated,
    rejection_reason: validated.is_economic_phenomenon ? null : validated.rejection_reason,
  };
}

/**
 * Melengkapi dan memperkuat relasi keterkaitan sekunder (inter-industry linkage & expenditure linkage)
 * berdasarkan fakta teks berita dan konsistensi metodologi PDRB BPS.
 */
export function enrichClassificationLinkages(
  classification: LlmClassificationOutput,
  snippetText?: string | null,
): LlmClassificationOutput {
  if (!classification.is_economic_phenomenon) return classification;

  const text = `${classification.summary} ${snippetText ?? ''}`.toLowerCase();
  let secKbli = classification.secondary_kbli_category;
  let secKbliImpact = classification.secondary_kbli_impact;
  let secExp = classification.secondary_expenditure_component;
  let secExpImpact = classification.secondary_expenditure_impact;

  // 1. Kasus Bansos / BLT Pemkab: jika primer P dan belanja PK_P, kaitkan sekunder ke R dan PK_RT
  if (
    classification.kbli_category === 'P' &&
    classification.expenditure_component === 'PK_P' &&
    /bansos|bantuan sosial|sembako|blt|cadangan beras|dhuafa|kemiskinan|korban/i.test(text)
  ) {
    if (!secKbli) {
      secKbli = 'R' as typeof classification.kbli_category;
      secKbliImpact = classification.kbli_impact;
    }
    if (!secExp) {
      secExp = 'PK_RT' as typeof classification.expenditure_component;
      secExpImpact = 'INCREASE_REAL' as typeof classification.expenditure_impact;
    }
  }

  // 2. Kasus Proyek Fisik Konstruksi APBD Pemkab: F + PMTB dengan keterkaitan ke P
  if (
    classification.kbli_category === 'F' &&
    classification.expenditure_component === 'PMTB' &&
    /pemkab|apbd|dinas pu|pemerintah kabupaten|dinas perhubungan/i.test(text)
  ) {
    if (!secKbli) {
      secKbli = 'P' as typeof classification.kbli_category;
      secKbliImpact = classification.kbli_impact;
    }
  }

  // 3. Kasus Bantuan Bibit/Pupuk Pertanian dari Pemkab: A + PK_P dengan sekunder P
  if (
    classification.kbli_category === 'A' &&
    /bantuan bibit|bantuan pupuk|benih padi|bibit sawit|dinas pertanian/i.test(text) &&
    /pemkab|apbd|pemerintah kabupaten/i.test(text)
  ) {
    if (!secKbli) {
      secKbli = 'P' as typeof classification.kbli_category;
      secKbliImpact = classification.kbli_impact;
    }
  }

  // Hindari duplikasi sekunder persis sama dengan primer
  if (secKbli === classification.kbli_category) {
    secKbli = null;
    secKbliImpact = null;
  }
  if (secExp === classification.expenditure_component) {
    secExp = null;
    secExpImpact = null;
  }

  return {
    ...classification,
    secondary_kbli_category: secKbli,
    secondary_kbli_impact: secKbli ? secKbliImpact : null,
    secondary_expenditure_component: secExp,
    secondary_expenditure_impact: secExp ? secExpImpact : null,
  };
}

export function mapClassificationToPersistence(
  rawClassification: LlmClassificationOutput,
  llmModel: string,
  snippetText?: string | null,
) {
  const classification = enrichClassificationLinkages(rawClassification, snippetText);

  if (
    !classification.is_economic_phenomenon ||
    classification.geographic_scope === 'OTHER_REGION_IRRELEVANT'
  ) {
    return {
      geographicScope: classification.geographic_scope,
      isEconomicPhenomenon: false,
      summary: classification.summary,
      kbliCategory: null,
      kbliImpact: null,
      expenditureComponent: null,
      expenditureImpact: null,
      secondaryKbliCategory: null,
      secondaryKbliImpact: null,
      secondaryExpenditureComponent: null,
      secondaryExpenditureImpact: null,
      quarter: classification.quarter,
      year: classification.year,
      llmModel,
      llmStatus: LlmStatusEnum.SUCCESS,
      llmError:
        classification.rejection_reason ??
        (classification.geographic_scope === 'OTHER_REGION_IRRELEVANT'
          ? 'Berita cakupan wilayah lain tanpa relevansi langsung ke Kab. Tana Tidung.'
          : null),
      llmConfidence: classification.confidence,
      verificationStatus: VerificationStatusEnum.IGNORED,
    };
  }

  const isSecKbliDistinct =
    Boolean(classification.secondary_kbli_category) &&
    classification.secondary_kbli_category !== classification.kbli_category;
  const secondaryKbliCategory = isSecKbliDistinct ? classification.secondary_kbli_category : null;
  const secondaryKbliImpact = isSecKbliDistinct ? (classification.secondary_kbli_impact ?? null) : null;

  const isSecExpDistinct =
    Boolean(classification.secondary_expenditure_component) &&
    classification.secondary_expenditure_component !== classification.expenditure_component;
  const secondaryExpenditureComponent = isSecExpDistinct ? classification.secondary_expenditure_component : null;
  const secondaryExpenditureImpact = isSecExpDistinct ? (classification.secondary_expenditure_impact ?? null) : null;

  return {
    geographicScope: classification.geographic_scope,
    isEconomicPhenomenon: true,
    summary: classification.summary,
    kbliCategory: classification.kbli_category,
    kbliImpact: classification.kbli_impact,
    expenditureComponent: classification.expenditure_component,
    expenditureImpact: classification.expenditure_impact,
    secondaryKbliCategory,
    secondaryKbliImpact,
    secondaryExpenditureComponent,
    secondaryExpenditureImpact,
    quarter: classification.quarter,
    year: classification.year,
    llmModel,
    llmStatus: LlmStatusEnum.SUCCESS,
    llmError: null,
    llmConfidence: classification.confidence,
    verificationStatus: VerificationStatusEnum.PENDING,
  };
}

export interface BrsSynthesisArticleInput {
  id: string;
  title: string;
  summary: string | null;
  sourcePortal: string;
  publishedAt: Date | string;
  kbliCategory: KbliCategoryEnum | null;
  kbliImpact: KbliImpactEnum | null;
  expenditureComponent: ExpenditureComponentEnum | null;
  expenditureImpact: ExpenditureImpactEnum | null;
}

export function buildBrsSynthesisPrompts(params: {
  periodLabel: string;
  dimension: 'kbli' | 'expenditure';
  targetLabel: string;
  style: 'BRS_FORMAL' | 'EXECUTIVE_BRIEF' | 'BULLET_POINTS';
  articles: ReadonlyArray<BrsSynthesisArticleInput>;
}): { systemInstruction: string; userPrompt: string } {
  const styleGuideMap: Record<typeof params.style, string> = {
    BRS_FORMAL:
      'Gaya Berita Resmi Statistik (BRS) BPS RI formal: 2-3 subjudul (`## ...`), paragraf analitis lugas, memisahkan faktor pendorong riil/NTB dan tekanan harga/kendala lapangan.',
    EXECUTIVE_BRIEF:
      'Gaya Ringkasan Eksekutif Pimpinan BPS / Kepala Daerah: ringkas, padat, maksimal 3 bagian (`## Ringkasan Eksekutif`, `## Sinyal Lapangan Utama`, `## Implikasi Rekonsiliasi`).',
    BULLET_POINTS:
      'Gaya Butir-Butir Fenomena Terstruktur (`## Butir Fenomena` + daftar `- ...` diikuti `## Catatan Metodologis Nerwilis`) siap tempel ke tabel lampiran.',
  };

  const dossierLines = params.articles.map((art, i) => {
    const kbliImpact = art.kbliImpact ? KBLI_IMPACT_LABELS[art.kbliImpact] : '-';
    const expImpact = art.expenditureImpact
      ? EXPENDITURE_IMPACT_LABELS[art.expenditureImpact]
      : '-';
    return [
      `[${i + 1}] Judul: ${art.title}`,
      `Portal & Tgl: ${art.sourcePortal} (${formatDateId(art.publishedAt)})`,
      `Pemetaan PDRB: KBLI=${art.kbliCategory ?? '-'} (${kbliImpact}); Pengeluaran=${art.expenditureComponent ?? '-'} (${expImpact})`,
      `Ringkasan Terverifikasi: ${art.summary || art.title}`,
    ].join('\n');
  });

  const systemInstruction = `Anda adalah Statistisi Ahli Fungsi Neraca Wilayah dan Analisis Statistik (Nerwilis) BPS Kabupaten Tana Tidung.
Tugas: Menyusun draf sintesis narasi kualitatif PDRB berdasarkan kumpulan bukti fenomena media yang telah diverifikasi sesuai KBLI 2025 (A-V) dan Pedoman PDRB BPS.

ATURAN KETAT (ANTI-HALUSINASI):
1. Gunakan HANYA fakta dari sumber bernomor [1]..[${params.articles.length}] yang diberikan.
2. DILARANG KERAS mengarang angka persentase pertumbuhan ekonomi (y-on-y, q-to-q, c-to-c), share PDRB, atau nominal Rupiah yang tidak tertera eksplisit pada ringkasan sumber.
3. Setiap klaim fakta atau peristiwa WAJIB mencantumkan nomor sitasi di akhir kalimat dalam format kurung siku, misalnya [1] atau [1][3].
4. Output berupa Markdown bersih berbahasa Indonesia baku (tanpa frontmatter, tanpa HTML, tanpa blok kode pembungkus).`;

  const userPrompt = [
    `Periode Analisis: ${params.periodLabel}`,
    `Dimensi & Target: ${params.dimension === 'kbli' ? 'Lapangan Usaha' : 'Pengeluaran'} — ${params.targetLabel}`,
    `Format Gaya Penulisan: ${styleGuideMap[params.style]}`,
    '',
    'BAHAN SUMBER TERVERIFIKASI:',
    ...dossierLines,
  ].join('\n\n');

  return { systemInstruction, userPrompt };
}
