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
} from "lucide-react";

export type MuseViewTab =
  | "overview"
  | "curation"
  | "ledger"
  | "pdrb"
  | "narratives"
  | "kbli"
  | "scrapers"
  | "submit";

interface MuseSidebarProps {
  currentTab: MuseViewTab;
  onTabChange: (tab: MuseViewTab) => void;
  userRole: "admin" | "public";
  onOpenSubmitModal: () => void;
  onOpenBlueprintModal: () => void;
}

export function MuseSidebar({
  currentTab,
  onTabChange,
  userRole,
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
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-50 text-blue-600 font-mono font-bold">ODON</span>
              </h1>
              <p className="text-[11px] text-[#8c8c8c] font-medium truncate">BPS Kabupaten Tana Tidung</p>
            </div>
          </div>
        </div>

        {/* Navigation Menus with Role-Based Separation */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-1 text-xs">
          
          {/* GROUP 1: OPERASIONAL ODON */}
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#8c8c8c] mt-1 mb-2">
            Operasional ODON
          </p>

          {/* Menu 1: Edisi Hari Ini (Semua Role) */}
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
            <span className="flex-1 text-left">Edisi Hari Ini (H-1)</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
          </button>

          {/* Menu 2: Meja Kurasi Berita (KHUSUS ADMIN) */}
          {isAdmin && (
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
                8 Antre
              </span>
            </button>
          )}

          {/* Menu 3: Buku Kerja Sheet 6503 (Semua Role) */}
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

          {/* GROUP 2: ANALISIS & STRUKTUR PDRB */}
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#8c8c8c] pt-4 mb-2">
            Analisis Neraca Wilayah
          </p>

          {/* Menu 4: Matriks Bobot PDRB KTT */}
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
            <span className="flex-1 text-left font-medium">Matriks Bobot PDRB</span>
          </button>

          {/* Menu 5: Narasi Fenomena Triwulanan */}
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
            <span className="flex-1 text-left font-medium">Narasi Triwulanan</span>
          </button>

          {/* Menu 6: Konversi KBLI 2020 ↔ 2025 */}
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
            <span className="flex-1 text-left font-medium">Konversi KBLI 2025</span>
          </button>

          {/* GROUP 3: SISTEM & PARTISIPASI */}
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#8c8c8c] pt-4 mb-2">
            Sistem & Partisipasi
          </p>

          {/* Menu 7: Radar Scraper 4 Portal (KHUSUS ADMIN) */}
          {isAdmin && (
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
              <span className="flex-1 text-left font-medium">Radar 4 Portal Kaltara</span>
              <span className="text-[10px] font-mono text-emerald-600 font-bold">05:00</span>
            </button>
          )}

          {/* Menu 8: Kirim Usulan Berita (SEMUA ROLE) */}
          <button
            onClick={onOpenSubmitModal}
            className="w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#595959] hover:bg-slate-50 hover:text-[#141414] transition-all cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-[#141414] flex items-center justify-center">
              <PlusCircle className="w-4 h-4" />
            </div>
            <span className="flex-1 font-medium">Kirim Usulan Berita</span>
          </button>

        </nav>

        {/* User Satker Profile Footer */}
        <div className="p-3 rounded-xl bg-slate-50 border border-[#f0f0f0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-xs">
              {isAdmin ? "NW" : "PB"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-[#141414] truncate">
                {isAdmin ? "Tim Nerwilis 6504" : "Publik / Kontributor"}
              </p>
              <p className="text-[10px] text-[#8c8c8c] truncate">
                {isAdmin ? "bps6504@bps.go.id" : "Akses Terbatas"}
              </p>
            </div>
          </div>
          <button
            onClick={onOpenBlueprintModal}
            title="Lihat Blueprint Techstack"
            className="p-1 rounded-lg text-[#8c8c8c] hover:text-[#141414] hover:bg-slate-200 transition-colors"
          >
            <Code2 className="w-4 h-4" />
          </button>
        </div>

      </div>
    </aside>
  );
}

