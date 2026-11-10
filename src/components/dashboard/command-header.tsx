"use client";

import { useEffect, useRef } from "react";
import {
  BarChart3,
  FileSpreadsheet,
  Inbox,
  LogOut,
  Menu,
  RefreshCw,
  X,
} from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-provider";
import type { AuthenticatedUser, PeriodQuarter } from "@/types/client";

export type WorkspaceTab = "feed" | "overview" | "export";

const QUARTER_LABELS: Record<PeriodQuarter, string> = {
  Q1: "Triwulan I",
  Q2: "Triwulan II",
  Q3: "Triwulan III",
  Q4: "Triwulan IV",
};

const ROLE_LABELS: Record<AuthenticatedUser["role"], string> = {
  admin: "Admin Nerwilis",
  editor: "Analis PDRB",
  viewer: "Viewer",
};

function getInitials(name: string) {
  return (
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("") || "SP"
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
      className="my-0 ml-0 mr-auto h-screen max-h-screen w-80 max-w-[85vw] rounded-r-2xl border-r border-[var(--border-hairline)] bg-[var(--bg-surface)] p-0 text-[var(--text-primary)] shadow-floating open:flex open:flex-col open:justify-between"
    >
      <div>
        <div className="flex h-16 items-center justify-between border-b border-[var(--border-hairline)] px-4">
          <div className="flex items-center gap-2.5">
            <BrandMark size="sm" tone="emerald" />
            <div>
              <h2
                id="mobile-drawer-title"
                className="text-sm font-bold tracking-tight text-[var(--text-primary)]"
              >
                SIPENA-KTT
              </h2>
              <span className="block text-xs text-[var(--text-muted)]">
                BPS Kab. Tana Tidung (65.04)
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            aria-label="Tutup menu navigasi"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-[var(--text-muted)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mx-4 mt-4 rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 py-2.5">
          <div className="text-[11px] font-medium text-[var(--text-muted)]">
            Periode Aktif
          </div>
          <div className="mt-0.5 text-sm font-semibold text-[var(--text-primary)] tabular-nums">
            {QUARTER_LABELS[quarter]} {year}
          </div>
        </div>

        <nav aria-label="Menu Modul Seluler" className="mt-4 space-y-1 px-3">
          <button
            type="button"
            onClick={() => pickTab("feed")}
            aria-current={activeTab === "feed" ? "page" : undefined}
            className={`flex min-h-[44px] w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
              activeTab === "feed"
                ? "bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            }`}
          >
            <span className="flex items-center gap-3">
              <Inbox className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>Meja Kurasi</span>
            </span>
            <span className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 tabular-nums dark:border-amber-800/70 dark:bg-amber-950/70 dark:text-amber-200">
              {pendingCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => pickTab("overview")}
            aria-current={activeTab === "overview" ? "page" : undefined}
            className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
              activeTab === "overview"
                ? "bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            }`}
          >
            <BarChart3 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Ringkasan Analitik</span>
          </button>

          <button
            type="button"
            onClick={() => pickTab("export")}
            aria-current={activeTab === "export" ? "page" : undefined}
            className={`flex min-h-[44px] w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-sm font-medium transition-colors ${
              activeTab === "export"
                ? "bg-emerald-50 font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200"
                : "text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            }`}
          >
            <FileSpreadsheet className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Pusat Ekspor Excel</span>
          </button>
        </nav>
      </div>

      <div className="border-t border-[var(--border-hairline)] p-4">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200">
            {getInitials(user.name)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[var(--text-primary)]">
              {user.name}
            </div>
            <div className="truncate text-xs text-[var(--text-muted)]">
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
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800 transition-colors hover:bg-rose-100 dark:border-rose-800/70 dark:bg-rose-950/60 dark:text-rose-200"
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
  pendingCount: number;
  unprocessedArticlesCount: number;
  latestIngestedAt: string | null;
  isCrawling: boolean;
  onTriggerCrawl: () => void;
  onLogout: () => void;
}

export function CommandHeader({
  user,
  activeTab,
  onSelectTab,
  onOpenMobileMenu,
  quarter,
  year,
  onChangePeriod,
  pendingCount,
  isCrawling,
  onTriggerCrawl,
  onLogout,
}: CommandHeaderProps) {
  const canOperate = user.role === "admin" || user.role === "editor";
  const initials = getInitials(user.name);

  const navTabs: Array<{
    id: WorkspaceTab;
    label: string;
    icon: typeof Inbox;
    badge?: number;
  }> = [
    {
      id: "feed",
      label: "Meja Kurasi",
      icon: Inbox,
      badge: pendingCount,
    },
    {
      id: "overview",
      label: "Ringkasan Analitik",
      icon: BarChart3,
    },
    {
      id: "export",
      label: "Pusat Ekspor Excel",
      icon: FileSpreadsheet,
    },
  ];

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border-hairline)] bg-[var(--bg-surface)]/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Left: Mobile Trigger + Brand Identity */}
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={onOpenMobileMenu}
            aria-label="Buka menu navigasi"
            className="btn-secondary flex h-10 w-10 shrink-0 items-center justify-center rounded-xl lg:hidden"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <button
            type="button"
            onClick={() => onSelectTab("feed")}
            className="flex min-w-0 items-center gap-2.5 text-left"
          >
            <BrandMark size="sm" tone="emerald" />
            <div className="flex items-center gap-2">
              <span className="truncate text-[15px] font-bold tracking-tight text-[var(--text-primary)]">
                SIPENA-KTT
              </span>
              <span className="hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2 py-0.5 font-mono text-[11px] font-medium text-[var(--text-muted)] sm:inline-block">
                65.04
              </span>
            </div>
          </button>
        </div>

        {/* Center: Primary Top Horizontal Navigation Tabs */}
        <nav
          aria-label="Navigasi Utama"
          className="hidden h-full items-center gap-1 lg:flex"
        >
          {navTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectTab(tab.id)}
                aria-current={active ? "page" : undefined}
                className={`relative flex h-full items-center px-1 text-sm transition-colors ${
                  active
                    ? "font-semibold text-emerald-800 dark:text-emerald-300"
                    : "font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                }`}
              >
                <span
                  className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 transition-colors ${
                    active
                      ? "bg-emerald-50/90 dark:bg-emerald-950/50"
                      : "hover:bg-[var(--bg-subtle)]"
                  }`}
                >
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      active
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-[var(--text-muted)]"
                    }`}
                    aria-hidden="true"
                  />
                  <span>{tab.label}</span>
                  {tab.badge !== undefined && (
                    <span
                      className={`rounded-lg px-2 py-0.5 text-xs font-semibold tabular-nums ${
                        tab.badge > 0
                          ? "border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/70 dark:text-amber-200"
                          : "bg-[var(--bg-subtle)] text-[var(--text-muted)]"
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </span>

                {active && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-3 bottom-0 h-[2px] rounded-full bg-emerald-600 dark:bg-emerald-400"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Right: Period Selector, Primary Obsidian CTA, Theme Switch & Operator Profile */}
        <div className="flex items-center gap-2">
          {/* Period Quarter & Year Selector */}
          <div className="flex h-9 items-center gap-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-2.5 text-xs shadow-xs">
            <label htmlFor="period-quarter" className="visually-hidden">
              Triwulan Kompilasi
            </label>
            <select
              id="period-quarter"
              value={quarter}
              onChange={(e) =>
                onChangePeriod(e.target.value as PeriodQuarter, year)
              }
              className="bg-transparent font-semibold text-[var(--text-primary)] focus:outline-none"
            >
              <option value="Q1" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                Q1
              </option>
              <option value="Q2" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                Q2
              </option>
              <option value="Q3" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                Q3
              </option>
              <option value="Q4" className="bg-[var(--bg-surface)] text-[var(--text-primary)]">
                Q4
              </option>
            </select>

            <span className="text-[var(--border-input)]" aria-hidden="true">
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
              className="bg-transparent font-semibold text-[var(--text-primary)] tabular-nums focus:outline-none"
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

          {canOperate && (
            <button
              type="button"
              onClick={onTriggerCrawl}
              disabled={isCrawling}
              title="Tarik berita ekonomi Kaltara terbaru dan ekstraksi otomatis"
              className="btn-obsidian inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-xs font-semibold disabled:opacity-60"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isCrawling ? "animate-spin" : ""}`}
                aria-hidden="true"
              />
              <span className="hidden sm:inline">
                {isCrawling ? "Menarik..." : "Tarik Berita"}
              </span>
            </button>
          )}

          <ThemeToggle compact />

          {/* Operator Profile & Quick Logout */}
          <div className="hidden items-center gap-2 border-l border-[var(--border-hairline)] pl-2.5 lg:flex">
            <div
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-xs font-bold text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-200"
              title={`${user.name} (${user.email})`}
            >
              {initials}
            </div>
            <div className="hidden min-w-0 2xl:block">
              <div className="max-w-[120px] truncate text-xs font-semibold text-[var(--text-primary)]">
                {user.name}
              </div>
              <div className="text-[11px] text-[var(--text-muted)]">
                {ROLE_LABELS[user.role]}
              </div>
            </div>
            <button
              type="button"
              onClick={onLogout}
              aria-label="Keluar dari akun"
              title="Keluar sesi"
              className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/60 dark:hover:text-rose-300"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
