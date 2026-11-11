"use client";

import React from "react";
import {
  LayoutDashboard,
  CheckSquare,
  FileSpreadsheet,
  Radar,
  ArrowLeftRight,
  Layers,
  FileText,
  Inbox,
  BookOpen,
  Eye,
  Code2,
  Sparkles,
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
  onOpenBlueprintModal,
}: MuseSidebarProps) {
  const isAdmin = userRole === "admin";

  // For public mode, the sidebar is completely hidden (clean full-width portal)
  if (!isAdmin) {
    return null;
  }

  return (
    <aside className="w-64 my-4 ml-4 hidden lg:flex flex-col justify-between shrink-0 h-[calc(100vh-2rem)] sticky top-4 z-30">
      
      {/* NextAdmin Dark Slate Sidebar Container */}
      <div className="bg-[#1C2434] text-[#DEE4EE] rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-[#2E3A47] p-4 flex flex-col h-full overflow-hidden">
        
        {/* Brand Satker BPS 6504 Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2E3A47]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-[#3C50E0] flex items-center justify-center text-white font-bold text-xs shadow-md">
              <span>65</span>
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                <span>SIPENA-KTT</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold bg-[#3C50E0]/30 text-[#80CAEE] border border-[#3C50E0]/50">
                  ADMIN
                </span>
              </h1>
              <p className="text-[11px] text-[#8A99AD] font-medium truncate">
                BPS Kab. Tana Tidung (65.04)
              </p>
            </div>
          </div>
        </div>

        {/* Enterprise Grouped Navigation (NextAdmin Architecture) */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-5 text-xs custom-scrollbar">
          
          {/* GROUP 1: OPERASIONAL ODON */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#8A99AD]">
              Operasional Nerwilis
            </p>

            {/* Menu 1: Dashboard Harian */}
            <button
              onClick={() => onTabChange("overview")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                currentTab === "overview"
                  ? "bg-[#333A48] text-white font-semibold"
                  : "text-[#DEE4EE] hover:bg-[#333A48]/60 hover:text-white"
              }`}
            >
              <LayoutDashboard className={`w-4 h-4 ${currentTab === "overview" ? "text-[#3C50E0]" : "text-[#8A99AD]"}`} />
              <span className="flex-1 text-left">Dashboard Harian</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#219653]" />
            </button>

            {/* Menu 2: Meja Kurasi AI */}
            <button
              onClick={() => onTabChange("curation")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                currentTab === "curation"
                  ? "bg-[#333A48] text-white font-semibold"
                  : "text-[#DEE4EE] hover:bg-[#333A48]/60 hover:text-white"
              }`}
            >
              <CheckSquare className={`w-4 h-4 ${currentTab === "curation" ? "text-[#3C50E0]" : "text-[#8A99AD]"}`} />
              <span className="flex-1 text-left">Meja Kurasi AI</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-[#3C50E0] text-white">
                8 Antrean
              </span>
            </button>

            {/* Menu 3: Moderasi Usulan Publik & OPD */}
            <button
              onClick={() => onTabChange("proposals")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                currentTab === "proposals"
                  ? "bg-[#333A48] text-white font-semibold"
                  : "text-[#DEE4EE] hover:bg-[#333A48]/60 hover:text-white"
              }`}
            >
              <Inbox className={`w-4 h-4 ${currentTab === "proposals" ? "text-[#FFA70B]" : "text-[#8A99AD]"}`} />
              <span className="flex-1 text-left">Moderasi Usulan OPD</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-[#FFA70B]/20 text-[#FFA70B]">
                3 Usulan
              </span>
            </button>

            {/* Menu 4: Buku Kerja Master Sheet 6503 */}
            <button
              onClick={() => onTabChange("ledger")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                currentTab === "ledger"
                  ? "bg-[#333A48] text-white font-semibold"
                  : "text-[#DEE4EE] hover:bg-[#333A48]/60 hover:text-white"
              }`}
            >
              <FileSpreadsheet className={`w-4 h-4 ${currentTab === "ledger" ? "text-[#219653]" : "text-[#8A99AD]"}`} />
              <span className="flex-1 text-left">Buku Kerja Sheet 6503</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-[#219653]/20 text-[#219653]">
                .xlsx
              </span>
            </button>
          </div>

          {/* GROUP 2: ANALISIS & STANDAR */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#8A99AD]">
              Analisis & Standar
            </p>

            {/* Menu 5: Matriks Bobot PDRB (Internal) */}
            <button
              onClick={() => onTabChange("pdrb")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                currentTab === "pdrb"
                  ? "bg-[#333A48] text-white font-semibold"
                  : "text-[#DEE4EE] hover:bg-[#333A48]/60 hover:text-white"
              }`}
            >
              <Layers className={`w-4 h-4 ${currentTab === "pdrb" ? "text-[#3C50E0]" : "text-[#8A99AD]"}`} />
              <span className="flex-1 text-left">Bobot PDRB (Internal)</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-[#333A48] text-[#80CAEE]">
                88.1%
              </span>
            </button>

            {/* Menu 6: Draf Narasi Fenomena BRS (Internal) */}
            <button
              onClick={() => onTabChange("narratives")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                currentTab === "narratives"
                  ? "bg-[#333A48] text-white font-semibold"
                  : "text-[#DEE4EE] hover:bg-[#333A48]/60 hover:text-white"
              }`}
            >
              <FileText className={`w-4 h-4 ${currentTab === "narratives" ? "text-[#3C50E0]" : "text-[#8A99AD]"}`} />
              <span className="flex-1 text-left">Draf Narasi BRS</span>
            </button>

            {/* Menu 7: Kamus Transisi KBLI 2025 */}
            <button
              onClick={() => onTabChange("kbli")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                currentTab === "kbli"
                  ? "bg-[#333A48] text-white font-semibold"
                  : "text-[#DEE4EE] hover:bg-[#333A48]/60 hover:text-white"
              }`}
            >
              <ArrowLeftRight className={`w-4 h-4 ${currentTab === "kbli" ? "text-[#3C50E0]" : "text-[#8A99AD]"}`} />
              <span className="flex-1 text-left">Kamus KBLI 2025</span>
            </button>
          </div>

          {/* GROUP 3: OTOMASI SISTEM */}
          <div className="space-y-1">
            <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#8A99AD]">
              Otomasi Sistem
            </p>

            {/* Menu 8: Radar Scraper 5 Portal */}
            <button
              onClick={() => onTabChange("scrapers")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                currentTab === "scrapers"
                  ? "bg-[#333A48] text-white font-semibold"
                  : "text-[#DEE4EE] hover:bg-[#333A48]/60 hover:text-white"
              }`}
            >
              <Radar className={`w-4 h-4 ${currentTab === "scrapers" ? "text-[#219653]" : "text-[#8A99AD]"}`} />
              <span className="flex-1 text-left">Crawler 5 Portal</span>
              <span className="text-[10px] font-mono font-bold text-[#219653]">
                05:00
              </span>
            </button>

            {/* Menu 9: Buku Pedoman SOP Nerwilis */}
            <button
              onClick={() => onTabChange("methodology")}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all cursor-pointer ${
                currentTab === "methodology"
                  ? "bg-[#333A48] text-white font-semibold"
                  : "text-[#DEE4EE] hover:bg-[#333A48]/60 hover:text-white"
              }`}
            >
              <BookOpen className={`w-4 h-4 ${currentTab === "methodology" ? "text-[#3C50E0]" : "text-[#8A99AD]"}`} />
              <span className="flex-1 text-left">Pedoman SOP ODON</span>
            </button>
          </div>

        </nav>

        {/* NextAdmin User Card Footer */}
        <div className="pt-3 border-t border-[#2E3A47] space-y-2.5">
          <div className="p-2.5 rounded-lg bg-[#24303F] border border-[#2E3A47] flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#3C50E0] text-white font-bold flex items-center justify-center text-xs shrink-0">
                ADM
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">
                  Tim Nerwilis 6504
                </p>
                <p className="text-[10px] text-[#8A99AD] truncate">
                  Analis PDRB KTT
                </p>
              </div>
            </div>
            
            <button
              onClick={onOpenBlueprintModal}
              title="Architecture Blueprint"
              className="p-1.5 rounded-md text-[#8A99AD] hover:text-white hover:bg-[#333A48] transition-colors shrink-0"
            >
              <Code2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Quick Preview Public Mode Button */}
          <button
            onClick={onRoleToggle}
            className="w-full py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 bg-[#333A48] hover:bg-[#333A48]/80 text-[#DEE4EE] border border-[#2E3A47] transition-all cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-[#3C50E0]" />
            <span>Lihat Tampilan Publik</span>
          </button>
        </div>

      </div>
    </aside>
  );
}
