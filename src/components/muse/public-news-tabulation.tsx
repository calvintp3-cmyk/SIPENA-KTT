"use client";

import React, { useState } from "react";
import {
  Search,
  ExternalLink,
  Calendar,
  Filter,
  Newspaper,
  CheckCircle2,
  Tag,
  PlusCircle,
  Share2,
  SlidersHorizontal,
} from "lucide-react";

export interface PublicNewsItem {
  id: string;
  publishDate: string;
  entryDate: string;
  source: string;
  sourceUrl: string;
  title: string;
  summary: string;
  sectorTag: string;
  quarter: string;
}

const INITIAL_PUBLIC_NEWS: PublicNewsItem[] = [
  {
    id: "pub-1",
    publishDate: "09 Nov 2026",
    entryDate: "10 Nov 2026",
    source: "Radar Tarakan",
    sourceUrl: "https://kaltara.prokal.co/tana-tidung",
    title:
      "Pelabuhan Bebatu Pacu Pengapalan Batubara dan Hasil Kelapa Sawit, Ekspor Tana Tidung Melonjak 14.8% di Q4",
    summary:
      "Aktivitas transshipment di Terminal Khusus Bebatu mencatatkan lonjakan pengapalan batubara curah dan CPO kelapa sawit sebesar 14.8%. Mengindikasikan ekspansi pengiriman komoditas primer keluar wilayah Tana Tidung.",
    sectorTag: "Pertambangan & Sawit",
    quarter: "Triwulan IV",
  },
  {
    id: "pub-2",
    publishDate: "06 Nov 2026",
    entryDate: "07 Nov 2026",
    source: "Benuanta",
    sourceUrl: "https://benuanta.co.id",
    title:
      "Progres Pembangunan Pusat Pemerintahan Terpadu Tana Tidung Capai 82%, Target Rampung Akhir Tahun",
    summary:
      "Pembangunan fisik gedung kantor dan jalan lingkar pemkab memasuki tahap akhir. Penyerapan belanja modal konstruksi pemerintah daerah berjalan sesuai target triwulanan.",
    sectorTag: "Konstruksi Fisik",
    quarter: "Triwulan IV",
  },
  {
    id: "pub-3",
    publishDate: "05 Nov 2026",
    entryDate: "06 Nov 2026",
    source: "Tribun Kaltara",
    sourceUrl: "https://kaltara.tribunnews.com",
    title:
      "Harga Tandan Buah Segar (TBS) Sawit di Petani Mandiri Sesayap Naik Jadi Rp 2.750 per Kilogram",
    summary:
      "Kenaikan harga beli tandan buah segar di tingkat pabrik kelapa sawit meningkatkan daya beli petani perkebunan swadaya di Kecamatan Sesayap Hilir dan Betayau.",
    sectorTag: "Perkebunan Sawit",
    quarter: "Triwulan IV",
  },
  {
    id: "pub-4",
    publishDate: "04 Nov 2026",
    entryDate: "05 Nov 2026",
    source: "Fokus Borneo",
    sourceUrl: "https://fokusborneo.com",
    title:
      "Dishub KTT Uji Coba Trayek Speedboat Reguler Rute Tideng Pale - Tarakan untuk Peningkatan Mobilitas Warga",
    summary:
      "Peningkatan konektivitas antarpulau dan sungai memperlancar mobilitas masyarakat dan memangkas ongkos logistik sayur mayur dan kebutuhan harian antarwilayah.",
    sectorTag: "Transportasi Sungai",
    quarter: "Triwulan IV",
  },
  {
    id: "pub-5",
    publishDate: "03 Nov 2026",
    entryDate: "04 Nov 2026",
    source: "Radar Tarakan",
    sourceUrl: "https://kaltara.prokal.co",
    title:
      "Dinas Pertanian Salurkan 15 Ton Bibit Padi Sawah Irigasi di Desa Limbu Sedulun",
    summary:
      "Penyaluran bantuan saprodi benih unggul bagi kelompok tani guna meningkatkan produktivitas panen padi sawah menyambut musim tanam rendeng.",
    sectorTag: "Pertanian Pangan",
    quarter: "Triwulan IV",
  },
  {
    id: "pub-6",
    publishDate: "28 Okt 2026",
    entryDate: "29 Okt 2026",
    source: "Antara Kaltara",
    sourceUrl: "https://kaltara.antaranews.com",
    title:
      "PLN ULP Tideng Pale Tambah Jaringan Listrik Pedesaan ke Wilayah Tana Lia",
    summary:
      "Perluasan elektrifikasi pedesaan mendukung aktivitas sentra UMKM perikanan dan pengolahan hasil tambak lokal di pesisir Tana Lia.",
    sectorTag: "Energi & Kelistrikan",
    quarter: "Triwulan IV",
  },
];

const SOURCES = [
  "Semua Media",
  "Radar Tarakan",
  "Benuanta",
  "Fokus Borneo",
  "Tribun Kaltara",
  "Antara Kaltara",
];

interface PublicNewsTabulationProps {
  onOpenSubmitModal: () => void;
}

