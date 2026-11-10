"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import {
  CommandHeader,
  MobileNavDrawer,
  WorkspaceSidebar,
  type WorkspaceTab,
} from "./dashboard/command-header";
import { OverviewPanel } from "./dashboard/overview-panel";
import {
  CurationTable,
  type TableFilterState,
} from "./phenomena/curation-table";
import { ReviewModal } from "./phenomena/review-modal";
import { ExportCenter } from "./export/export-center";
import type {
  AuthenticatedUser,
  DashboardStatsPayload,
  ExpenditureCode,
  KbliCode,
  PeriodQuarter,
  SerializedPhenomenon,
} from "@/types/client";

interface SipenaWorkspaceProps {
  user: AuthenticatedUser;
  initialStats: DashboardStatsPayload;
}

export function SipenaWorkspace({ user, initialStats }: SipenaWorkspaceProps) {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<WorkspaceTab>("dashboard");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [quarter, setQuarter] = useState<PeriodQuarter>(initialStats.quarter);
  const [year, setYear] = useState<number>(initialStats.year);
  const [stats, setStats] = useState<DashboardStatsPayload>(initialStats);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const [filters, setFilters] = useState<TableFilterState>({
    status: "",
    kbliCategory: "",
    expenditureComponent: "",
    source: "",
    search: "",
  });

  const [activeReviewItem, setActiveReviewItem] =
    useState<SerializedPhenomenon | null>(null);
  const [isCrawling, setIsCrawling] = useState(false);
  const [toast, setToast] = useState<{
    message: string;
    tone: "success" | "error";
  } | null>(null);

  const showToast = useCallback(
    (message: string, tone: "success" | "error" = "success") => {
      setToast({ message, tone });
    },
    []
  );

  useEffect(() => {
    if (!toast || toast.tone === "error") return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const reloadStats = useCallback(
    async (targetQuarter: PeriodQuarter, targetYear: number) => {
      try {
        const res = await fetch(
          `/api/stats?quarter=${targetQuarter}&year=${targetYear}`,
          { cache: "no-store" }
        );
        if (res.status === 401) {
          router.push("/login");
          return;
        }
        if (res.ok) {
          const nextStats = (await res.json()) as DashboardStatsPayload;
          setStats(nextStats);
        }
      } catch {
        // Keep current state silently on transient network drops
      }
    },
    [router]
  );

  function handleChangePeriod(nextQuarter: PeriodQuarter, nextYear: number) {
    setQuarter(nextQuarter);
    setYear(nextYear);
    const params = new URLSearchParams(window.location.search);
    params.set("quarter", nextQuarter);
    params.set("year", String(nextYear));
    window.history.replaceState(null, "", `?${params.toString()}`);
    void reloadStats(nextQuarter, nextYear);
    setRefreshTrigger((n) => n + 1);
  }

  async function handleTriggerCrawl() {
    if (isCrawling) return;
    setIsCrawling(true);
    try {
      const ingestRes = await fetch("/api/cron/ingest", { method: "POST" });
      const ingestJson = (await ingestRes.json().catch(() => null)) as
        | { inserted?: number; total_fetched?: number; error?: string }
        | null;

      if (!ingestRes.ok) {
        showToast(
          ingestJson?.error ?? "Gagal menjalankan penarikan berita regional.",
          "error"
        );
        return;
      }

      const extractRes = await fetch("/api/cron/extract", { method: "POST" });
      const extractJson = (await extractRes.json().catch(() => null)) as
        | { processed?: number; failed?: number; error?: string; warning?: string }
        | null;

      await reloadStats(quarter, year);
      setRefreshTrigger((n) => n + 1);

      if (!extractRes.ok) {
        showToast(
          `${ingestJson?.inserted ?? 0} artikel baru ditarik, namun ekstraksi AI membutuhkan konfigurasi API key: ${extractJson?.error ?? "Periksa log."}`,
          "error"
        );
        return;
      }

      showToast(
        `Selesai: +${ingestJson?.inserted ?? 0} artikel baru ditarik, ${extractJson?.processed ?? 0} artikel diproses Gemini Flash.`,
        "success"
      );
    } catch {
      showToast("Gagal menghubungi endpoint scraper.", "error");
    } finally {
      setIsCrawling(false);
    }
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    router.push("/login");
    router.refresh();
  }

  function jumpToFeedWithFilter(patch: Partial<TableFilterState>) {
    setFilters({
      status: patch.status ?? "",
      kbliCategory: patch.kbliCategory ?? "",
      expenditureComponent: patch.expenditureComponent ?? "",
      source: patch.source ?? "",
      search: patch.search ?? "",
    });
    setActiveTab("feed");
  }

  const handleDataMutated = useCallback(
    (message: string, tone: "success" | "error" = "success") => {
      showToast(message, tone);
      if (tone === "success") {
        setActiveReviewItem(null);
        setRefreshTrigger((n) => n + 1);
        void reloadStats(quarter, year);
      }
    },
    [showToast, reloadStats, quarter, year]
  );

  const handleOpenReview = useCallback((item: SerializedPhenomenon) => {
    setActiveReviewItem(item);
  }, []);

  return (
    <div className="flex min-h-screen bg-[var(--bg-canvas)] text-[var(--text-primary)]">
      <a
        href="#workspace-main"
        className="visually-hidden fixed left-3 top-3 z-50 rounded-md bg-[var(--accent-primary)] px-3 py-2 text-xs font-semibold text-white shadow-elevated"
      >
        Lewati navigasi ke konten utama
      </a>

      {/* Persistent Desktop Navigation Rail */}
      <WorkspaceSidebar
        user={user}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        quarter={quarter}
        year={year}
        pendingCount={stats.pendingCount}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((c) => !c)}
        onLogout={() => void handleLogout()}
      />

      {/* Top-Layer Mobile Navigation Drawer */}
      <MobileNavDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        user={user}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        quarter={quarter}
        year={year}
        pendingCount={stats.pendingCount}
        onLogout={() => void handleLogout()}
      />

      {/* Right Column: Command Header + Workspace Content + Footer */}
      <div className="flex min-w-0 flex-1 flex-col">
        <CommandHeader
          user={user}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
          quarter={quarter}
          year={year}
          onChangePeriod={handleChangePeriod}
          unprocessedArticlesCount={stats.unprocessedArticlesCount}
          latestIngestedAt={stats.latestIngestedAt}
          isCrawling={isCrawling}
          onTriggerCrawl={() => void handleTriggerCrawl()}
        />

        {/* Operational Notification Alert */}
        {toast && (
          <div className="mx-auto mt-4 w-full max-w-[1440px] px-4 lg:px-6">
            <div
              role={toast.tone === "error" ? "alert" : "status"}
              aria-live={toast.tone === "error" ? "assertive" : "polite"}
              className={`flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-xs font-medium shadow-card ${
                toast.tone === "error"
                  ? "border-rose-300 bg-rose-50 text-rose-900 dark:border-rose-800/80 dark:bg-rose-950/75 dark:text-rose-100"
                  : "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800/80 dark:bg-emerald-950/75 dark:text-emerald-100"
              }`}
            >
              <div className="flex items-center gap-2.5">
                {toast.tone === "error" ? (
                  <AlertCircle
                    className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400"
                    aria-hidden="true"
                  />
                ) : (
                  <CheckCircle2
                    className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                    aria-hidden="true"
                  />
                )}
                <span>{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                aria-label="Tutup notifikasi"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md hover:bg-black/10 dark:hover:bg-white/10 sm:h-7 sm:w-7"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}

        {/* Active Module Viewport */}
        <main
          id="workspace-main"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1440px] flex-1 p-4 focus:outline-none lg:p-6"
        >
          {activeTab === "dashboard" && (
            <OverviewPanel
              stats={stats}
              onInspectPending={() =>
                jumpToFeedWithFilter({ status: "pending" })
              }
              onOpenExport={() => setActiveTab("export")}
              onSelectKbli={(code: KbliCode) =>
                jumpToFeedWithFilter({ kbliCategory: code })
              }
              onSelectExpenditure={(code: ExpenditureCode) =>
                jumpToFeedWithFilter({ expenditureComponent: code })
              }
              onOpenFeed={() => setActiveTab("feed")}
              onOpenReview={handleOpenReview}
            />
          )}

          {activeTab === "feed" && (
            <CurationTable
              user={user}
              quarter={quarter}
              year={year}
              filters={filters}
              onChangeFilters={setFilters}
              refreshTrigger={refreshTrigger}
              onOpenReview={handleOpenReview}
              onDataMutated={handleDataMutated}
            />
          )}

          {activeTab === "export" && (
            <ExportCenter
              initialQuarter={quarter}
              initialYear={year}
              onNotify={showToast}
            />
          )}
        </main>

        {/* Native Top-Layer Side-by-Side Review Drawer */}
        <ReviewModal
          phenomenon={activeReviewItem}
          user={user}
          onClose={() => setActiveReviewItem(null)}
          onSaved={(msg) => handleDataMutated(msg, "success")}
          onError={(msg) => showToast(msg, "error")}
        />

        <footer className="flex min-h-[42px] flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-surface)] px-4 py-2 font-mono text-[11px] text-[var(--text-muted)] lg:px-6">
          <span>BPS Kabupaten Tana Tidung (65.04) &middot; Tim Nerwilis</span>
          <span>SIPENA-KTT v1.0</span>
        </footer>
      </div>
    </div>
  );
}
