"use client";

import React, { useState } from "react";
import {
  Search,
  ExternalLink,
  Calendar,
  FileSpreadsheet,
  PlusCircle,
  TrendingUp,
  Shield,
  Layers,
} from "lucide-react";

export interface OdonPublicRow {
  no: number;
  inputDate: string;
  title: string;
  summary: string;
  kbliCategory: string;
  kbliName: string;
  impactType: string;
  sourceUrl: string;
  quarter: string;
}

const INITIAL_SHEET_ROWS: OdonPublicRow[] = [
  {
    no: 1,
    inputDate: "10/11/2026 07:15",
    title:
      "Pelabuhan Bebatu Pacu Pengapalan Batubara dan Hasil Kelapa Sawit, Ekspor Tana Tidung Melonjak 14.8% di Q4",
    summary:
      "Aktivitas transshipment di Terminal Khusus Bebatu mencatatkan lonjakan pengapalan batubara curah dan CPO kelapa sawit sebesar 14.8% (Q-o-Q). Ini menjadi katalisator langsung penopang nilai tambah bruto sektor primer.",
    kbliCategory: "B",
    kbliName: "Pertambangan Batubara",
    impactType: "Meningkatkan NTB",
    sourceUrl: "https://kaltara.prokal.co/tana-tidung/ekspor-batubara",
    quarter: "TW IV-2026",
  },
  {
    no: 2,
    inputDate: "07/11/2026 08:30",
    title:
      "Progres Pembangunan Pusat Pemerintahan Terpadu Tana Tidung Capai 82%, Target Rampung Akhir Tahun",
    summary:
      "Realisasi belanja modal konstruksi gedung dan jalan lingkar pemkab mengerek penyerapan anggaran fisik daerah dan mendongkrak output sektor konstruksi.",
    kbliCategory: "F",
    kbliName: "Konstruksi Gedung",
    impactType: "Meningkatkan Produksi",
    sourceUrl: "https://benuanta.co.id/kaltara/ktt/pusat-pemerintahan",
    quarter: "TW IV-2026",
  },
  {
    no: 3,
    inputDate: "06/11/2026 07:45",
    title:
      "Harga Tandan Buah Segar (TBS) Sawit di Petani Mandiri Sesayap Naik Jadi Rp 2.750 per Kilogram",
    summary:
      "Kenaikan harga pembelian pabrik kelapa sawit meningkatkan pendapatan dan daya beli petani perkebunan swadaya di Kecamatan Sesayap Hilir dan Betayau.",
    kbliCategory: "A",
    kbliName: "Perkebunan Sawit",
    impactType: "Meningkatkan Harga",
    sourceUrl: "https://kaltara.tribunnews.com/kaltara/tanah-tidung/harga-tbs",
    quarter: "TW IV-2026",
  },
  {
    no: 4,
    inputDate: "05/11/2026 08:10",
    title:
      "Dishub KTT Uji Coba Trayek Speedboat Reguler Rute Tideng Pale - Tarakan untuk Peningkatan Mobilitas Warga",
    summary:
      "Peningkatan konektivitas antarpulau dan sungai memperlancar mobilitas masyarakat dan memangkas ongkos logistik sayur mayur serta kebutuhan pokok antarwilayah.",
    kbliCategory: "H",
    kbliName: "Angkutan Perairan",
    impactType: "Meningkatkan Produksi",
    sourceUrl: "https://fokusborneo.com/kaltara/tarakan/trayek-speedboat",
    quarter: "TW IV-2026",
  },
  {
    no: 5,
    inputDate: "04/11/2026 07:20",
    title:
      "Dinas Pertanian Salurkan 15 Ton Bibit Padi Sawah Irigasi di Desa Limbu Sedulun",
    summary:
      "Penyaluran bantuan saprodi benih unggul bagi kelompok tani guna mendongkrak luas tanam dan potensi hasil panen musim rendeng 2026.",
    kbliCategory: "A",
    kbliName: "Pertanian Tanaman Pangan",
    impactType: "Meningkatkan NTB",
    sourceUrl: "https://kaltara.prokal.co/tana-tidung/bibit-padi",
    quarter: "TW IV-2026",
  },
  {
    no: 6,
    inputDate: "29/10/2026 08:00",
    title:
      "PLN ULP Tideng Pale Tambah Jaringan Listrik Pedesaan ke Wilayah Pesisir Tana Lia",
    summary:
      "Perluasan elektrifikasi pedesaan mendukung aktivitas sentra UMKM perikanan dan pengolahan hasil tambak lokal di pesisir Tana Lia.",
    kbliCategory: "D",
    kbliName: "Kelistrikan & Energi",
    impactType: "Meningkatkan Produksi",
    sourceUrl: "https://kaltara.antaranews.com/kaltara/listrik-tanlia",
    quarter: "TW IV-2026",
  },
];

interface PublicNewsTabulationProps {
  onOpenSubmitModal: () => void;
  onLoginClick?: () => void;
}