export function PublicNewsTabulation({
  onOpenSubmitModal,
}: PublicNewsTabulationProps) {
  const [search, setSearch] = useState("");
  const [selectedSource, setSelectedSource] = useState("Semua Media");
  const [newsList] = useState<PublicNewsItem[]>(INITIAL_PUBLIC_NEWS);

  const filteredNews = newsList.filter((item) => {
    const matchesSource =
      selectedSource === "Semua Media" ? true : item.source === selectedSource;
    const matchesSearch =
      search === "" ||
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.summary.toLowerCase().includes(search.toLowerCase()) ||
      item.sectorTag.toLowerCase().includes(search.toLowerCase());
    return matchesSource && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.04)] border border-[#f0f0f0]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-mono font-bold">
                BPS Kabupaten Tana Tidung
              </span>
              <span className="text-xs text-[#8c8c8c]">Portal Informasi Terbuka</span>
            </div>
            <h3 className="text-base font-extrabold text-[#141414] tracking-tight">
              Tabulasi Berita Harian Fenomena Ekonomi (ODON)
            </h3>
            <p className="text-xs text-[#595959] max-w-2xl leading-relaxed">
              Kumpulan berita dan peristiwa ekonomi lokal Tana Tidung yang dihimpun secara objektif dari media massa terpercaya untuk memantau dinamika pembangunan daerah.
            </p>
          </div>

          <button
            onClick={onOpenSubmitModal}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-[0_4px_14px_0_rgba(24,144,255,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer shrink-0"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Usulkan Berita Daerah</span>
          </button>
        </div>

        {/* Source Media Pills Filter */}
        <div className="flex items-center gap-2 overflow-x-auto pt-5 border-t border-[#f0f0f0] mt-5 pb-1">
          <span className="text-xs text-[#8c8c8c] font-semibold flex items-center gap-1 shrink-0 mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Sumber:</span>
          </span>
          {SOURCES.map((src) => (
            <button
              key={src}
              onClick={() => setSelectedSource(src)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedSource === src
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-slate-50 text-[#595959] hover:bg-slate-100 hover:text-[#141414] border border-slate-200/60"
              }`}
            >
              {src}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] border border-[#f0f0f0] flex items-center gap-3">
        <Search className="w-4 h-4 text-[#8c8c8c]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari berita berdasarkan judul, komoditas (batubara, sawit, pupuk, perahu), atau topik ekonomi..."
          className="w-full text-xs text-[#141414] placeholder-[#8c8c8c] bg-transparent focus:outline-hidden"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-xs text-[#8c8c8c] hover:text-[#141414]"
          >
            Bersihkan
          </button>
        )}
      </div>

      {/* Tabulation Table View */}
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.04)] border border-[#f0f0f0] overflow-hidden">
        
        <div className="p-4 border-b border-[#f0f0f0] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-blue-600" />
            <h4 className="text-xs font-bold text-[#141414] uppercase tracking-wider">
              Daftar Berita Terkurasi ({filteredNews.length} Berita)
            </h4>
          </div>
          <span className="text-[11px] text-[#8c8c8c] font-medium">
            Diperbarui setiap hari kerja (H-1)
          </span>
        </div>

        {filteredNews.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Newspaper className="w-8 h-8 text-[#8c8c8c] mx-auto" />
            <p className="text-xs font-semibold text-[#141414]">Tidak ada berita yang sesuai pencarian</p>
            <p className="text-[11px] text-[#8c8c8c]">Coba ubah kata kunci atau pilih media sumber lainnya.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#f0f0f0]">
            {filteredNews.map((item) => (
              <article
                key={item.id}
                className="p-5 hover:bg-slate-50/70 transition-colors space-y-2.5"
              >
                {/* Meta Header */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 font-bold text-[11px] border border-blue-100">
                      {item.source}
                    </span>
                    <span className="text-[#8c8c8c]">•</span>
                    <span className="text-[#595959] flex items-center gap-1 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-[#8c8c8c]" />
                      <span>Terbit: {item.publishDate}</span>
                    </span>
                    <span className="text-[#8c8c8c]">•</span>
                    <span className="text-emerald-700 font-medium flex items-center gap-1 text-[11px]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tercatat ODON ({item.entryDate})</span>
                    </span>
                  </div>

                  <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-500" />
                    <span>{item.sectorTag}</span>
                  </span>
                </div>

                {/* News Title */}
                <h4 className="text-sm font-bold text-[#141414] leading-snug">
                  {item.title}
                </h4>

                {/* Economic Phenomenon Summary */}
                <p className="text-xs text-[#595959] leading-relaxed">
                  {item.summary}
                </p>

                {/* Action Link to Original Portal */}
                <div className="pt-1 flex items-center justify-between text-xs">
                  <span className="text-[11px] text-[#8c8c8c]">
                    Periode: <b className="text-slate-700">{item.quarter}</b>
                  </span>

                  <a
                    href={item.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-semibold inline-flex items-center gap-1 text-xs hover:underline"
                  >
                    <span>Baca Artikel Asli di {item.source}</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}

      </div>

    </div>
  );
}

