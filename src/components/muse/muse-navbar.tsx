"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Clock, Download, Shield, Eye, LayoutGrid, LogOut } from "lucide-react";
import { PORTAL_SOURCES } from "@/lib/constants/taxonomy";
import { getMuseNavGroups, type MuseViewTab } from "./muse-sidebar";

interface MuseNavbarProps {
  currentTab: MuseViewTab;
  onTabChange?: (tab: MuseViewTab) => void;
  userRole: "admin" | "public";
  hasAdminSession: boolean;
  sessionRole?: "admin" | "editor" | "viewer" | null;
  onRoleChange: (role: "admin" | "public") => void;
  onExportExcel: () => void;
  onOpenSubmitModal?: () => void;
  onLogout?: () => void;
  pendingCandidatesCount?: number;
  pendingProposalsCount?: number;
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
    title: "Mesin Pencari Crosswalk KBLI 2020 <-> KBLI 2025 (BPS0000)",
  },
  scrapers: {
    breadcrumb: "Radar Crawler",
    title: `Status Bot Scraper ${PORTAL_SOURCES.length} Portal Berita Kaltara & Nasional`,
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

const HEADER_SHELL =
  "sticky top-0 z-30 backdrop-blur-md bg-white/80 border-b border-slate-200/70";
const HEADER_INNER = "w-full max-w-[1440px] mx-auto px-6 lg:px-10";

export function MuseNavbar({
  currentTab,
  onTabChange,
  userRole,
  hasAdminSession,
  sessionRole,
  onRoleChange,
  onExportExcel,
  onLogout,
  pendingCandidatesCount = 0,
  pendingProposalsCount = 0,
}: MuseNavbarProps) {
  const [timeString, setTimeString] = useState("08:00:00 WITA");

  const isAdmin = userRole === "admin" && hasAdminSession;

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
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

  const clock = (
    <div
      className="hidden sm:inline-flex items-center gap-2 h-9 px-3 rounded-xl bg-slate-50 ring-1 ring-inset ring-slate-200 text-xs text-slate-600 num"
      role="timer"
      aria-label="Waktu WITA"
    >
      <Clock className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
      <span>{timeString}</span>
    </div>
  );

  // ========================================================
  // 1. PUBLIC NAVBAR
  // ========================================================
  if (!isAdmin) {
    return (
      <header className={HEADER_SHELL}>
        <div className={`${HEADER_INNER} h-16 flex items-center justify-between gap-4`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 shrink-0 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-xs num shadow-sm shadow-blue-600/30">
              65
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-slate-900 tracking-tight">SIPENA-KTT</h1>
                <span className="ui-badge ui-badge-info hidden sm:inline-flex num">
                  SIPENA-KTT ODON 6504
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium truncate">
                Badan Pusat Statistik Kabupaten Tana Tidung
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            {clock}

            {sessionRole === "viewer" && (
              <button
                type="button"
                onClick={onExportExcel}
                className="ui-btn ui-btn-secondary"
                title="Unduh Buku Kerja ODON format Sheet 6503 (.xlsx)"
              >
                <Download className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                <span className="hidden md:inline">Ekspor Sheet 6503</span>
              </button>
            )}

            {hasAdminSession ? (
              <button
                type="button"
                onClick={() => onRoleChange("admin")}
                className="ui-btn ui-btn-primary"
                title="Kembali ke Workspace Admin Nerwilis"
              >
                <LayoutGrid className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Mode Admin Nerwilis</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onRoleChange("admin")}
                className="ui-btn ui-btn-primary"
                title="Masuk sebagai Petugas BPS Nerwilis"
              >
                <Shield className="w-3.5 h-3.5" aria-hidden="true" />
                <span>
                  {sessionRole === "viewer" ? "Ganti Akun Kurator" : "Masuk Petugas BPS"}
                </span>
              </button>
            )}

            {sessionRole && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                title="Keluar sesi"
                aria-label="Keluar sesi"
                className="ui-icon-btn"
              >
                <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      </header>
    );
  }

  // ========================================================
  // 2. ADMIN NAVBAR
  // ========================================================
  const meta = ADMIN_TAB_TITLES[currentTab] || ADMIN_TAB_TITLES.overview;
  const mobileItems = getMuseNavGroups({
    pendingCandidatesCount,
    pendingProposalsCount,
    portalsCount: PORTAL_SOURCES.length,
  }).flatMap((g) => g.items);

  return (
    <header className={HEADER_SHELL}>
      <div className={`${HEADER_INNER} py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-3`}>
        {/* Breadcrumbs & title */}
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-slate-500">
            <span className="font-semibold text-slate-800">BPS 65.04</span>
            <span aria-hidden="true">/</span>
            <span>Nerwilis</span>
            <span aria-hidden="true">/</span>
            <span className="text-blue-600 font-semibold">{meta.breadcrumb}</span>
          </nav>
          <h2 className="text-sm sm:text-[15px] font-semibold tracking-tight text-slate-900 mt-0.5 truncate">
            {meta.title}
          </h2>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2.5">
          <Link
            href="/"
            className="hidden xl:inline-flex ui-badge ui-badge-success h-9 px-3 num hover:bg-emerald-100 transition-colors"
            title="Buka Workstation Triwulanan SIPENA-KTT (/)"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ui-dot-live" aria-hidden="true" />
            <span>MEJA KURASI (/)</span>
          </Link>

          {clock}

          <button
            type="button"
            onClick={() => onRoleChange("public")}
            className="ui-btn ui-btn-secondary"
            title="Pratinjau tampilan publik"
          >
            <Eye className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
            <span className="hidden sm:inline">Pratinjau Publik</span>
            <span className="sm:hidden">Publik</span>
          </button>

          <button
            type="button"
            onClick={onExportExcel}
            className="ui-btn ui-btn-primary"
            title="Unduh Buku Kerja ODON format Sheet 6503 (.xlsx)"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Ekspor Sheet 6503</span>
            <span className="sm:hidden">.xlsx</span>
          </button>
        </div>

        {/* Mobile section switcher (sidebar is hidden below lg) */}
        {onTabChange && (
          <div className="lg:hidden w-full">
            <div className="ui-seg" role="tablist" aria-label="Menu admin">
              {mobileItems.map((item) => (
                <button
                  key={item.tab}
                  type="button"
                  role="tab"
                  aria-selected={currentTab === item.tab}
                  data-active={currentTab === item.tab}
                  onClick={() => onTabChange(item.tab)}
                  className="ui-seg-item"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
