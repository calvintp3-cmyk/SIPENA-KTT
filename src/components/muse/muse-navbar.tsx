"use client";

import React, { useState, useEffect } from "react";
import { Search, Clock, Download, Shield, Eye } from "lucide-react";
import type { MuseViewTab } from "./muse-sidebar";

interface MuseNavbarProps {
  currentTab: MuseViewTab;
  userRole: "admin" | "public";
  onRoleChange: (role: "admin" | "public") => void;
  onExportExcel: () => void;
  onSearchChange?: (val: string) => void;
}

const TAB_TITLES: Record<MuseViewTab, { breadcrumb: string; title: string }> = {
  overview: {
    breadcrumb: "One Day One News",
    title: "Monitoring Fenomena Ekonomi Harian (ODON)",
  },
  curation: {
    breadcrumb: "Meja Kurasi AI",
    title: "Kurasi & Verifikasi Berita H-1 (05:00 WITA)",
  },
  ledger: {
    breadcrumb: "Buku Kerja Sheet 6503",
    title: "Buku Kerja ODON 2026 (Format Resmi BPS 6504)",
  },
  pdrb: {
    breadcrumb: "Matriks Bobot PDRB",
    title: "Peta Bobot & Distribusi PDRB Tana Tidung 2025",
  },
  narratives: {
    breadcrumb: "Narasi Fenomena",
    title: "Kompilasi Narasi Fenomena Triwulanan PDRB",
  },
  kbli: {
    breadcrumb: "Konversi KBLI 2025",
    title: "Mesin Pencari Crosswalk KBLI 2020 ↔ KBLI 2025",
  },
  scrapers: {
    breadcrumb: "Radar Scraper",
    title: "Status Pipeline 4 Portal Berita Daerah Kaltara",
  },
  submit: {
    breadcrumb: "Kirim Usulan",
    title: "Partisipasi Usulan Berita Ekonomi Tana Tidung",
  },
};

export function MuseNavbar({
  currentTab,
  userRole,
  onRoleChange,
  onExportExcel,
  onSearchChange,
}: MuseNavbarProps) {
  const [timeString, setTimeString] = useState("08:00:00 WITA");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // WITA is UTC+8
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const wita = new Date(utc + 3600000 * 8);
      const hours = String(wita.getHours()).padStart(2, "0");
      const minutes = String(wita.getMinutes()).padStart(2, "0");
      const seconds = String(wita.getSeconds()).padStart(2, "0");
      setTimeString(`${hours}:${minutes}:${seconds} WITA`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const meta = TAB_TITLES[currentTab] || TAB_TITLES.overview;

  return (
    <header className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.04)] border border-[#f0f0f0] px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-4 z-20">
      
      {/* Context & Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2 text-xs text-[#8c8c8c]">
          <span>BPS Tana Tidung (65.04)</span>
          <span>/</span>
          <span className="text-[#595959]">Neraca Wilayah & Analisis Statistik</span>
          <span>/</span>
          <span className="text-blue-600 font-semibold">{meta.breadcrumb}</span>
        </div>
        <h2 className="text-sm font-bold text-[#141414] mt-0.5">{meta.title}</h2>
      </div>

      {/* Right Controls: Search, Clock, Role Toggle & Export */}
      <div className="flex items-center gap-3">
        
        {/* Search */}
        <div className="relative hidden sm:block w-64">
          <Search className="w-3.5 h-3.5 text-[#8c8c8c] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            onChange={(e) => onSearchChange?.(e.target.value)}
            placeholder="Cari KBLI, komoditas, atau berita..."
            className="w-full h-8 pl-8 pr-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-[#141414] placeholder:text-[#8c8c8c] focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
          />
        </div>

        {/* Live WITA Clock */}
        <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 text-[11px] font-mono text-[#141414] font-medium">
          <Clock className="w-3 h-3 text-blue-600" />
          <span className="tabular-nums">{timeString}</span>
        </div>

        {/* Role Toggle Switch */}
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs border border-slate-200/60">
          <button
            onClick={() => onRoleChange("admin")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              userRole === "admin"
                ? "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] text-[#141414] font-bold"
                : "text-[#8c8c8c] hover:text-[#141414] font-medium"
            }`}
          >
            <Shield className="w-3 h-3 text-blue-600" />
            <span>Admin</span>
          </button>
          <button
            onClick={() => onRoleChange("public")}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all cursor-pointer ${
              userRole === "public"
                ? "bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] text-[#141414] font-bold"
                : "text-[#8c8c8c] hover:text-[#141414] font-medium"
            }`}
          >
            <Eye className="w-3 h-3 text-slate-500" />
            <span>Publik</span>
          </button>
        </div>

        {/* Ekspor Sheet 6503 */}
        <button
          onClick={onExportExcel}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-[0_4px_14px_0_rgba(24,144,255,0.35)] transition-all cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ekspor Sheet 6503</span>
        </button>

      </div>
    </header>
  );
}

