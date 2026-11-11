"use client";

import React, { useState, useEffect } from "react";
import {
  Clock,
  Download,
  Shield,
  Eye,
  Menu,
  X,
  Sparkles,
  CheckSquare,
  Inbox,
  Table2,
  Layers,
  FileText,
  ArrowLeftRight,
  Radar,
  BookOpen,
  PlusCircle,
  Newspaper,
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

const TAB_TITLES: Record<
  MuseViewTab,
  { breadcrumb: string; title: string; publicTitle?: string; publicBreadcrumb?: string }
> = {
  overview: {
    breadcrumb: "Dashboard",
    title: "Ruang Kerja Operasional ODON H-1",
    publicBreadcrumb: "ODON Harian",
    publicTitle: "Tabulasi Berita Harian Fenomena Ekonomi",
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
    publicBreadcrumb: "Kamus KBLI",
    publicTitle: "Kamus Transisi KBLI 2020 ↔ KBLI 2025 (BPS RI)",
  },
  scrapers: {
    breadcrumb: "Radar Crawler",
    title: "Status Bot Scraper 5 Portal Berita Daerah Kaltara",
  },
  methodology: {
    breadcrumb: "SOP Nerwilis",
    title: "Pedoman Teknis Standar Operasional Prosedur BPS",
    publicBreadcrumb: "Tentang ODON",
    publicTitle: "Tentang Inisiatif ODON Satu Data Nerwilis BPS 6504",
  },
  submit: {
    breadcrumb: "Kirim Usulan",
    title: "Partisipasi Usulan Berita Ekonomi Tana Tidung",
  },
};

export function MuseNavbar({
  currentTab,
  onTabChange,
  userRole,
  onRoleChange,
  onExportExcel,
  onOpenSubmitModal,
}: MuseNavbarProps) {
  const [timeString, setTimeString] = useState("08:00:00 WITA");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const meta = TAB_TITLES[currentTab] || TAB_TITLES.overview;
  const pageTitle = !isAdmin && meta.publicTitle ? meta.publicTitle : meta.title;
  const breadcrumb = !isAdmin && meta.publicBreadcrumb ? meta.publicBreadcrumb : meta.breadcrumb;

  const handleMobileNav = (tab: MuseViewTab) => {
    if (onTabChange) onTabChange(tab);
    setIsMobileMenuOpen(false);
  };

  return (
    <>
      <header className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.04)] border border-[#f0f0f0] px-5 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-4 z-20">
        
        {/* Context & Breadcrumbs */}
        <div className="flex items-center gap-3">
          
          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden p-2 rounded-xl border border-slate-200 text-[#595959] hover:bg-slate-50 cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>

          <div>
            <div className="flex items-center gap-2 text-xs text-[#8c8c8c]">
              <span className="font-semibold text-slate-700">BPS Tana Tidung (65.04)</span>
              <span>/</span>
              <span className="text-[#595959]">{isAdmin ? "Nerwilis Internal" : "Layanan Informasi"}</span>
              <span>/</span>
              <span className="text-blue-600 font-semibold">{breadcrumb}</span>
            </div>
            <h2 className="text-sm font-bold text-[#141414] mt-0.5">{pageTitle}</h2>
          </div>
        </div>

        {/* Right Controls: Role Badge, Clock, Role Toggle & Export */}
        <div className="flex items-center gap-2.5">
          
          {/* Role Status Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs">
            <span className={`w-2 h-2 rounded-full ${isAdmin ? "bg-amber-500 animate-pulse" : "bg-emerald-500"}`} />
            <span className="font-semibold text-[#141414]">
              {isAdmin ? "Tim Nerwilis (Admin)" : "Akses Publik"}
            </span>
          </div>

          {/* WITA Realtime Clock */}
          <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#595959] font-mono">
            <Clock className="w-3.5 h-3.5 text-blue-600" />
            <span>{timeString}</span>
          </div>

          {/* Role Switcher Button */}
          <button
            onClick={() => onRoleChange(isAdmin ? "public" : "admin")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isAdmin
                ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-[0_4px_14px_0_rgba(24,144,255,0.35)]"
            }`}
            title={isAdmin ? "Beralih ke tampilan publik" : "Masuk sebagai admin"}
          >
            {isAdmin ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Pratinjau Publik</span>
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Masuk Petugas BPS</span>
              </>
            )}
          </button>

          {/* Export Excel Button (Khusus Admin) */}
          {isAdmin && (
            <button
              onClick={onExportExcel}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold transition-all shadow-[0_4px_14px_0_rgba(16,185,129,0.3)] flex items-center gap-1.5 cursor-pointer"
              title="Unduh Buku Kerja ODON format Sheet 6503 (.xlsx)"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ekspor Sheet 6503</span>
              <span className="sm:hidden">.xlsx</span>
            </button>
          )}

        </div>

      </header>

      {/* Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="lg:hidden bg-white rounded-2xl shadow-lg border border-[#f0f0f0] p-4 space-y-3 mt-2">
          <p className="text-xs font-bold text-[#8c8c8c] uppercase tracking-wider">Navigasi</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            
            {/* Public Mobile Items */}
            {!isAdmin ? (
              <>
                <button
                  onClick={() => handleMobileNav("overview")}
                  className={`p-2.5 rounded-xl text-left font-semibold flex items-center gap-2 ${
                    currentTab === "overview" ? "bg-blue-600 text-white" : "bg-slate-50 text-[#141414]"
                  }`}
                >
                  <Newspaper className="w-4 h-4" />
                  <span>Tabulasi Berita</span>
                </button>

                <button
                  onClick={() => handleMobileNav("kbli")}
                  className={`p-2.5 rounded-xl text-left font-semibold flex items-center gap-2 ${
                    currentTab === "kbli" ? "bg-blue-600 text-white" : "bg-slate-50 text-[#141414]"
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  <span>Kamus KBLI</span>
                </button>

                <button
                  onClick={() => handleMobileNav("methodology")}
                  className={`p-2.5 rounded-xl text-left font-semibold flex items-center gap-2 ${
                    currentTab === "methodology" ? "bg-blue-600 text-white" : "bg-slate-50 text-[#141414]"
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Tentang ODON</span>
                </button>

                {onOpenSubmitModal && (
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      onOpenSubmitModal();
                    }}
                    className="p-2.5 rounded-xl text-left font-semibold flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-100"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Usulkan Berita</span>
                  </button>
                )}
              </>
            ) : (
              /* Admin Mobile Items */
              <>
                <button
                  onClick={() => handleMobileNav("overview")}
                  className={`p-2.5 rounded-xl text-left font-semibold flex items-center gap-2 ${
                    currentTab === "overview" ? "bg-blue-600 text-white" : "bg-slate-50 text-[#141414]"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Dashboard</span>
                </button>

                <button
                  onClick={() => handleMobileNav("curation")}
                  className={`p-2.5 rounded-xl text-left font-semibold flex items-center gap-2 ${
                    currentTab === "curation" ? "bg-blue-600 text-white" : "bg-slate-50 text-[#141414]"
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                  <span>Meja Kurasi</span>
                </button>

                <button
                  onClick={() => handleMobileNav("proposals")}
                  className={`p-2.5 rounded-xl text-left font-semibold flex items-center gap-2 ${
                    currentTab === "proposals" ? "bg-blue-600 text-white" : "bg-slate-50 text-[#141414]"
                  }`}
                >
                  <Inbox className="w-4 h-4" />
                  <span>Usulan OPD</span>
                </button>

                <button
                  onClick={() => handleMobileNav("ledger")}
                  className={`p-2.5 rounded-xl text-left font-semibold flex items-center gap-2 ${
                    currentTab === "ledger" ? "bg-blue-600 text-white" : "bg-slate-50 text-[#141414]"
                  }`}
                >
                  <Table2 className="w-4 h-4" />
                  <span>Buku Kerja</span>
                </button>

                <button
                  onClick={() => handleMobileNav("pdrb")}
                  className={`p-2.5 rounded-xl text-left font-semibold flex items-center gap-2 ${
                    currentTab === "pdrb" ? "bg-blue-600 text-white" : "bg-slate-50 text-[#141414]"
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  <span>Bobot PDRB</span>
                </button>

                <button
                  onClick={() => handleMobileNav("scrapers")}
                  className={`p-2.5 rounded-xl text-left font-semibold flex items-center gap-2 ${
                    currentTab === "scrapers" ? "bg-blue-600 text-white" : "bg-slate-50 text-[#141414]"
                  }`}
                >
                  <Radar className="w-4 h-4" />
                  <span>Crawler Portal</span>
                </button>
              </>
            )}

          </div>
        </div>
      )}
    </>
  );
}