export function PublicNewsTabulation({
  onOpenSubmitModal,
  onLoginClick,
}: PublicNewsTabulationProps) {
  const [search, setSearch] = useState("");
  const [rows] = useState<OdonPublicRow[]>(INITIAL_SHEET_ROWS);

  const filteredRows = rows.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.title.toLowerCase().includes(q) ||
      r.summary.toLowerCase().includes(q) ||
      r.kbliName.toLowerCase().includes(q) ||
      r.impactType.toLowerCase().includes(q) ||
      r.quarter.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-5">
      
      {/* Top Banner (Full Width NextAdmin Style) */}
      <div className="bg-white rounded-xl p-5 sm:p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.06)] border border-[#E2E8F0] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md bg-[#3C50E0]/10 text-[#3C50E0] text-[11px] font-mono font-bold tracking-wider">
              SIPENA-KTT ODON 6504
            </span>
            <span className="text-xs text-[#64748B] font-medium">
              BPS Kabupaten Tana Tidung
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-[#1C2434] tracking-tight">
            Tabulasi Berita Harian Fenomena Ekonomi (ODON)
          </h2>
          <p className="text-xs text-[#64748B] max-w-2xl leading-relaxed">
            Arsip resmi pencatatan fenomena ekonomi harian (One Day One News) yang dihimpun secara objektif dari media massa untuk pemantauan dinamika ekonomi daerah.
          </p>
        </div>

        <button
          onClick={onOpenSubmitModal}
          className="px-4 py-2 rounded-lg bg-[#3C50E0] hover:bg-[#3C50E0]/90 text-white text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span>Usulkan Berita Daerah</span>
        </button>
      </div>

      {/* Instant Search Bar */}
      <div className="bg-white rounded-xl p-3.5 shadow-[0_1px_3px_0_rgba(0,0,0,0.06)] border border-[#E2E8F0] flex items-center gap-3">
        <Search className="w-4 h-4 text-[#64748B]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari berita berdasarkan judul, ringkasan fenomena, sektor (batubara, sawit, konstruksi), atau dampak..."
          className="w-full text-xs text-[#1C2434] placeholder-[#94A3B8] bg-transparent focus:outline-hidden"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-xs text-[#64748B] hover:text-[#1C2434] font-medium"
          >
            Reset
          </button>
        )}
      </div>

      {/* Public ODON Table (Mirrors Official Sheet 6503 Format) */}
      <div className="bg-white rounded-xl shadow-[0_1px_3px_0_rgba(0,0,0,0.06)] border border-[#E2E8F0] overflow-hidden">
        
        {/* Table Subheader */}
        <div className="px-5 py-3.5 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-[#3C50E0]" />
            <span className="text-xs font-bold text-[#1C2434] uppercase tracking-wider">
              Data Fenomena Ekonomi Terverifikasi ({filteredRows.length} Baris)
            </span>
          </div>
          <span className="text-[11px] text-[#64748B] font-mono">
            Format Resmi Sheet 6503
          </span>
        </div>

        {/* Dense Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F1F5F9] text-[#475569] font-bold border-b border-[#E2E8F0]">
                <th className="py-3 px-3 text-center w-12 font-mono">No</th>
                <th className="py-3 px-3 w-32 font-mono">Waktu Input</th>
                <th className="py-3 px-4 min-w-[240px]">Judul Berita</th>
                <th className="py-3 px-4 min-w-[320px]">Ringkasan Fenomena Ekonomi</th>
                <th className="py-3 px-3 min-w-[150px]">Kategori (KBLI)</th>
                <th className="py-3 px-3 min-w-[130px]">Dampak</th>
                <th className="py-3 px-3 text-center w-28">Tautan Asli</th>
                <th className="py-3 px-3 text-center w-24 font-mono">Periode</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#64748B]">
                    Tidak ada data fenomena yang cocok dengan kata kunci pencarian.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr
                    key={row.no}
                    className="hover:bg-[#F8FAFC] transition-colors"
                  >
                    {/* No */}
                    <td className="py-3.5 px-3 text-center font-mono text-[#64748B]">
                      {row.no}
                    </td>

                    {/* Waktu Input */}
                    <td className="py-3.5 px-3 font-mono text-[#475569] whitespace-nowrap text-[11px]">
                      {row.inputDate}
                    </td>

                    {/* Judul Berita */}
                    <td className="py-3.5 px-4 font-semibold text-[#1C2434] leading-snug">
                      {row.title}
                    </td>

                    {/* Ringkasan Fenomena Ekonomi */}
                    <td className="py-3.5 px-4 text-[#475569] leading-relaxed">
                      {row.summary}
                    </td>

                    {/* Lapangan Usaha (KBLI) */}
                    <td className="py-3.5 px-3">
                      <span className="font-semibold text-[#1C2434] block">
                        {row.kbliCategory}
                      </span>
                      <span className="text-[11px] text-[#64748B] truncate block">
                        {row.kbliName}
                      </span>
                    </td>

                    {/* Dampak (Badge Hijau Resmi) */}
                    <td className="py-3.5 px-3 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#219653]/10 text-[#219653] border border-[#219653]/20">
                        <TrendingUp className="w-3 h-3 shrink-0" />
                        <span>{row.impactType}</span>
                      </span>
                    </td>

                    {/* Tautan Asli (Tanpa Kolom Media Sumber Terpisah) */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      <a
                        href={row.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold text-[#3C50E0] bg-[#3C50E0]/10 hover:bg-[#3C50E0]/20 transition-all cursor-pointer"
                        title="Buka artikel berita asli di tab baru"
                      >
                        <span>Buka Sumber</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>

                    {/* Periode */}
                    <td className="py-3.5 px-3 text-center font-mono font-bold text-[#1C2434] whitespace-nowrap text-[11px]">
                      {row.quarter}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Summary */}
        <div className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] flex flex-wrap items-center justify-between gap-3 text-xs text-[#64748B]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#219653]" />
            <span>Data bersumber langsung dari buku kerja resmi Nerwilis BPS 65.04</span>
          </div>
          <span className="font-mono text-[11px]">Kabupaten Tana Tidung • Kaltara</span>
        </div>

      </div>

    </div>
  );
}
