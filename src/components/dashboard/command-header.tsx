"use client";

import {
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Table2,
} from "lucide-react";
import { formatIndonesianDate } from "@/lib/utils";
import type { AuthenticatedUser, PeriodQuarter } from "@/types/client";

export type WorkspaceTab = "dashboard" | "feed" | "export";

interface CommandHeaderProps {
  user: AuthenticatedUser;
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  quarter: PeriodQuarter;
  year: number;
  onChangePeriod: (quarter: PeriodQuarter, year: number) => void;
  pendingCount: number;
  unprocessedArticlesCount: number;
  latestIngestedAt: string | null;
  isCrawling: boolean;
  onTriggerCrawl: () => void;
  onLogout: () => void;
}

const QUARTER_LABELS: Record<PeriodQuarter, string> = {
  Q1: "Triwulan I",
  Q2: "Triwulan II",
  Q3: "Triwulan III",
  Q4: "Triwulan IV",
};

const ROLE_LABELS: Record<AuthenticatedUser["role"], string> = {
  admin: "Admin Nerwilis",
  editor: "Analis PDRB",
  viewer: "Pimpinan / Viewer",
};

export function CommandHeader({
  user,
  activeTab,
  onSelectTab,
  quarter,
  year,
  onChangePeriod,
  pendingCount,
  unprocessedArticlesCount,
  latestIngestedAt,
  isCrawling,
  onTriggerCrawl,
  onLogout,
}: CommandHeaderProps) {
  const canOperate = user.role === "admin" || user.role === "editor";
  const initials = user.name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <>
      <a
        href="#workspace-main"
        className="visually-hidden fixed left-3 top-3 z-50 rounded bg-[#0284C7] px-3 py-2 text-xs font-semibold text-white shadow-lg"
      >
        Lewati navigasi ke konten utama
      </a>

      <header className="sticky top-0 z-40 border-b border-slate-800 bg-[#0D131F]">
        {/* Top Command Bar */}
        <div className="flex min-h-14 flex-wrap items-center justify-between gap-3 px-4 py-2 lg:px-6">
          {/* Left: BPS Identity & Territory */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded border border-sky-500/35 bg-[#002B49] font-display text-xs font-bold text-sky-300">
                SP
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-display text-sm font-semibold tracking-tight text-white">
                    SIPENA-KTT
                  </span>
                  <span className="rounded border border-sky-800/70 bg-sky-950 px-1.5 py-0.5 font-mono text-[10px] font-medium uppercase text-sky-300">
                    BPS 65.04
                  </span>
                </div>
                <p className="text-[11px] leading-tight text-slate-400">
                  Fenomena Ekonomi &amp; PDRB Kab. Tana Tidung
                </p>
              </div>
            </div>

            <div className="hidden items-center gap-1.5 border-l border-slate-800 pl-4 font-mono text-xs text-slate-400 md:flex">
              <span>Kalimantan Utara</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-600" aria-hidden="true" />
              <span className="text-slate-200">
                {QUARTER_LABELS[quarter]} {year}
              </span>
            </div>
          </div>

          {/* Center: Operational Cron Status & Unprocessed Queue */}
          <div className="hidden items-center gap-2.5 xl:flex">
            <div className="flex items-center gap-2 rounded border border-slate-800 bg-[#080C14] px-2.5 py-1 font-mono text-[11px]">
              <Clock className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <span className="text-slate-400">Cron Harian 05:00 WITA</span>
              <span className="text-slate-600">&middot;</span>
              <span className="text-slate-200">
                {latestIngestedAt
                  ? `Tarik terakhir: ${formatIndonesianDate(latestIngestedAt)}`
                  : "Belum ada penarikan"}
              </span>
            </div>

            {unprocessedArticlesCount > 0 && (
              <div className="rounded border border-amber-800/70 bg-amber-950/60 px-2.5 py-1 font-mono text-[11px] text-amber-300">
                <span className="tabular-nums">{unprocessedArticlesCount}</span> artikel belum diekstrak AI
              </div>
            )}
          </div>

          {/* Right: Period Picker, Quick Actions & User Profile */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Period Selector */}
            <div className="flex items-center gap-1.5 rounded border border-slate-700 bg-[#080C14] px-2 py-1 font-mono text-xs">
              <label htmlFor="period-quarter" className="visually-hidden">
                Triwulan
              </label>
              <select
                id="period-quarter"
                value={quarter}
                onChange={(e) =>
                  onChangePeriod(e.target.value as PeriodQuarter, year)
                }
                className="bg-transparent text-xs font-semibold text-slate-100 focus:outline-none"
              >
                <option value="Q1" className="bg-[#0D131F] text-slate-100">
                  Q1 (Jan-Mar)
                </option>
                <option value="Q2" className="bg-[#0D131F] text-slate-100">
                  Q2 (Apr-Jun)
                </option>
                <option value="Q3" className="bg-[#0D131F] text-slate-100">
                  Q3 (Jul-Sep)
                </option>
                <option value="Q4" className="bg-[#0D131F] text-slate-100">
                  Q4 (Okt-Des)
                </option>
              </select>

              <span className="text-slate-700">/</span>

              <label htmlFor="period-year" className="visually-hidden">
                Tahun Neraca
              </label>
              <select
                id="period-year"
                value={year}
                onChange={(e) =>
                  onChangePeriod(quarter, Number(e.target.value))
                }
                className="bg-transparent text-xs font-semibold text-slate-100 tabular-nums focus:outline-none"
              >
                <option value={2024} className="bg-[#0D131F] text-slate-100">
                  2024
                </option>
                <option value={2025} className="bg-[#0D131F] text-slate-100">
                  2025
                </option>
                <option value={2026} className="bg-[#0D131F] text-slate-100">
                  2026
                </option>
              </select>
            </div>

            {canOperate && (
              <button
                type="button"
                onClick={onTriggerCrawl}
                disabled={isCrawling}
                className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-[#131B2B] px-3 py-1.5 text-xs font-medium text-slate-200 transition-colors hover:bg-[#1A2438] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 text-sky-400 ${isCrawling ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                <span className="hidden sm:inline">
                  {isCrawling ? "Menarik Berita..." : "Ambil Berita Baru"}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onSelectTab("export")}
              className="inline-flex items-center gap-1.5 rounded bg-[#0284C7] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-sky-500"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Ekspor Excel</span>
            </button>

            <div className="mx-0.5 hidden h-6 w-px bg-slate-800 sm:block" />

            {/* User Profile + Logout */}
            <div className="flex items-center gap-2">
              <div
                className="flex h-7 w-7 items-center justify-center rounded border border-slate-700 bg-slate-800 font-mono text-[11px] font-semibold text-sky-300"
                title={`${user.name} (${user.email})`}
              >
                {initials || "SP"}
              </div>
              <div className="hidden text-left lg:block">
                <div className="max-w-[140px] truncate text-xs font-medium leading-none text-slate-200">
                  {user.name}
                </div>
                <div className="mt-0.5 font-mono text-[10px] text-slate-400">
                  {ROLE_LABELS[user.role]}
                </div>
              </div>
              <button
                type="button"
                onClick={onLogout}
                aria-label="Keluar dari akun"
                className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded border border-slate-800 bg-[#080C14] text-slate-400 transition-colors hover:border-slate-700 hover:bg-slate-800 hover:text-slate-100"
                title="Keluar sesi"
              >
                <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Tab Bar */}
        <div className="flex items-center justify-between border-t border-slate-800/80 px-4 lg:px-6">
          <nav className="flex gap-1 overflow-x-auto" aria-label="Modul Workspace">
            <button
              type="button"
              onClick={() => onSelectTab("dashboard")}
              aria-current={activeTab === "dashboard" ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-medium transition-colors ${
                activeTab === "dashboard"
                  ? "border-[#0284C7] text-sky-300"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <LayoutDashboard className="h-4 w-4" aria-hidden="true" />
              <span>Ringkasan Eksekutif</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab("feed")}
              aria-current={activeTab === "feed" ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-medium transition-colors ${
                activeTab === "feed"
                  ? "border-[#0284C7] text-sky-300"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <Table2 className="h-4 w-4" aria-hidden="true" />
              <span>Tabel Kurasi &amp; Verifikasi</span>
              <span
                className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums ${
                  pendingCount > 0
                    ? "border-amber-800 bg-amber-950 text-amber-300"
                    : "border-slate-700 bg-slate-800 text-slate-300"
                }`}
              >
                {pendingCount} Pending
              </span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab("export")}
              aria-current={activeTab === "export" ? "page" : undefined}
              className={`flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-xs font-medium transition-colors ${
                activeTab === "export"
                  ? "border-[#0284C7] text-sky-300"
                  : "border-transparent text-slate-400 hover:text-slate-200"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              <span>Pusat Ekspor Diseminasi</span>
            </button>
          </nav>

          <div className="hidden items-center gap-2 font-mono text-xs text-slate-400 sm:flex">
            <span>Kompilasi:</span>
            <span className="rounded border border-slate-700 bg-[#131B2B] px-2 py-0.5 font-semibold text-slate-100 tabular-nums">
              {quarter} {year}
            </span>
          </div>
        </div>
      </header>
    </>
  );
}

