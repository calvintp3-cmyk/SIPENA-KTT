"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { CommandHeader, type WorkspaceTab } from "./dashboard/command-header";
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

  // Auto-dismiss non-error feedback after 5 seconds
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
        // Keep current view and avoid noisy crashes
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
    <div className="flex min-h-screen flex-col bg-[#080C14]">
      <CommandHeader
        user={user}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        quarter={quarter}
        year={year}
        onChangePeriod={handleChangePeriod}
        pendingCount={stats.pendingCount}
        unprocessedArticlesCount={stats.unprocessedArticlesCount}
        latestIngestedAt={stats.latestIngestedAt}
        isCrawling={isCrawling}
        onTriggerCrawl={() => void handleTriggerCrawl()}
        onLogout={() => void handleLogout()}
      />

      {/* Notification Banner */}
      {toast && (
        <div className="mx-auto mt-3 w-full max-w-7xl px-4 lg:px-6">
          <div
            role={toast.tone === "error" ? "alert" : "status"}
            aria-live={toast.tone === "error" ? "assertive" : "polite"}
            className={`flex items-center justify-between gap-3 rounded-md border px-4 py-2.5 text-xs ${
              toast.tone === "error"
                ? "border-rose-800 bg-rose-950/70 text-rose-100"
                : "border-emerald-800 bg-emerald-950/70 text-emerald-100"
            }`}
          >
            <div className="flex items-center gap-2">
              {toast.tone === "error" ? (
                <AlertCircle
                  className="h-4 w-4 shrink-0 text-rose-400"
                  aria-hidden="true"
                />
              ) : (
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-emerald-400"
                  aria-hidden="true"
                />
              )}
              <span>{toast.message}</span>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              aria-label="Tutup notifikasi"
              className="rounded p-0.5 text-slate-300 hover:bg-black/20 hover:text-white"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main
        id="workspace-main"
        tabIndex={-1}
        className="mx-auto w-full max-w-7xl flex-1 p-4 focus:outline-none lg:p-6"
      >
        <h1 className="visually-hidden">
          SIPENA-KTT Workstation —{" "}
          {activeTab === "dashboard"
            ? "Ringkasan Eksekutif"
            : activeTab === "feed"
              ? "Tabel Kurasi dan Verifikasi"
              : "Pusat Ekspor Diseminasi"}
        </h1>

        {activeTab === "dashboard" && (
          <OverviewPanel
            stats={stats}
            onInspectPending={() => jumpToFeedWithFilter({ status: "pending" })}
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

      {/* Side-by-Side Native Top-Layer Review Drawer */}
      <ReviewModal
        phenomenon={activeReviewItem}
        user={user}
        onClose={() => setActiveReviewItem(null)}
        onSaved={(msg) => handleDataMutated(msg, "success")}
        onError={(msg) => showToast(msg, "error")}
      />

      <footer className="flex h-10 items-center justify-between border-t border-slate-800 bg-[#0D131F] px-4 font-mono text-[11px] text-slate-400 lg:px-6">
        <span>BPS Kabupaten Tana Tidung (65.04)</span>
        <span>SIPENA-KTT v1.0</span>
      </footer>
    </div>
  );
}

