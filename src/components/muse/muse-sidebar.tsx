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
  LogOut,
} from "lucide-react";
import { PDRB_KTT_WEIGHTS, PORTAL_SOURCES } from "@/lib/constants/taxonomy";

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
  pendingCandidatesCount: number;
  pendingProposalsCount: number;
  portalsCount?: number;
  userName?: string | null;
  onLogout?: () => void;
}

type PillTone = "blue" | "amber" | "green" | "neutral";

export interface MuseNavItem {
  tab: MuseViewTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  pill?: string;
  pillTone?: PillTone;
  live?: boolean;
}

export function getMuseNavGroups(counts?: {
  pendingCandidatesCount?: number;
  pendingProposalsCount?: number;
  portalsCount?: number;
}): { title: string; items: MuseNavItem[] }[] {
  const candidates = counts?.pendingCandidatesCount ?? 0;
  const proposals = counts?.pendingProposalsCount ?? 0;
  const portals = counts?.portalsCount ?? PORTAL_SOURCES.length;

  return [
    {
      title: "Operasional Nerwilis",
      items: [
        { tab: "overview", label: "Dashboard Harian", icon: LayoutDashboard, live: true },
        {
          tab: "curation",
          label: "Meja Kurasi AI",
          icon: CheckSquare,
          pill: `${candidates} Antrean`,
          pillTone: "blue",
        },
        {
          tab: "proposals",
          label: "Moderasi Usulan OPD",
          icon: Inbox,
          pill: `${proposals} Usulan`,
          pillTone: "amber",
        },
        {
          tab: "ledger",
          label: "Buku Kerja Sheet 6503",
          icon: FileSpreadsheet,
          pill: ".xlsx",
          pillTone: "green",
        },
      ],
    },
    {
      title: "Analisis & Standar",
      items: [
        {
          tab: "pdrb",
          label: "Bobot PDRB (Internal)",
          icon: Layers,
          pill: `${PDRB_KTT_WEIGHTS.top4LapanganUsahaShare}%`,
          pillTone: "neutral",
        },
        { tab: "narratives", label: "Draf Narasi BRS", icon: FileText },
        { tab: "kbli", label: "Kamus KBLI 2025", icon: ArrowLeftRight },
      ],
    },
    {
      title: "Otomasi Sistem",
      items: [
        {
          tab: "scrapers",
          label: `Crawler ${portals} Portal`,
          icon: Radar,
          pill: "05:00",
          pillTone: "green",
        },
        { tab: "methodology", label: "Pedoman SOP ODON", icon: BookOpen },
      ],
    },
  ];
}

export const MUSE_NAV_GROUPS = getMuseNavGroups();

const PILL_CLASS: Record<PillTone, string> = {
  blue: "ui-nav-pill ui-nav-pill-blue",
  amber: "ui-nav-pill ui-nav-pill-amber",
  green: "ui-nav-pill ui-nav-pill-green",
  neutral: "ui-nav-pill",
};

function getInitials(name: string | null | undefined): string {
  if (!name) return "ADM";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "ADM";
  if (parts.length === 1) return parts[0].slice(0, 3).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

export function MuseSidebar({
  currentTab,
  onTabChange,
  userRole,
  onRoleToggle,
  onOpenBlueprintModal,
  pendingCandidatesCount,
  pendingProposalsCount,
  portalsCount = PORTAL_SOURCES.length,
  userName,
  onLogout,
}: MuseSidebarProps) {
  const isAdmin = userRole === "admin";

  if (!isAdmin) {
    return null;
  }

  const navGroups = getMuseNavGroups({
    pendingCandidatesCount,
    pendingProposalsCount,
    portalsCount,
  });

  return (
    <aside
      aria-label="Navigasi admin"
      className="hidden lg:flex w-72 shrink-0 flex-col h-screen sticky top-0 z-40 bg-[#0B0F19] text-slate-300 border-r border-slate-800/80"
    >
      {/* Brand */}
      <div className="flex items-center gap-3 px-5 h-16 shrink-0 border-b border-slate-800/80">
        <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xs num shadow-lg shadow-blue-600/30">
          65
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <span>SIPENA-KTT</span>
            <span className="ui-nav-pill ui-nav-pill-blue !ml-0">ADMIN</span>
          </h1>
          <p className="text-[11px] text-slate-400 font-medium truncate">
            BPS Kab. Tana Tidung (65.04)
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
        {navGroups.map((group) => (
          <div key={group.title} className="space-y-1">
            <p className="px-3 pb-1 text-[11px] font-semibold tracking-wide text-slate-500">
              {group.title}
            </p>
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = currentTab === item.tab;
              return (
                <button
                  key={item.tab}
                  type="button"
                  onClick={() => onTabChange(item.tab)}
                  aria-current={active ? "page" : undefined}
                  className="ui-nav-item"
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${active ? "text-blue-400" : "text-slate-500"}`}
                  />
                  <span className="truncate">{item.label}</span>
                  {item.live && (
                    <span
                      aria-hidden="true"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 ui-dot-live"
                    />
                  )}
                  {item.pill && (
                    <span className={PILL_CLASS[item.pillTone ?? "neutral"]}>{item.pill}</span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="shrink-0 p-4 border-t border-slate-800/80 space-y-2.5">
        <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-blue-600/20 text-blue-300 ring-1 ring-blue-500/30 font-bold flex items-center justify-center text-[11px] shrink-0">
              {getInitials(userName)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                {userName ?? "Tim Nerwilis 6504"}
              </p>
              <p className="text-[11px] text-slate-400 truncate">Analis PDRB KTT</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenBlueprintModal}
            title="Architecture Blueprint"
            aria-label="Buka Architecture Blueprint"
            className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <Code2 className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onRoleToggle}
            className="flex-1 min-h-10 px-3 rounded-xl text-xs font-semibold inline-flex items-center justify-center gap-2 bg-slate-800/70 hover:bg-slate-800 text-slate-100 border border-slate-700/70 transition-all active:scale-[0.98]"
          >
            <Eye className="w-3.5 h-3.5 text-blue-400" aria-hidden="true" />
            <span>Tampilan Publik</span>
          </button>
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title="Keluar sesi"
              aria-label="Keluar dari sesi operator"
              className="w-10 h-10 shrink-0 rounded-xl inline-flex items-center justify-center bg-slate-800/70 hover:bg-rose-950/80 text-slate-300 hover:text-rose-300 border border-slate-700/70 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
