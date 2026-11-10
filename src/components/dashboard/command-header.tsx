"use client";

import { useEffect, useRef } from "react";
import {
  ChevronRight,
  Clock,
  Download,
  FileSpreadsheet,
  LayoutDashboard,
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  Table2,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-provider";
import { formatIndonesianDate } from "@/lib/utils";
import type { AuthenticatedUser, PeriodQuarter } from "@/types/client";

export type WorkspaceTab = "dashboard" | "feed" | "export";

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

const TAB_TITLES: Record<WorkspaceTab, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Ringkasan Eksekutif",
    subtitle: "Cakupan sektoral 17 KBLI, transmisi pengeluaran, dan antrean telaah prioritas.",
  },
  feed: {
    title: "Tabel Kurasi & Verifikasi",
    subtitle: "Penelaahan berita regional Kaltara, klasifikasi KBLI, dan audit keputusan analis.",
  },
  export: {
    title: "Pusat Ekspor Diseminasi",
    subtitle: "Penyusunan kertas kerja Excel tiga sheet standar forum rekonsiliasi PDRB.",
  },
};

interface WorkspaceSidebarProps {
  user: AuthenticatedUser;
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  quarter: PeriodQuarter;
  year: number;
  pendingCount: number;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onLogout: () => void;
}

function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "SP"
  );
}

