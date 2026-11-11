"use client";

import React from "react";
import {
  Sparkles,
  CheckSquare,
  Table2,
  Radar,
  ArrowLeftRight,
  PlusCircle,
  HelpCircle,
  ChevronRight,
  Code2,
  Layers,
  FileText,
  Inbox,
  BookOpen,
  Shield,
  Eye,
  LogOut,
  Newspaper,
} from "lucide-react";

export type MuseViewTab =
  | "overview"
  | "curation"
  | "proposals"
  | "ledger"
  | "pdrb"
  | "narratives"
  | "kbli"
  | "scrapers"
  | "methodology"
  | "submit";

interface MuseSidebarProps {
  currentTab: MuseViewTab;
  onTabChange: (tab: MuseViewTab) => void;
  userRole: "admin" | "public";
  onRoleToggle: () => void;
  onOpenSubmitModal: () => void;
  onOpenBlueprintModal: () => void;
}

export function MuseSidebar({
  currentTab,
  onTabChange,
  userRole,
  onRoleToggle,
  onOpenSubmitModal,
  onOpenBlueprintModal,
}: MuseSidebarProps) {
  const isAdmin = userRole === "admin";

  return (
    <aside className="w-64 my-4 ml-4 hidden lg:flex flex-col justify-between shrink-0 h-[calc(100vh-2rem)] sticky top-4 z-30">
      <div className="bg-white rounded-2xl shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.04)] border border-[#f0f0f0] p-4 flex flex-col h-full">
        
        {/* Brand Satker BPS 6504 */}
        <div className="flex items-center justify-between pb-4 border-b border-[#f0f0f0]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-sky-500 flex items-center justify-center text-white font-bold text-sm shadow-[0_4px_14px_0_rgba(24,144,255,0.35)]">
              <span>65</span>
            </div>
            <div>
              <h1 className="text-sm font-extrabold text-[#141414] tracking-tight flex items-center gap-1.5">
                <span>SIPENA-KTT</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono font-bold ${
                  isAdmin ? "bg-amber-100 text-amber-800" : "bg-blue-50 text-blue-600"
                }`}>
                  {isAdmin ? "NERWILIS" : "ODON"}
                </span>
              </h1>
              <p className="text-[11px] text-[#8c8c8c] font-medium truncate">
                {isAdmin ? "Tim Analis BPS 65.04" : "BPS Kab. Tana Tidung"}
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Menus with Strict Separation */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-1 text-xs">
          
          {/* ======================================================== */}
          {/* 1. PUBLIC VIEW NAVIGATION (Sederhana, Bersih, & Aman)   */}
          {/* ======================================================== */}
          {!isAdmin ? (
            <>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#8c8c8c] mt-1 mb-2">
                Informasi & Berita
              </p>

              {/* Public Menu 1: Tabulasi Berita Harian (ODON) */}
              <button
                onClick={() => onTabChange("overview")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  currentTab === "overview"
                    ? "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-[#141414] font-bold border border-[#f0f0f0]"
                    : "text-[#595959] hover:bg-slate-50 hover:text-[#141414]"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    currentTab === "overview"
                      ? "bg-blue-600 text-white shadow-[0_4px_14px_0_rgba(24,144,255,0.35)]"
                      : "bg-slate-100 text-[#141414]"
                  }`}
                >
                  <Newspaper className="w-4 h-4" />
                </div>
                <span className="flex-1 text-left">Tabulasi Berita Harian</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              </button>

              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#8c8c8c] pt-4 mb-2">
                Referensi & Panduan
              </p>

              {/* Public Menu 2: Kamus KBLI 2025 */}
              <button
                onClick={() => onTabChange("kbli")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  currentTab === "kbli"
                    ? "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-[#141414] font-bold border border-[#f0f0f0]"
                    : "text-[#595959] hover:bg-slate-50 hover:text-[#141414]"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    currentTab === "kbli"
                      ? "bg-blue-600 text-white shadow-[0_4px_14px_0_rgba(24,144,255,0.35)]"
                      : "bg-slate-100 text-[#141414]"
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <span className="flex-1 text-left font-medium">Kamus KBLI 2020 ↔ 2025</span>
              </button>

              {/* Public Menu 3: Metodologi & Pedoman BPS */}
              <button
                onClick={() => onTabChange("methodology")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  currentTab === "methodology"
                    ? "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-[#141414] font-bold border border-[#f0f0f0]"
                    : "text-[#595959] hover:bg-slate-50 hover:text-[#141414]"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    currentTab === "methodology"
                      ? "bg-blue-600 text-white shadow-[0_4px_14px_0_rgba(24,144,255,0.35)]"
                      : "bg-slate-100 text-[#141414]"
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                </div>
                <span className="flex-1 text-left font-medium">Tentang ODON BPS</span>
              </button>

              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#8c8c8c] pt-4 mb-2">
                Partisipasi Publik
              </p>

              {/* Public Menu 4: Kirim Usulan Berita */}
              <button
                onClick={onOpenSubmitModal}
                className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-blue-700 bg-blue-50/70 hover:bg-blue-100 font-semibold transition-all cursor-pointer border border-blue-100"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-xs">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <span className="flex-1">Usulkan Berita Daerah</span>
              </button>
            </>
          ) : (
            /* ======================================================== */
            /* 2. ADMIN VIEW NAVIGATION (Khusus Tim Nerwilis BPS 6504)  */
            /* ======================================================== */
            <>
              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#8c8c8c] mt-1 mb-2">
                Operasional Nerwilis
              </p>

              {/* Admin Menu 1: Ruang Kerja Operasional */}
              <button
                onClick={() => onTabChange("overview")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  currentTab === "overview"
                    ? "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-[#141414] font-bold border border-[#f0f0f0]"
                    : "text-[#595959] hover:bg-slate-50 hover:text-[#141414]"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    currentTab === "overview"
                      ? "bg-blue-600 text-white shadow-[0_4px_14px_0_rgba(24,144,255,0.35)]"
                      : "bg-slate-100 text-[#141414]"
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <span className="flex-1 text-left font-bold">Dashboard Harian</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold font-mono">
                  Live
                </span>
              </button>

              {/* Admin Menu 2: Meja Kurasi AI */}
              <button
                onClick={() => onTabChange("curation")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  currentTab === "curation"
                    ? "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-[#141414] font-bold border border-[#f0f0f0]"
                    : "text-[#595959] hover:bg-slate-50 hover:text-[#141414]"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    currentTab === "curation"
                      ? "bg-blue-600 text-white shadow-[0_4px_14px_0_rgba(24,144,255,0.35)]"
                      : "bg-slate-100 text-[#141414]"
                  }`}
                >
                  <CheckSquare className="w-4 h-4" />
                </div>
                <span className="flex-1 text-left font-medium">Meja Kurasi AI</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-600 font-bold font-mono">
                  8 Antrean
                </span>
              </button>

              {/* Admin Menu 3: Moderasi Usulan Publik */}
              <button
                onClick={() => onTabChange("proposals")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  currentTab === "proposals"
                    ? "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-[#141414] font-bold border border-[#f0f0f0]"
                    : "text-[#595959] hover:bg-slate-50 hover:text-[#141414]"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    currentTab === "proposals"
                      ? "bg-blue-600 text-white shadow-[0_4px_14px_0_rgba(24,144,255,0.35)]"
                      : "bg-slate-100 text-[#141414]"
                  }`}
                >
                  <Inbox className="w-4 h-4" />
                </div>
                <span className="flex-1 text-left font-medium">Moderasi Usulan OPD</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold font-mono">
                  3 Usulan
                </span>
              </button>

              {/* Admin Menu 4: Buku Kerja Master Sheet 6503 */}
              <button
                onClick={() => onTabChange("ledger")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  currentTab === "ledger"
                    ? "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-[#141414] font-bold border border-[#f0f0f0]"
                    : "text-[#595959] hover:bg-slate-50 hover:text-[#141414]"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    currentTab === "ledger"
                      ? "bg-blue-600 text-white shadow-[0_4px_14px_0_rgba(24,144,255,0.35)]"
                      : "bg-slate-100 text-[#141414]"
                  }`}
                >
                  <Table2 className="w-4 h-4" />
                </div>
                <span className="flex-1 text-left font-medium">Buku Kerja Sheet 6503</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold font-mono">
                  .xlsx
                </span>
              </button>

              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#8c8c8c] pt-4 mb-2">
                Analisis & Standar Internal
              </p>

              {/* Admin Menu 5: Matriks Bobot PDRB (Internal) */}
              <button
                onClick={() => onTabChange("pdrb")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  currentTab === "pdrb"
                    ? "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-[#141414] font-bold border border-[#f0f0f0]"
                    : "text-[#595959] hover:bg-slate-50 hover:text-[#141414]"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    currentTab === "pdrb"
                      ? "bg-blue-600 text-white shadow-[0_4px_14px_0_rgba(24,144,255,0.35)]"
                      : "bg-slate-100 text-[#141414]"
                  }`}
                >
                  <Layers className="w-4 h-4" />
                </div>
                <span className="flex-1 text-left font-medium">Bobot PDRB (Internal)</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-mono font-bold">
                  88.1%
                </span>
              </button>

              {/* Admin Menu 6: Draf Narasi Fenomena BRS (Internal) */}
              <button
                onClick={() => onTabChange("narratives")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  currentTab === "narratives"
                    ? "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-[#141414] font-bold border border-[#f0f0f0]"
                    : "text-[#595959] hover:bg-slate-50 hover:text-[#141414]"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    currentTab === "narratives"
                      ? "bg-blue-600 text-white shadow-[0_4px_14px_0_rgba(24,144,255,0.35)]"
                      : "bg-slate-100 text-[#141414]"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                </div>
                <span className="flex-1 text-left font-medium">Draf Narasi BRS</span>
              </button>

              {/* Admin Menu 7: Katalog KBLI 2025 */}
              <button
                onClick={() => onTabChange("kbli")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  currentTab === "kbli"
                    ? "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-[#141414] font-bold border border-[#f0f0f0]"
                    : "text-[#595959] hover:bg-slate-50 hover:text-[#141414]"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    currentTab === "kbli"
                      ? "bg-blue-600 text-white shadow-[0_4px_14px_0_rgba(24,144,255,0.35)]"
                      : "bg-slate-100 text-[#141414]"
                  }`}
                >
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <span className="flex-1 text-left font-medium">Katalog KBLI 2025</span>
              </button>

              <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#8c8c8c] pt-4 mb-2">
                Otomasi & Sistem
              </p>

              {/* Admin Menu 8: Radar Scraper 5 Portal */}
              <button
                onClick={() => onTabChange("scrapers")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  currentTab === "scrapers"
                    ? "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-[#141414] font-bold border border-[#f0f0f0]"
                    : "text-[#595959] hover:bg-slate-50 hover:text-[#141414]"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    currentTab === "scrapers"
                      ? "bg-blue-600 text-white shadow-[0_4px_14px_0_rgba(24,144,255,0.35)]"
                      : "bg-slate-100 text-[#141414]"
                  }`}
                >
                  <Radar className="w-4 h-4" />
                </div>
                <span className="flex-1 text-left font-medium">Crawler 5 Portal Kaltara</span>
                <span className="text-[10px] font-mono text-emerald-600 font-bold">05:00</span>
              </button>

              {/* Admin Menu 9: Metodologi SOP */}
              <button
                onClick={() => onTabChange("methodology")}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all cursor-pointer ${
                  currentTab === "methodology"
                    ? "bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)] text-[#141414] font-bold border border-[#f0f0f0]"
                    : "text-[#595959] hover:bg-slate-50 hover:text-[#141414]"
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                    currentTab === "methodology"
                      ? "bg-blue-600 text-white shadow-[0_4px_14px_0_rgba(24,144,255,0.35)]"
                      : "bg-slate-100 text-[#141414]"
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                </div>
                <span className="flex-1 text-left font-medium">Buku Pedoman ODON</span>
              </button>
            </>
          )}

        </nav>

        {/* User Satker Profile Footer */}
        <div className="pt-3 border-t border-[#f0f0f0] space-y-2.5">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/60 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className={`w-8 h-8 rounded-full font-bold flex items-center justify-center text-xs shrink-0 ${
                isAdmin ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-700"
              }`}>
                {isAdmin ? "ADM" : "PUB"}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#141414] truncate">
                  {isAdmin ? "Tim Nerwilis 6504" : "Mode Tamu / Publik"}
                </p>
                <p className="text-[10px] text-[#8c8c8c] truncate">
                  {isAdmin ? "Koordinator PDRB" : "Masyarakat & OPD"}
                </p>
              </div>
            </div>
            
            <button
              onClick={onOpenBlueprintModal}
              title="Techstack Architecture Blueprint"
              className="p-1.5 rounded-lg text-[#8c8c8c] hover:text-[#141414] hover:bg-slate-200 transition-colors shrink-0"
            >
              <Code2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Role Switcher Pill */}
          <button
            onClick={onRoleToggle}
            className={`w-full py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              isAdmin
                ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            }`}
          >
            {isAdmin ? (
              <>
                <Eye className="w-3.5 h-3.5" />
                <span>Lihat Tampilan Publik</span>
              </>
            ) : (
              <>
                <Shield className="w-3.5 h-3.5" />
                <span>Masuk Petugas BPS (Admin)</span>
              </>
            )}
          </button>
        </div>

      </div>
    </aside>
  );
}
