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
    <div className="space-y-6">
      {/* Intro banner */}
      <div className="ui-card p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="space-y-2 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="ui-badge ui-badge-info num">SIPENA-KTT ODON 6504</span>
            <span className="text-xs text-slate-500 font-medium">BPS Kabupaten Tana Tidung</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Tabulasi Berita Harian Fenomena Ekonomi (ODON)
          </h2>
          <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
            Arsip resmi pencatatan fenomena ekonomi harian (One Day One News) yang dihimpun secara objektif dari media massa untuk pemantauan dinamika ekonomi daerah.
          </p>
        </div>

        <button type="button" onClick={onOpenSubmitModal} className="ui-btn ui-btn-primary min-h-11 px-5 shrink-0">
          <PlusCircle className="w-4 h-4" aria-hidden="true" />
          <span>Usulkan Berita Daerah</span>
        </button>
      </div>

      {/* Command-palette search */}
      <div className="relative">
        <Search
          className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        />
        <label htmlFor="public-news-search" className="visually-hidden">
          Cari berita
        </label>
        <input
          id="public-news-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari berita berdasarkan judul, ringkasan fenomena, sektor (batubara, sawit, konstruksi), atau dampak..."
          className="ui-input pr-20"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-100"
          >
            Reset
          </button>
        )}
      </div>

      {/* Public ODON table (mirrors official Sheet 6503) */}
      <div className="ui-card overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200/80 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-4 h-4 text-blue-600" aria-hidden="true" />
            <span className="text-xs font-semibold text-slate-800">
              Data Fenomena Ekonomi Terverifikasi (<span className="num">{filteredRows.length}</span> Baris)
            </span>
          </div>
          <span className="text-[11px] text-slate-500 num">Format Resmi Sheet 6503</span>
        </div>

        <div className="overflow-x-auto">
          <table className="ui-table min-w-[960px]">
            <colgroup>
              <col style={{ width: "4%" }} />
              <col style={{ width: "10%" }} />
              <col style={{ width: "20%" }} />
              <col style={{ width: "25%" }} />
              <col style={{ width: "12%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "11%" }} />
              <col style={{ width: "7%" }} />
            </colgroup>
            <thead>
              <tr>
                <th scope="col" className="text-center">No</th>
                <th scope="col">Waktu Input</th>
                <th scope="col">Judul Berita</th>
                <th scope="col">Ringkasan Fenomena Ekonomi</th>
                <th scope="col">Kategori (KBLI)</th>
                <th scope="col">Dampak</th>
                <th scope="col" className="text-center">Tautan Asli</th>
                <th scope="col" className="text-center">Periode</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="!py-14 text-center text-slate-500">
                    Tidak ada data fenomena yang cocok dengan kata kunci pencarian.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => (
                  <tr key={row.no}>
                    <td className="text-center num text-slate-500">{row.no}</td>

                    <td className="num text-slate-600 text-xs leading-relaxed">{row.inputDate}</td>

                    <td className="font-semibold text-slate-900 leading-snug">{row.title}</td>

                    <td className="text-slate-600 leading-relaxed font-normal">{row.summary}</td>

                    <td>
                      <div className="flex items-start gap-2.5">
                        <span className="ui-kbli" aria-hidden="true">{row.kbliCategory}</span>
                        <div className="min-w-0">
                          <span className="sr-only">KBLI {row.kbliCategory}: </span>
                          <span className="text-xs text-slate-700 font-medium leading-snug block">
                            {row.kbliName}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="ui-badge ui-badge-success whitespace-normal">
                        <TrendingUp className="w-3 h-3 shrink-0" aria-hidden="true" />
                        <span>{row.impactType}</span>
                      </span>
                    </td>

                    <td className="text-center">
                      <a
                        href={row.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ui-btn ui-btn-secondary !min-h-8 !px-2.5 !text-[11px]"
                        title="Buka artikel berita asli di tab baru"
                      >
                        <span>Buka Sumber</span>
                        <ExternalLink className="w-3 h-3" aria-hidden="true" />
                      </a>
                    </td>

                    <td className="text-center num font-semibold text-slate-800 text-[11px]">
                      {row.quarter}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-3.5 border-t border-slate-200/80 bg-slate-50/70 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
            <span>Data bersumber langsung dari buku kerja resmi Nerwilis BPS 65.04</span>
          </div>
          <span className="num text-[11px]">Kabupaten Tana Tidung • Kaltara</span>
        </div>
      </div>
    </div>
  );
}