export function WorkspaceSidebar({
  user,
  activeTab,
  onSelectTab,
  quarter,
  year,
  pendingCount,
  isCollapsed,
  onToggleCollapse,
  onLogout,
}: WorkspaceSidebarProps) {
  const initials = getInitials(user.name);

  const navItems: Array<{
    id: WorkspaceTab;
    label: string;
    icon: typeof LayoutDashboard;
    badge?: number;
  }> = [
    { id: "dashboard", label: "Ringkasan Eksekutif", icon: LayoutDashboard },
    {
      id: "feed",
      label: "Tabel Kurasi",
      icon: Table2,
      badge: pendingCount,
    },
    { id: "export", label: "Ekspor Excel", icon: FileSpreadsheet },
  ];

  return (
    <aside
      aria-label="Navigasi Utama Workstation"
      className={`hidden shrink-0 flex-col justify-between border-r border-[var(--border-rail)] bg-[var(--bg-rail)] text-[var(--text-rail)] transition-[width] duration-150 lg:sticky lg:top-0 lg:flex lg:h-screen ${
        isCollapsed ? "w-[74px]" : "w-64"
      }`}
    >
      {/* Top: Brand + Collapse Switch */}
      <div>
        <div
          className={`flex h-16 items-center border-b border-[var(--border-rail)] px-3.5 ${
            isCollapsed ? "justify-center" : "justify-between"
          }`}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <BrandMark size="sm" tone="navy" />
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="truncate text-sm font-bold tracking-tight text-white">
                  SIPENA-KTT
                </div>
                <div className="truncate font-mono text-[10px] text-sky-300">
                  BPS KAB. 65.04
                </div>
              </div>
            )}
          </div>

          {!isCollapsed && (
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Ciutkan panel navigasi samping"
              aria-expanded={!isCollapsed}
              title="Ciutkan sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-rail-muted)] transition-colors hover:bg-[var(--bg-rail-hover)] hover:text-white"
            >
              <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {isCollapsed && (
          <div className="flex justify-center border-b border-[var(--border-rail)] py-2">
            <button
              type="button"
              onClick={onToggleCollapse}
              aria-label="Bentangkan panel navigasi samping"
              aria-expanded={!isCollapsed}
              title="Bentangkan sidebar"
              className="flex h-8 w-8 items-center justify-center rounded-md text-[var(--text-rail-muted)] transition-colors hover:bg-[var(--bg-rail-hover)] hover:text-white"
            >
              <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        {/* Active Period Scope Marker */}
        {!isCollapsed && (
          <div className="mx-3 mt-4 rounded-lg border border-[var(--border-rail)] bg-[var(--bg-rail-hover)]/60 px-3 py-2.5">
            <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-rail-muted)]">
              Periode Kompilasi
            </div>
            <div className="mt-0.5 flex items-baseline justify-between font-mono text-xs font-semibold text-white">
              <span>{QUARTER_LABELS[quarter]}</span>
              <span className="tabular-nums text-sky-300">{year}</span>
            </div>
          </div>
        )}

        {/* Navigation Links */}
        <nav aria-label="Modul Workstation" className="mt-4 space-y-1 px-2.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={active ? "page" : undefined}
                title={isCollapsed ? item.label : undefined}
                className={`group relative flex min-h-[42px] w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                  isCollapsed ? "justify-center px-2" : "justify-between"
                } ${
                  active
                    ? "bg-[var(--bg-rail-active)] text-white"
                    : "text-[var(--text-rail-muted)] hover:bg-[var(--bg-rail-hover)] hover:text-white"
                }`}
              >
                <span className="flex min-w-0 items-center gap-3">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      active ? "text-sky-300" : "text-[var(--text-rail-muted)] group-hover:text-white"
                    }`}
                    aria-hidden="true"
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </span>

                {!isCollapsed && item.badge !== undefined && (
                  <span
                    className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold tabular-nums ${
                      item.badge > 0
                        ? "bg-amber-400/20 text-amber-200 ring-1 ring-inset ring-amber-400/40"
                        : "bg-white/10 text-[var(--text-rail-muted)]"
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom: Operator Account + Logout */}
      <div className="border-t border-[var(--border-rail)] p-3">
        <div
          className={`flex items-center gap-2.5 ${
            isCollapsed ? "flex-col justify-center gap-2" : "justify-between"
          }`}
        >
          <div className="flex min-w-0 items-center gap-2.5">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-sky-400/30 bg-[var(--bg-rail-hover)] font-mono text-xs font-semibold text-sky-200"
              title={`${user.name} (${user.email})`}
            >
              {initials}
            </div>
            {!isCollapsed && (
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-white">
                  {user.name}
                </div>
                <div className="truncate font-mono text-[10px] text-[var(--text-rail-muted)]">
                  {ROLE_LABELS[user.role]}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onLogout}
            aria-label="Keluar dari akun"
            title="Keluar sesi"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[var(--border-rail)] bg-[var(--bg-rail-hover)]/70 text-[var(--text-rail-muted)] transition-colors hover:bg-rose-950/60 hover:text-rose-200"
          >
            <LogOut className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </aside>
  );
}

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  user: AuthenticatedUser;
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  quarter: PeriodQuarter;
  year: number;
  pendingCount: number;
  onLogout: () => void;
}

export function MobileNavDrawer({
  open,
  onClose,
  user,
  activeTab,
  onSelectTab,
  quarter,
  year,
  pendingCount,
  onLogout,
}: MobileNavDrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOutsideRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => {
      dialog.returnValue = "";
      onClose();
    };
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  function isPointerOutsideDialog(
    e: React.PointerEvent<HTMLDialogElement>,
    dialog: HTMLDialogElement
  ) {
    const r = dialog.getBoundingClientRect();
    return (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    );
  }

  function pickTab(tab: WorkspaceTab) {
    onSelectTab(tab);
    onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="mobile-drawer-title"
      onPointerDown={(e) => {
        if (dialogRef.current) {
          pressedOutsideRef.current = isPointerOutsideDialog(e, dialogRef.current);
        }
      }}
      onPointerUp={(e) => {
        if (
          pressedOutsideRef.current &&
          dialogRef.current &&
          isPointerOutsideDialog(e, dialogRef.current)
        ) {
          dialogRef.current.close();
        }
        pressedOutsideRef.current = false;
      }}
      className="my-0 ml-0 mr-auto h-screen max-h-screen w-72 max-w-[85vw] border-r border-[var(--border-rail)] bg-[var(--bg-rail)] p-0 text-[var(--text-rail)] shadow-elevated open:flex open:flex-col open:justify-between"
    >
      <div>
        <div className="flex h-16 items-center justify-between border-b border-[var(--border-rail)] px-4">
          <div className="flex items-center gap-2.5">
            <BrandMark size="sm" tone="navy" />
            <div>
              <h2
                id="mobile-drawer-title"
                className="text-sm font-bold tracking-tight text-white"
              >
                SIPENA-KTT
              </h2>
              <span className="block font-mono text-[10px] text-sky-300">
                BPS Kab. Tana Tidung (65.04)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Tutup menu navigasi"
            className="flex h-11 w-11 items-center justify-center rounded-lg text-[var(--text-rail-muted)] hover:bg-[var(--bg-rail-hover)] hover:text-white"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mx-3 mt-4 rounded-lg border border-[var(--border-rail)] bg-[var(--bg-rail-hover)]/60 px-3 py-2.5">
          <div className="text-[10px] font-medium uppercase tracking-wider text-[var(--text-rail-muted)]">
            Periode Aktif
          </div>
          <div className="mt-0.5 font-mono text-xs font-semibold text-white tabular-nums">
            {QUARTER_LABELS[quarter]} {year}
          </div>
        </div>

        <nav aria-label="Menu Modul Seluler" className="mt-4 space-y-1 px-3">
          <button
            type="button"
            onClick={() => pickTab("dashboard")}
            aria-current={activeTab === "dashboard" ? "page" : undefined}
            className={`flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium ${
              activeTab === "dashboard"
                ? "bg-[var(--bg-rail-active)] text-white"
                : "text-[var(--text-rail-muted)] hover:bg-[var(--bg-rail-hover)] hover:text-white"
            }`}
          >
            <LayoutDashboard className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Ringkasan Eksekutif</span>
          </button>

          <button
            type="button"
            onClick={() => pickTab("feed")}
            aria-current={activeTab === "feed" ? "page" : undefined}
            className={`flex min-h-[44px] w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium ${
              activeTab === "feed"
                ? "bg-[var(--bg-rail-active)] text-white"
                : "text-[var(--text-rail-muted)] hover:bg-[var(--bg-rail-hover)] hover:text-white"
            }`}
          >
            <span className="flex items-center gap-3">
              <Table2 className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Tabel Kurasi</span>
            </span>
            <span className="rounded bg-amber-400/20 px-2 py-0.5 font-mono text-xs font-semibold text-amber-200 tabular-nums">
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => pickTab("export")}
            aria-current={activeTab === "export" ? "page" : undefined}
            className={`flex min-h-[44px] w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium ${
              activeTab === "export"
                ? "bg-[var(--bg-rail-active)] text-white"
                : "text-[var(--text-rail-muted)] hover:bg-[var(--bg-rail-hover)] hover:text-white"
            }`}
          >
            <FileSpreadsheet className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Pusat Ekspor Excel</span>
          </button>
        </nav>
      </div>

      <div className="border-t border-[var(--border-rail)] p-4">
        <div className="mb-3 flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-400/30 bg-[var(--bg-rail-hover)] font-mono text-xs font-semibold text-sky-200">
            {getInitials(user.name)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-xs font-semibold text-white">
              {user.name}
            </div>
            <div className="truncate font-mono text-[10px] text-[var(--text-rail-muted)]">
              {ROLE_LABELS[user.role]}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            onClose();
            onLogout();
          }}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg border border-[var(--border-rail)] bg-[var(--bg-rail-hover)] px-3 py-2 text-xs font-semibold text-rose-200 hover:bg-rose-950/70"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          <span>Keluar dari Sesi</span>
        </button>
      </div>
    </dialog>
  );
}

interface CommandHeaderProps {
  user: AuthenticatedUser;
  activeTab: WorkspaceTab;
  onSelectTab: (tab: WorkspaceTab) => void;
  onOpenMobileMenu: () => void;
  quarter: PeriodQuarter;
  year: number;
  onChangePeriod: (quarter: PeriodQuarter, year: number) => void;
  unprocessedArticlesCount: number;
  latestIngestedAt: string | null;
  isCrawling: boolean;
  onTriggerCrawl: () => void;
}

export function CommandHeader({
  user,
  activeTab,
  onSelectTab,
  onOpenMobileMenu,
  quarter,
  year,
  onChangePeriod,
  unprocessedArticlesCount,
  latestIngestedAt,
  isCrawling,
  onTriggerCrawl,
}: CommandHeaderProps) {
  const canOperate = user.role === "admin" || user.role === "editor";
  const currentView = TAB_TITLES[activeTab];

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      <div className="flex min-h-16 flex-wrap items-center justify-between gap-3 px-4 py-2.5 lg:px-6">
        {/* Left: Mobile Drawer Button + Breadcrumb View Identity */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Buka menu navigasi utama"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] hover:bg-[var(--bg-hover)] lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--text-muted)]">
              <span>Kalimantan Utara</span>
              <ChevronRight className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate font-mono text-[var(--text-secondary)]">
                Kab. Tana Tidung 65.04
              </span>
              <ChevronRight className="hidden h-3 w-3 shrink-0 sm:inline" aria-hidden="true" />
              <span className="hidden font-mono font-semibold text-[var(--accent-text)] sm:inline tabular-nums">
                {quarter} {year}
              </span>
            </div>
            <h1 className="truncate text-base font-bold tracking-tight text-[var(--text-primary)] sm:text-lg">
              {currentView.title}
            </h1>
          </div>
        </div>

        {/* Right: Operational Status, Period Switcher, Theme Switch, & Primary Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Scraper Freshness Telemetry */}
          <div className="hidden items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-3 py-1.5 font-mono text-[11px] text-[var(--text-secondary)] xl:flex">
            <Clock className="h-3.5 w-3.5 text-[var(--text-muted)]" aria-hidden="true" />
            <span>
              {latestIngestedAt
                ? `Tarik: ${formatIndonesianDate(latestIngestedAt)}`
                : "Belum ada penarikan"}
            </span>
            {unprocessedArticlesCount > 0 && (
              <>
                <span className="text-[var(--border-strong)]">/</span>
                <span className="font-semibold text-amber-700 dark:text-amber-300 tabular-nums">
                  {unprocessedArticlesCount} antre AI
                </span>
              </>
            )}
          </div>

          {/* Period Quarter & Year Selector */}
          <div className="flex min-h-[44px] items-center gap-1 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-2.5 py-1 font-mono text-xs sm:min-h-[36px]">
            <label htmlFor="period-quarter" className="visually-hidden">
              Triwulan Kompilasi
            </label>
            <select
              id="period-quarter"
              value={quarter}
              onChange={(e) =>
                onChangePeriod(e.target.value as PeriodQuarter, year)
              }
              className="min-h-[38px] bg-transparent py-0.5 font-semibold text-[var(--text-primary)] focus:outline-none sm:min-h-0"
            >
              <option value="Q1" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                Q1 (Jan-Mar)
              </option>
              <option value="Q2" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                Q2 (Apr-Jun)
              </option>
              <option value="Q3" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                Q3 (Jul-Sep)
              </option>
              <option value="Q4" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                Q4 (Okt-Des)
              </option>
            </select>

            <span className="text-[var(--text-muted)]" aria-hidden="true">
              /
            </span>

            <label htmlFor="period-year" className="visually-hidden">
              Tahun Neraca
            </label>
            <select
              id="period-year"
              value={year}
              onChange={(e) =>
                onChangePeriod(quarter, Number(e.target.value))
              }
              className="min-h-[38px] bg-transparent py-0.5 font-semibold text-[var(--text-primary)] tabular-nums focus:outline-none sm:min-h-0"
            >
              <option value={2024} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                2024
              </option>
              <option value={2025} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                2025
              </option>
              <option value={2026} className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                2026
              </option>
            </select>
          </div>

          <ThemeToggle />

          {canOperate && (
            <button
              type="button"
              onClick={onTriggerCrawl}
              disabled={isCrawling}
              title="Jalankan scraper berita Kaltara dan ekstraksi fenomena"
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-60 sm:min-h-[36px]"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-[var(--accent-text)] ${isCrawling ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">
                {isCrawling ? "Menarik Berita..." : "Ambil Berita"}
              </span>
            </button>
          )}

          {activeTab !== "export" && (
            <button
              type="button"
              onClick={() => onSelectTab("export")}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-[var(--accent-primary)] px-3.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--accent-primary-hover)] sm:min-h-[36px]"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Ekspor .xlsx</span>
            </button>
          )}
        </div>
      </div>

      {/* Subtitle Context Ribbon on Mobile / Small Tablets */}
      <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-4 py-1.5 text-[11px] text-[var(--text-muted)] lg:px-6">
        {currentView.subtitle}
      </div>
    </header>
  );
}
