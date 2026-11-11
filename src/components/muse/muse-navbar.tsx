"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Download,
  Shield,
  Eye,
  FileSpreadsheet,
  Layers,
} from "lucide-react";
import type { MuseViewTab } from "./muse-sidebar";

interface MuseNavbarProps {
  currentTab: MuseViewTab;
  onTabChange?: (tab: MuseViewTab) => void;
  userRole: "admin" | "public";
  onRoleChange: (role: "admin" | "public") => void;
  onExportExcel: () => void;
  onOpenSubmitModal?: () => void;
}

const ADMIN_TAB_TITLES: Record<
  MuseViewTab,
  { breadcrumb: string; title: string }
> = {
  overview: {
    breadcrumb: "Dashboard",
    title: "Ruang Kerja Operasional Harian ODON BPS 6504",
  },
  curation: {
    breadcrumb: "Meja Kurasi AI",
    title: "Kurasi & Verifikasi Berita H-1 (05:00 WITA)",
  },
  proposals: {
    breadcrumb: "Moderasi Usulan",
    title: "Moderasi Berita Kiriman Masyarakat & OPD",
  },
  ledger: {
    breadcrumb: "Buku Kerja Sheet 6503",
    title: "Buku Kerja Master ODON 2026 (Format Resmi BPS 6504)",
  },
  pdrb: {
    breadcrumb: "Bobot PDRB (Internal)",
    title: "Peta Bobot & Distribusi PDRB Tana Tidung 2025",
  },
  narratives: {
    breadcrumb: "Draf Narasi BRS",
    title: "Kompilasi Draf Narasi Analisis Triwulanan PDRB",
  },
  kbli: {
    breadcrumb: "Kamus KBLI 2025",
    title: "Mesin Pencari Crosswalk KBLI 2020 ↔ KBLI 2025",
  },
  scrapers: {
    breadcrumb: "Radar Crawler",
    title: "Status Bot Scraper 5 Portal Berita Daerah Kaltara",
  },
  methodology: {
    breadcrumb: "SOP Nerwilis",
    title: "Pedoman Teknis Standar Operasional Prosedur BPS",
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
}: MuseNavbarProps) {
  const [timeString, setTimeString] = useState("08:00:00 WITA");

  const isAdmin = userRole === "admin";

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

  // ========================================================
  // 1. PUBLIC NAVBAR (Full Width Minimalist Header)
  // ========================================================
  if (!isAdmin) {
    return (
      <header className="bg-white rounded-xl shadow-[0_1px_3px_0_rgba(0,0,0,0.06)] border border-[#E2E8F0] px-5 py-3.5 flex items-center justify-between gap-4 sticky top-4 z-20">
        
        {/* Brand Satker BPS 6504 */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#3C50E0] flex items-center justify-center text-white font-bold text-xs shadow-sm">
            <span>65</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-[#1C2434] tracking-tight">
                SIPENA-KTT
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-[#3C50E0]/10 text-[#3C50E0] border border-[#3C50E0]/20">
                SIPENA-KTT ODON 6504
              </span>
            </div>
            <p className="text-[11px] text-[#64748B] font-medium">
              Badan Pusat Statistik Kabupaten Tana Tidung
            </p>
          </div>
        </div>

        {/* Right Action: Clock & Login Admin Button */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] text-xs text-[#64748B] font-mono">
            <Clock className="w-3.5 h-3.5 text-[#3C50E0]" />
            <span>{timeString}</span>
          </div>

          <button
            onClick={() => onRoleChange("admin")}
            className="px-3.5 py-1.5 rounded-lg bg-[#3C50E0] hover:bg-[#3C50E0]/90 text-white text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
            title="Masuk sebagai Petugas BPS Nerwilis"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Masuk Petugas BPS</span>
          </button>
        </div>

      </header>
    );
  }

  // ========================================================
  // 2. ADMIN NAVBAR (NextAdmin Topbar Layout)
  // ========================================================
  const meta = ADMIN_TAB_TITLES[currentTab] || ADMIN_TAB_TITLES.overview;

  return (
    <header className="bg-white rounded-xl shadow-[0_1px_3px_0_rgba(0,0,0,0.06)] border border-[#E2E8F0] px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-4 z-20">
      
      {/* Context & Breadcrumbs */}
      <div>
        <div className="flex items-center gap-2 text-xs text-[#8A99AD]">
          <span className="font-semibold text-[#1C2434]">BPS 65.04</span>
          <span>/</span>
          <span className="text-[#64748B]">Nerwilis</span>
          <span>/</span>
          <span className="text-[#3C50E0] font-semibold">{meta.breadcrumb}</span>
        </div>
        <h2 className="text-sm font-bold text-[#1C2434] mt-0.5">{meta.title}</h2>
      </div>

      {/* Right Controls: Status Pill, Clock, Role Toggle & Export */}
      <div className="flex items-center gap-2.5">
        
        {/* App Status Badge */}
        <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#219653]/10 text-[#219653] border border-[#219653]/20 text-xs font-semibold font-mono">
          <span className="w-1.5 h-1.5 rounded-full bg-[#219653]" />
          <span>SIPENA-KTT ADMIN</span>
        </div>

        {/* WITA Realtime Clock */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#F1F5F9] border border-[#E2E8F0] text-xs text-[#64748B] font-mono">
          <Clock className="w-3.5 h-3.5 text-[#3C50E0]" />
          <span>{timeString}</span>
        </div>

        {/* Toggle to Public Preview */}
        <button
          onClick={() => onRoleChange("public")}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#1C2434] border border-[#E2E8F0] transition-all cursor-pointer"
          title="Pratinjau tampilan publik"
        >
          <Eye className="w-3.5 h-3.5 text-[#3C50E0]" />
          <span className="hidden sm:inline">Pratinjau Publik</span>
        </button>

        {/* Export Excel Button (Sheet 6503) */}
        <button
          onClick={onExportExcel}
          className="px-3.5 py-1.5 rounded-lg bg-[#219653] text-white hover:bg-[#219653]/90 text-xs font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          title="Unduh Buku Kerja ODON format Sheet 6503 (.xlsx)"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Ekspor Sheet 6503</span>
          <span className="sm:hidden">.xlsx</span>
        </button>

      </div>

    </header>
  );
}
