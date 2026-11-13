# kbli/scripts/generate_kbli_concordance_master.py
import json
import re

# Definisikan pemetaan resmi kategori KBLI 2025 <-> 2020 <-> 2015 <-> 2009
# Berdasarkan Peraturan BPS No. 7 Tahun 2025, Peraturan BPS No. 2 Tahun 2020,
# Perka BPS No. 95 Tahun 2015, dan Perka BPS No. 57 Tahun 2009.

KBLI_CATEGORY_CONCORDANCE_MASTER = [
    {
        "code_2025": "A",
        "title_2025": "Pertanian, Kehutanan, dan Perikanan",
        "code_2020": "A",
        "title_2020": "Pertanian, Kehutanan dan Perikanan",
        "code_2015": "A",
        "title_2015": "Pertanian, Kehutanan dan Perikanan",
        "code_2009": "A",
        "title_2009": "Pertanian, Kehutanan dan Perikanan",
        "pdrb_sector_mapping": "Sektor 1: Pertanian, Kehutanan, dan Perikanan",
        "change_notes": "Cakupan umum tetap. Pada KBLI 2025, istilah 'perkebunan' diganti menjadi 'pertanian' tanaman tahunan/semusim. Aktivitas agroforestry dan penyerapan/kredit karbon secara eksplisit diintegrasikan ke KBLI 2025."
    },
    {
        "code_2025": "B",
        "title_2025": "Pertambangan dan Penggalian",
        "code_2020": "B",
        "title_2020": "Pertambangan dan Penggalian",
        "code_2015": "B",
        "title_2015": "Pertambangan dan Penggalian",
        "code_2009": "B",
        "title_2009": "Pertambangan dan Penggalian",
        "pdrb_sector_mapping": "Sektor 2: Pertambangan dan Penggalian",
        "change_notes": "Cakupan umum tetap. Pada KBLI 2025, pemurnian/benefisiasi batu bara dipisahkan ke kode khusus 05102 untuk membedakan penambangan mentah vs peningkatan mutu."
    },
    {
        "code_2025": "C",
        "title_2025": "Industri",
        "code_2020": "C",
        "title_2020": "Industri Pengolahan",
        "code_2015": "C",
        "title_2015": "Industri Pengolahan",
        "code_2009": "C",
        "title_2009": "Industri Pengolahan",
        "pdrb_sector_mapping": "Sektor 3: Industri Pengolahan",
        "change_notes": "Penyederhanaan nomenklatur judul dari 'Industri Pengolahan' menjadi 'Industri'. Mencakup pengolahan TBS menjadi CPO, industri kayu lapis/serpih, dan manufaktur barang fisik."
    },
    {
        "code_2025": "D",
        "title_2025": "Penyediaan Listrik, Gas, Uap/Air Panas, dan Udara Dingin",
        "code_2020": "D",
        "title_2020": "Pengadaan Listrik, Gas, Uap/Air Panas Dan Udara Dingin",
        "code_2015": "D",
        "title_2015": "Pengadaan Listrik, Gas, Uap/Air Panas dan Udara Dingin",
        "code_2009": "D",
        "title_2009": "Pengadaan Listrik, Gas, Uap/Air Panas dan Udara Dingin",
        "pdrb_sector_mapping": "Sektor 4: Pengadaan Listrik dan Gas",
        "change_notes": "Penyesuaian redaksi kata 'Pengadaan' menjadi 'Penyediaan'. Memasukkan aktivitas pembangkitan energi terbarukan (EBT) dan perdagangan karbon sektor ketenagalistrikan."
    },
    {
        "code_2025": "E",
        "title_2025": "Penyediaan Air; Pengelolaan Air Limbah, Penanganan Limbah, dan Remediasi",
        "code_2020": "E",
        "title_2020": "Treatment Air, Treatment Air Limbah, Treatment dan Pemulihan Material Sampah, dan Aktivitas Remediasi",
        "code_2015": "E",
        "title_2015": "Pengadaan Air, Pengelolaan Sampah dan Daur Ulang, Pembuangan dan Pembersihan Limbah dan Sampah",
        "code_2009": "E",
        "title_2009": "Pengadaan Air, Pengelolaan Sampah dan Daur Ulang, Pembuangan dan Pembersihan Limbah dan Sampah",
        "pdrb_sector_mapping": "Sektor 5: Pengadaan Air, Pengelolaan Sampah, Limbah dan Daur Ulang",
        "change_notes": "Penyempurnaan judul menghindari istilah asing 'Treatment' pada 2020 kembali ke bahasa Indonesia baku 'Penyediaan Air; Pengelolaan Air Limbah' pada 2025."
    },
    {
        "code_2025": "F",
        "title_2025": "Konstruksi",
        "code_2020": "F",
        "title_2020": "Konstruksi",
        "code_2015": "F",
        "title_2015": "Konstruksi",
        "code_2009": "F",
        "title_2009": "Konstruksi",
        "pdrb_sector_mapping": "Sektor 6: Konstruksi",
        "change_notes": "Struktur stabil. Mencakup pembangunan gedung fisik pemerintah (Puspem KTT), infrastruktur jalan, jembatan, irigasi, dan pengerjaan sipil."
    },
    {
        "code_2025": "G",
        "title_2025": "Perdagangan Besar dan Eceran",
        "code_2020": "G",
        "title_2020": "Perdagangan Besar Dan Eceran; Reparasi Dan Perawatan Mobil Dan Sepeda Motor",
        "code_2015": "G",
        "title_2015": "Perdagangan Besar dan Eceran; Reparasi dan Perawatan Mobil dan Sepeda Motor",
        "code_2009": "G",
        "title_2009": "Perdagangan Besar dan Eceran; Reparasi dan Perawatan Mobil dan Sepeda Motor",
        "pdrb_sector_mapping": "Sektor 7: Perdagangan Besar dan Eceran (KBLI 2025 mengecualikan reparasi kendaraan)",
        "change_notes": "PERUBAHAN STRUKTURAL UTAMA: Pada KBLI 2025, reparasi dan perawatan mobil & sepeda motor DIKELUARKAN dari Kategori G dan dipindahkan ke Kategori T (Aktivitas Jasa Lainnya). Kategori G kini murni perniagaan barang fisik dagangan."
    },
    {
        "code_2025": "H",
        "title_2025": "Transportasi dan Penyimpanan",
        "code_2020": "H",
        "title_2020": "Pengangkutan dan Pergudangan",
        "code_2015": "H",
        "title_2015": "Transportasi dan Pergudangan",
        "code_2009": "H",
        "title_2009": "Transportasi dan Pergudangan",
        "pdrb_sector_mapping": "Sektor 8: Transportasi dan Pergudangan",
        "change_notes": "Penyesuaian redaksi judul menjadi 'Transportasi dan Penyimpanan'. Mencakup angkutan penyeberangan feri, speedboat sungai Sesayap, tongkang kargo, pergudangan, dan kurir logistik."
    },
    {
        "code_2025": "I",
        "title_2025": "Aktivitas Penyediaan Akomodasi dan Makan Minum",
        "code_2020": "I",
        "title_2020": "Penyediaan Akomodasi Dan Penyediaan Makan Minum",
        "code_2015": "I",
        "title_2015": "Penyediaan Akomodasi dan Penyediaan Makan Minum",
        "code_2009": "I",
        "title_2009": "Penyediaan Akomodasi dan Penyediaan Makan Minum",
        "pdrb_sector_mapping": "Sektor 9: Penyediaan Akomodasi dan Makan Minum",
        "change_notes": "Cakupan hotel, penginapan, restoran, rumah makan, warung kopi, dan jasa boga (catering)."
    },
    {
        "code_2025": "J",
        "title_2025": "Aktivitas Penerbitan, Penyiaran, serta Produksi dan Distribusi Konten",
        "code_2020": "J",
        "title_2020": "Informasi Dan Komunikasi (Bagian Konten & Media)",
        "code_2015": "J",
        "title_2015": "Informasi dan Komunikasi (Bagian Konten & Media)",
        "code_2009": "J",
        "title_2009": "Informasi dan Komunikasi (Bagian Konten & Media)",
        "pdrb_sector_mapping": "Sektor 10: Informasi dan Komunikasi (Sub-sektor Media & Penyiaran)",
        "change_notes": "PERUBAHAN STRUKTURAL UTAMA: Kategori J KBLI 2020 dipecah menjadi 2 kategori terpisah di KBLI 2025. Kategori J dikhususkan untuk penerbitan buku/media berita, penyiaran radio/TV, dan produksi film/konten kreatif."
    },
    {
        "code_2025": "K",
        "title_2025": "Aktivitas Telekomunikasi, Pemrograman Komputer, Konsultansi, Infrastruktur Komputasi, dan Jasa Informasi Lainnya",
        "code_2020": "J",
        "title_2020": "Informasi Dan Komunikasi (Bagian Telekomunikasi & IT)",
        "code_2015": "J",
        "title_2015": "Informasi dan Komunikasi (Bagian Telekomunikasi & IT)",
        "code_2009": "J",
        "title_2009": "Informasi dan Komunikasi (Bagian Telekomunikasi & IT)",
        "pdrb_sector_mapping": "Sektor 10: Informasi dan Komunikasi (Sub-sektor Telekomunikasi & Cloud/AI)",
        "change_notes": "KATEGORI BARU KBLI 2025: Kode 'K' sebelumnya adalah Jasa Keuangan pada KBLI 2009-2020. Di KBLI 2025, kode 'K' dialokasikan khusus untuk Telekomunikasi, Jaringan Internet, Cloud Computing, Pemrograman, Data Center, dan AI."
    },
    {
        "code_2025": "L",
        "title_2025": "Aktivitas Keuangan dan Asuransi",
        "code_2020": "K",
        "title_2020": "Aktivitas Keuangan dan Asuransi",
        "code_2015": "K",
        "title_2015": "Jasa Keuangan dan Asuransi",
        "code_2009": "K",
        "title_2009": "Jasa Keuangan dan Asuransi",
        "pdrb_sector_mapping": "Sektor 11: Jasa Keuangan dan Asuransi",
        "change_notes": "PERGESERAN KODE ALFABET: Akibat masuknya Kategori K baru untuk IT/Telekomunikasi, Jasa Keuangan bergeser dari Kategori K (2009-2020) menjadi Kategori L pada KBLI 2025."
    },
    {
        "code_2025": "M",
        "title_2025": "Aktivitas Real Estat",
        "code_2020": "L",
        "title_2020": "Real Estat",
        "code_2015": "L",
        "title_2015": "Real Estat",
        "code_2009": "L",
        "title_2009": "Real Estat",
        "pdrb_sector_mapping": "Sektor 12: Real Estat",
        "change_notes": "PERGESERAN KODE ALFABET: Bergeser dari Kategori L (2009-2020) menjadi Kategori M pada KBLI 2025."
    },
    {
        "code_2025": "N",
        "title_2025": "Aktivitas Profesional, Ilmiah, dan Teknis",
        "code_2020": "M",
        "title_2020": "Aktivitas Profesional, Ilmiah Dan Teknis",
        "code_2015": "M",
        "title_2015": "Jasa Profesional, Ilmiah dan Teknis",
        "code_2009": "M",
        "title_2009": "Jasa Profesional, Ilmiah dan Teknis",
        "pdrb_sector_mapping": "Sektor 13: Jasa Perusahaan (Bagian Profesional & Teknis)",
        "change_notes": "PERGESERAN KODE ALFABET: Bergeser dari Kategori M (2009-2020) menjadi Kategori N pada KBLI 2025."
    },
    {
        "code_2025": "O",
        "title_2025": "Aktivitas Administratif dan Penunjang Usaha",
        "code_2020": "N",
        "title_2020": "Aktivitas Penyewaan dan Sewa Guna Usaha Tanpa Hak Opsi, Ketenagakerjaan, Agen Perjalanan dan Penunjang Usaha Lainnya",
        "code_2015": "N",
        "title_2015": "Jasa Persewaan dan Sewa Guna Usaha Tanpa Hak Opsi, Ketenagakerjaan, Agen Perjalanan dan Penunjang Usaha Lainnya",
        "code_2009": "N",
        "title_2009": "Jasa Persewaan dan Sewa Guna Usaha Tanpa Hak Opsi, Ketenagakerjaan, Agen Perjalanan dan Penunjang Usaha Lainnya",
        "pdrb_sector_mapping": "Sektor 13: Jasa Perusahaan (Bagian Jasa Penunjang & Sewa Alat)",
        "change_notes": "PERGESERAN KODE ALFABET: Bergeser dari Kategori N (2009-2020) menjadi Kategori O pada KBLI 2025 dengan penyederhanaan judul."
    },
    {
        "code_2025": "P",
        "title_2025": "Administrasi Pemerintahan dan Pertahanan, serta Jaminan Sosial Wajib",
        "code_2020": "O",
        "title_2020": "Administrasi Pemerintahan, Pertahanan Dan Jaminan Sosial Wajib",
        "code_2015": "O",
        "title_2015": "Administrasi Pemerintahan, Pertahanan dan Jaminan Sosial Wajib",
        "code_2009": "O",
        "title_2009": "Administrasi Pemerintahan, Pertahanan dan Jaminan Sosial Wajib",
        "pdrb_sector_mapping": "Sektor 14: Administrasi Pemerintahan, Pertahanan dan Jaminan Sosial Wajib",
        "change_notes": "PERGESERAN KODE ALFABET: Bergeser dari Kategori O (2009-2020) menjadi Kategori P pada KBLI 2025. Mencakup belanja pegawai dan tata kelola Pemkab KTT."
    },
    {
        "code_2025": "Q",
        "title_2025": "Pendidikan",
        "code_2020": "P",
        "title_2020": "Pendidikan",
        "code_2015": "P",
        "title_2015": "Jasa Pendidikan",
        "code_2009": "P",
        "title_2009": "Jasa Pendidikan",
        "pdrb_sector_mapping": "Sektor 15: Jasa Pendidikan",
        "change_notes": "PERGESERAN KODE ALFABET: Bergeser dari Kategori P (2009-2020) menjadi Kategori Q pada KBLI 2025. Mencakup operasional sekolah, beasiswa, dan pengajaran."
    },
    {
        "code_2025": "R",
        "title_2025": "Aktivitas Kesehatan Manusia dan Aktivitas Sosial",
        "code_2020": "Q",
        "title_2020": "Aktivitas Kesehatan Manusia Dan Aktivitas Sosial",
        "code_2015": "Q",
        "title_2015": "Jasa Kesehatan dan Kegiatan Sosial",
        "code_2009": "Q",
        "title_2009": "Jasa Kesehatan dan Kegiatan Sosial",
        "pdrb_sector_mapping": "Sektor 16: Jasa Kesehatan dan Kegiatan Sosial",
        "change_notes": "PERGESERAN KODE ALFABET: Bergeser dari Kategori Q (2009-2020) menjadi Kategori R pada KBLI 2025. Mencakup layanan RSUD Akhmad Berahim dan puskesmas."
    },
    {
        "code_2025": "S",
        "title_2025": "Kesenian, Olahraga, dan Rekreasi",
        "code_2020": "R",
        "title_2020": "Kesenian, Hiburan Dan Rekreasi",
        "code_2015": "R",
        "title_2015": "Kesenian, Hiburan dan Rekreasi",
        "code_2009": "R",
        "title_2009": "Kesenian, Hiburan dan Rekreasi",
        "pdrb_sector_mapping": "Sektor 17: Jasa Lainnya (Sub-sektor Kesenian & Rekreasi)",
        "change_notes": "PERGESERAN KODE ALFABET: Bergeser dari Kategori R (2009-2020) menjadi Kategori S pada KBLI 2025. Mencakup Festival Irau dan daya tarik wisata."
    },
    {
        "code_2025": "T",
        "title_2025": "Aktivitas Jasa Lainnya",
        "code_2020": "S + G (Sebagian)",
        "title_2020": "Aktivitas Jasa Lainnya (plus Reparasi Kendaraan Bermotor dari Kategori G)",
        "code_2015": "S + G (Sebagian)",
        "title_2015": "Kegiatan Jasa Lainnya (plus Reparasi Kendaraan Bermotor dari Kategori G)",
        "code_2009": "S + G (Sebagian)",
        "title_2009": "Kegiatan Jasa Lainnya (plus Reparasi Kendaraan Bermotor dari Kategori G)",
        "pdrb_sector_mapping": "Sektor 17: Jasa Lainnya",
        "change_notes": "PERUBAHAN STRUKTURAL GABUNGAN: Kategori T pada KBLI 2025 adalah wadah baru bagi Aktivitas Jasa Lainnya (yang di KBLI 2009-2020 merupakan Kategori S) DITAMBAH penggabungan aktivitas reparasi/perawatan mobil dan motor yang dikeluarkan dari Kategori G."
    },
    {
        "code_2025": "U",
        "title_2025": "Aktivitas Rumah Tangga sebagai Pemberi Kerja dan Aktivitas Produksi Barang dan Jasa oleh Rumah Tangga untuk Keperluan Sendiri yang Tidak Terdiferensiasi",
        "code_2020": "T",
        "title_2020": "Aktivitas Rumah Tangga Sebagai Pemberi Kerja; Aktivitas Yang Menghasilkan Barang Dan Jasa Oleh Rumah Tangga yang Digunakan untuk Memenuhi Kebutuhan Sendiri",
        "code_2015": "T",
        "title_2015": "Jasa Perorangan yang Melayani Rumah Tangga; Kegiatan yang Menghasilkan Barang dan Jasa oleh Rumah Tangga yang Digunakan Sendiri untuk Memenuhi Kebutuhan",
        "code_2009": "T",
        "title_2009": "Jasa Perorangan yang Melayani Rumah Tangga; Kegiatan yang Menghasilkan Barang dan Jasa oleh Rumah Tangga yang Digunakan Sendiri untuk Memenuhi Kebutuhan",
        "pdrb_sector_mapping": "Sektor Non-PDRB / Rumah Tangga Domestik",
        "change_notes": "PERGESERAN KODE ALFABET: Bergeser dari Kategori T (2009-2020) menjadi Kategori U pada KBLI 2025."
    },
    {
        "code_2025": "V",
        "title_2025": "Aktivitas Badan Internasional dan Badan Ekstra Internasional Lainnya",
        "code_2020": "U",
        "title_2020": "Aktivitas Badan Internasional Dan Badan Ekstra Internasional Lainnya",
        "code_2015": "U",
        "title_2015": "Aktivitas Badan Internasional dan Badan Ekstra Internasional Lainnya",
        "code_2009": "U",
        "title_2009": "Badan Internasional dan Badan Ekstra Internasional Lainnya",
        "pdrb_sector_mapping": "Sektor Ekstrateritorial (Di luar PDRB Domestik Wilayah)",
        "change_notes": "KATEGORI BARU KBLI 2025: Merupakan pergeseran kode alfabet dari Kategori U (2009-2020) menjadi Kategori V pada KBLI 2025."
    }
]

def main():
    output_path = 'f:/18 - SIPENA KTT/kbli/concordance_categories_all_versions.json'
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(KBLI_CATEGORY_CONCORDANCE_MASTER, f, indent=2, ensure_ascii=False)
    print(f"Master concordance successfully written to {output_path} ({len(KBLI_CATEGORY_CONCORDANCE_MASTER)} categories)")

if __name__ == '__main__':
    main()

