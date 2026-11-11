"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { MuseSidebar, type MuseViewTab } from "./muse-sidebar";
import { MuseNavbar } from "./muse-navbar";
import { OdonHeroSpotlight } from "./odon-hero-spotlight";
import { PdrbWeightsCard } from "./pdrb-weights-card";
import { PipelineTimeline } from "./pipeline-timeline";
import { SheetLedgerTable } from "./sheet-ledger-table";
import { CurationGrid } from "./curation-grid";
import { PublicNewsTabulation } from "./public-news-tabulation";
import { ProposalsModerationView } from "./proposals-moderation-view";
import { MethodologyView } from "./methodology-view";
import { KbliCrosswalkTable } from "./kbli-crosswalk-table";
import { ScrapersStatusView } from "./scrapers-status-view";
import { CurationModal, type CurationModalSavePayload } from "./curation-modal";
import { ProposalModal } from "./proposal-modal";
import { BlueprintModal } from "./blueprint-modal";
import { PDRB_KTT_WEIGHTS } from "@/lib/constants/taxonomy";
import type {
  OdonCandidateDto,
  OdonLedgerRowDto,
  OdonOverviewPayload,
} from "@/types/odon";
import type { ExpenditureCode, ImpactDirection, KbliCode } from "@/types/client";
import {
  Newspaper,
  Pickaxe,
  TrendingUp,
  Radio,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";

interface MuseWorkspaceProps {
  initialData: OdonOverviewPayload;
  hasAdminSession: boolean;
  initialRole?: "admin" | "public";
  sessionRole?: "admin" | "editor" | "viewer" | null;
  userName?: string | null;
}

type CurationEditTarget =
  | {
      kind: "odon_entry";
      id: string;
      title: string;
      kbliCategory: KbliCode;
      kbliCode2020: string;
      expenditureComponent: ExpenditureCode;
      impactType: ImpactDirection;
      summary: string;
      promoteOnSave: boolean;
    }
  | {
      kind: "phenomenon";
      id: string;
      title: string;
      kbliCategory: KbliCode;
      kbliCode2020: string;
      expenditureComponent: ExpenditureCode;
      impactType: ImpactDirection;
      summary: string;
      promoteOnSave: boolean;
    };

export function MuseWorkspace({
  initialData,
  hasAdminSession,
  initialRole = "public",
  sessionRole = null,
  userName = null,
}: MuseWorkspaceProps) {
  const router = useRouter();
  const [data, setData] = useState<OdonOverviewPayload>(initialData);
  const [currentTab, setCurrentTab] = useState<MuseViewTab>("overview");
  const [userRole, setUserRole] = useState<"admin" | "public">(
    hasAdminSession ? initialRole : "public"
  );

  // Modals & action busy states
  const [editTarget, setEditTarget] = useState<CurationEditTarget | null>(null);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);
  const [isScraperRunning, setIsScraperRunning] = useState(false);
  const [busyCandidateId, setBusyCandidateId] = useState<string | null>(null);
  const [busyProposalId, setBusyProposalId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "success" | "error"; message: string } | null>(
    null
  );

  const showToast = useCallback((kind: "success" | "error", message: string) => {
    setToast({ kind, message });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4800);
    return () => clearTimeout(timer);
  }, [toast]);

  const refreshOdon = useCallback(async () => {
    const res = await fetch("/api/odon", { cache: "no-store" });
    if (!res.ok) {
      throw new Error("Gagal memuat pembaruan data ODON dari server.");
    }
    const payload = (await res.json()) as OdonOverviewPayload;
    setData(payload);
  }, []);

  const isAdmin = userRole === "admin" && hasAdminSession;

  const handleRoleChange = async (nextRole: "admin" | "public") => {
    if (nextRole === "admin") {
      if (hasAdminSession) {
        setUserRole("admin");
        return;
      }
      if (sessionRole === "viewer") {
        await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
      }
      router.push("/login?next=/odon");
      return;
    }
    setUserRole("public");
    setCurrentTab("overview");
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" }).catch(() => undefined);
    router.push("/login?next=/odon");
    router.refresh();
  };

  const handleExportExcel = () => {
    if (!sessionRole) {
      router.push("/login?next=/odon");
      return;
    }
    window.location.assign("/api/export/odon");
    showToast("success", "Mengunduh Buku Kerja ODON Sheet 6503 (.xlsx) dari server...");
  };

  const handleApproveCandidate = async (cand: OdonCandidateDto) => {
    setBusyCandidateId(cand.id);
    try {
      let res: Response;
      if (cand.kind === "phenomenon") {
        res = await fetch("/api/odon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "from_phenomenon",
            phenomenonId: cand.id,
            kbliCategory: cand.kbliCategory,
            kbliCode2020: cand.kbliCode2020,
            expenditureComponent: cand.expenditureComponent,
            impactType: cand.impactType,
            economicPhenomenonSummary: cand.summary,
          }),
        });
      } else {
        res = await fetch(`/api/odon/${cand.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "verified" }),
        });
      }

      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        showToast("error", json?.error ?? "Gagal menetapkan kandidat ke Sheet 6503.");
        return;
      }

      await refreshOdon();
      showToast(
        "success",
        `"${cand.title.slice(0, 48)}..." resmi ditetapkan ke Sheet 6503 & diperbarui di Dashboard!`
      );
      setCurrentTab("overview");
    } catch {
      showToast("error", "Terjadi kesalahan jaringan saat menetapkan ODON.");
    } finally {
      setBusyCandidateId(null);
    }
  };

  const handleDismissCandidate = async (cand: OdonCandidateDto) => {
    setBusyCandidateId(cand.id);
    try {
      const res =
        cand.kind === "phenomenon"
          ? await fetch(`/api/phenomena/${cand.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                status: "rejected",
                reviewer_notes: "Diabaikan pada Meja Kurasi ODON.",
              }),
            })
          : await fetch(`/api/odon/${cand.id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                status: "archived",
                curatorNotes: "Diabaikan pada Meja Kurasi ODON.",
              }),
            });

      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        showToast("error", json?.error ?? "Gagal mengabaikan artikel kandidat.");
        return;
      }

      await refreshOdon();
      showToast("success", "Kandidat dikeluarkan dari antrean Meja Kurasi AI.");
    } catch {
      showToast("error", "Gagal menghubungi server untuk memperbarui status kandidat.");
    } finally {
      setBusyCandidateId(null);
    }
  };

  const handleModerateProposal = async (id: string, action: "accept" | "reject") => {
    setBusyProposalId(id);
    try {
      const res = await fetch(`/api/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        showToast("error", json?.error ?? "Gagal memproses moderasi usulan berita.");
        return;
      }

      await refreshOdon();
      showToast(
        "success",
        action === "accept"
          ? "Usulan diterima dan dimasukkan ke antrean Meja Kurasi AI."
          : "Usulan ditolak karena di luar cakupan fenomena ekonomi PDRB."
      );
    } catch {
      showToast("error", "Koneksi terputus saat memproses moderasi usulan.");
    } finally {
      setBusyProposalId(null);
    }
  };

  const handleSaveClassification = async (
    payload: CurationModalSavePayload
  ): Promise<{ ok: boolean; error?: string }> => {
    if (!editTarget) {
      return { ok: false, error: "Target entri tidak ditemukan." };
    }

    try {
      let res: Response;
      if (editTarget.kind === "odon_entry") {
        res = await fetch(`/api/odon/${editTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kbliCategory: payload.kbliCategory,
            kbliCode2020: payload.kbliCode2020,
            expenditureComponent: payload.expenditureComponent,
            impactType: payload.impactType,
            economicPhenomenonSummary: payload.summary,
            ...(editTarget.promoteOnSave ? { status: "verified" } : {}),
          }),
        });
      } else {
        res = await fetch("/api/odon", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "from_phenomenon",
            phenomenonId: editTarget.id,
            kbliCategory: payload.kbliCategory,
            kbliCode2020: payload.kbliCode2020,
            expenditureComponent: payload.expenditureComponent,
            impactType: payload.impactType,
            economicPhenomenonSummary: payload.summary,
          }),
        });
      }

      const json = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        return {
          ok: false,
          error: json?.error ?? "Gagal menyimpan klasifikasi ke database.",
        };
      }

      await refreshOdon();
      showToast(
        "success",
        "Klasifikasi KBLI 2020 <-> 2025 & Pengeluaran berhasil disimpan ke PostgreSQL."
      );
      return { ok: true };
    } catch {
      return {
        ok: false,
        error: "Terjadi kegagalan jaringan saat menyimpan perubahan.",
      };
    }
  };

  const handleRunScraper = async (): Promise<{ ok: boolean; message: string }> => {
    setIsScraperRunning(true);
    try {
      const ingestRes = await fetch("/api/cron/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ max_articles_per_source: 10 }),
      });

      const ingestJson = (await ingestRes.json().catch(() => null)) as {
        error?: string;
        inserted?: number;
        total_fetched?: number;
      } | null;

      if (!ingestRes.ok) {
        const errMsg = ingestJson?.error ?? "Gagal menjalankan pipeline scraping.";
        showToast("error", errMsg);
        return { ok: false, message: errMsg };
      }

      const insertedCount = ingestJson?.inserted ?? 0;
      const scannedCount = ingestJson?.total_fetched ?? 0;
      let summaryMsg = `Pemindaian ${data.kpis.activePortalsCount} portal selesai: ${scannedCount} tautan diperiksa, ${insertedCount} artikel baru disimpan ke DB.`;

      if (insertedCount > 0) {
        const extractRes = await fetch("/api/cron/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batch_size: Math.min(20, insertedCount + 2) }),
        });
        if (extractRes.ok) {
          const extractJson = (await extractRes.json().catch(() => null)) as {
            processed?: number;
          } | null;
          summaryMsg = `${summaryMsg} ${extractJson?.processed ?? 0} artikel diproses oleh ekstraktor AI.`;
        } else if (extractRes.status === 503) {
          summaryMsg = `${summaryMsg} Ekstraksi AI dilewati sementara (API key Gemini belum dikonfigurasi).`;
        }
      }

      await refreshOdon();
      showToast("success", summaryMsg);
      return { ok: true, message: summaryMsg };
    } catch {
      const errMsg = "Koneksi server terputus saat menjalankan scraper portal.";
      showToast("error", errMsg);
      return { ok: false, message: errMsg };
    } finally {
      setIsScraperRunning(false);
    }
  };

  const handleCopyNarratives = async () => {
    if (data.brsNarratives.length === 0) {
      showToast("error", "Belum ada entri terverifikasi untuk disusun menjadi narasi BRS.");
      return;
    }

    const compiled = data.brsNarratives
      .map((group) => {
        const header = `[${group.quarter}-${group.year} | ${group.kbliTitle} (${group.pdrbWeightPercent.toFixed(2)}% PDRB)]`;
        return `${header}\n${group.paragraphs.map((p, idx) => `${idx + 1}. ${p}`).join("\n")}`;
      })
      .join("\n\n");

    try {
      await navigator.clipboard.writeText(compiled);
      showToast("success", "Kompilasi draf narasi BRS berhasil disalin ke clipboard.");
    } catch {
      showToast("error", "Browser memblokir akses clipboard. Salin teks secara manual dari kartu.");
    }
  };

  const openSpotlightEditor = () => {
    if (!data.spotlight) return;
    setEditTarget({
      kind: "odon_entry",
      id: data.spotlight.id,
      title: data.spotlight.title,
      kbliCategory: data.spotlight.kbliCategory,
      kbliCode2020: data.spotlight.kbliCode2020,
      expenditureComponent: data.spotlight.expenditureComponent,
      impactType: data.spotlight.impactType,
      summary: data.spotlight.economicPhenomenonSummary,
      promoteOnSave: false,
    });
  };

  const openLedgerRowEditor = (row: OdonLedgerRowDto) => {
    setEditTarget({
      kind: "odon_entry",
      id: row.id,
      title: row.title,
      kbliCategory: row.kbliCategory,
      kbliCode2020: row.kbliCode2020,
      expenditureComponent: row.expenditureComponent,
      impactType: row.impactType,
      summary: row.summary,
      promoteOnSave: false,
    });
  };

  const openCandidateEditor = (cand: OdonCandidateDto) => {
    setEditTarget({
      kind: cand.kind,
      id: cand.id,
      title: cand.title,
      kbliCategory: cand.kbliCategory,
      kbliCode2020: cand.kbliCode2020,
      expenditureComponent: cand.expenditureComponent,
      impactType: cand.impactType,
      summary: cand.summary,
      promoteOnSave: true,
    });
  };

  const kpiCards = [
    {
      label: "ODON Terverifikasi",
      value: `${data.kpis.verifiedCount} Entri`,
      note: data.kpis.latestEntryLabel
        ? `Terbaru: ${data.kpis.latestEntryLabel}`
        : "Siap dikurasi di Sheet 6503",
      noteClass: "text-emerald-700",
      icon: Newspaper,
      iconBox: "bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-600/15",
      spark: "text-blue-500",
    },
    {
      label: "Sektor KBLI Terbesar",
      value: `${PDRB_KTT_WEIGHTS.lapanganUsaha.B.weight.toFixed(2)}%`,
      note: "KBLI B • Pertambangan Batubara",
      noteClass: "text-slate-500",
      icon: Pickaxe,
      iconBox: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-300/50",
      spark: "text-slate-500",
    },
    {
      label: "Pengeluaran Dominan",
      value: `${PDRB_KTT_WEIGHTS.pengeluaran.NET_EKSPOR.weight.toFixed(2)}%`,
      note: "Pos 6 • Net Ekspor Barang & Jasa",
      noteClass: "text-emerald-700",
      icon: TrendingUp,
      iconBox: "bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-600/15",
      spark: "text-emerald-500",
    },
    {
      label: "Radar Scraper H-1",
      value: `${data.kpis.activePortalsCount} Portal`,
      note: `${data.kpis.totalArticlesCount} Artikel DB • 05:00 WITA`,
      noteClass: "text-blue-700 num",
      icon: Radio,
      iconBox: "bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-600/15",
      spark: "text-amber-500",
    },
  ];

  return (
    <div className="ui-canvas text-slate-900 font-sans antialiased min-h-screen flex selection:bg-blue-600/20 selection:text-blue-900">
      {/* Toast Notification Banner */}
      {toast && (
        <div
          role={toast.kind === "success" ? "status" : "alert"}
          aria-live="polite"
          className={`fixed bottom-5 right-5 z-50 max-w-md rounded-xl px-4 py-3 shadow-lg ring-1 ring-inset flex items-start gap-2.5 text-xs font-medium ${
            toast.kind === "success"
              ? "bg-emerald-950 text-emerald-50 ring-emerald-400/30"
              : "bg-rose-950 text-rose-50 ring-rose-400/30"
          }`}
        >
          {toast.kind === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" aria-hidden="true" />
          )}
          <span className="leading-relaxed">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Tutup notifikasi"
            className="ml-2 text-white/70 hover:text-white shrink-0"
          >
            <X className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      {/* 1. Dark Sidebar (Shown ONLY for authenticated Admin/Editor viewing admin mode) */}
      <MuseSidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        userRole={isAdmin ? "admin" : "public"}
        onRoleToggle={() => void handleRoleChange(isAdmin ? "public" : "admin")}
        onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
        onOpenBlueprintModal={() => setIsBlueprintModalOpen(true)}
        pendingCandidatesCount={data.kpis.pendingCandidatesCount}
        pendingProposalsCount={data.kpis.pendingProposalsCount}
        portalsCount={data.kpis.activePortalsCount}
        userName={userName}
        onLogout={() => void handleLogout()}
      />

      {/* 2. Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        <MuseNavbar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          userRole={isAdmin ? "admin" : "public"}
          hasAdminSession={hasAdminSession}
          sessionRole={sessionRole}
          onRoleChange={(r) => void handleRoleChange(r)}
          onExportExcel={handleExportExcel}
          onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
          onLogout={sessionRole ? () => void handleLogout() : undefined}
          pendingCandidatesCount={data.kpis.pendingCandidatesCount}
          pendingProposalsCount={data.kpis.pendingProposalsCount}
        />

        <main className="w-full max-w-[1440px] mx-auto px-6 lg:px-10 py-6 lg:py-8 space-y-6">
          {!isAdmin ? (
            <PublicNewsTabulation
              rows={data.ledgerRows}
              onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
            />
          ) : (
            <>
              {/* Admin Tab 1: Dashboard Operasional & ODON Spotlight */}
              {currentTab === "overview" && (
                <div className="space-y-6">
                  {/* KPI cards */}
                  <section
                    aria-label="Ringkasan KPI"
                    className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6"
                  >
                    {kpiCards.map((k) => {
                      const Icon = k.icon;
                      return (
                        <div
                          key={k.label}
                          className="ui-card ui-card-interactive relative overflow-hidden p-5"
                        >
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 120 40"
                            preserveAspectRatio="none"
                            className={`absolute inset-x-0 bottom-0 h-10 w-full opacity-60 ${k.spark}`}
                          >
                            <path
                              d="M0 32 C 15 30, 22 20, 38 22 S 62 10, 78 14 S 104 4, 120 8 L120 40 L0 40 Z"
                              fill="currentColor"
                              fillOpacity="0.12"
                            />
                            <path
                              d="M0 32 C 15 30, 22 20, 38 22 S 62 10, 78 14 S 104 4, 120 8"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeOpacity="0.45"
                            />
                          </svg>
                          <div className="relative flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <span className="text-xs text-slate-500 font-semibold block">
                                {k.label}
                              </span>
                              <h3 className="text-2xl font-bold text-slate-900 mt-1.5 num tracking-tight">
                                {k.value}
                              </h3>
                              <span className={`text-xs font-medium block mt-1.5 ${k.noteClass}`}>
                                {k.note}
                              </span>
                            </div>
                            <div className={`rounded-xl p-3 ${k.iconBox}`}>
                              <Icon className="w-5 h-5" aria-hidden="true" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </section>

                  {/* Hero Spotlight Layout */}
                  <section className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    <div className="xl:col-span-2">
                      <OdonHeroSpotlight
                        data={data.spotlight}
                        isAdmin={isAdmin}
                        onEditClassification={openSpotlightEditor}
                      />
                    </div>

                    <div className="space-y-6">
                      <PipelineTimeline kpis={data.kpis} />
                      <PdrbWeightsCard />
                    </div>
                  </section>

                  {/* Sheet 6503 Table */}
                  <SheetLedgerTable
                    rows={data.ledgerRows}
                    isAdmin={isAdmin}
                    onEditRow={openLedgerRowEditor}
                    onExportExcel={handleExportExcel}
                  />
                </div>
              )}

              {/* Admin Tab 2: Meja Kurasi AI */}
              {currentTab === "curation" && (
                <CurationGrid
                  candidates={data.candidates}
                  onApprove={handleApproveCandidate}
                  onDismiss={handleDismissCandidate}
                  onEditCandidate={openCandidateEditor}
                  onRefreshScraper={async () => {
                    await handleRunScraper();
                  }}
                  isRefreshing={isScraperRunning}
                  busyCandidateId={busyCandidateId}
                />
              )}

              {/* Admin Tab 3: Moderasi Usulan Publik & OPD */}
              {currentTab === "proposals" && (
                <ProposalsModerationView
                  proposals={data.proposals}
                  onModerate={handleModerateProposal}
                  busyProposalId={busyProposalId}
                />
              )}

              {/* Admin Tab 4: Buku Kerja Master Sheet 6503 */}
              {currentTab === "ledger" && (
                <SheetLedgerTable
                  rows={data.ledgerRows}
                  isAdmin={isAdmin}
                  onEditRow={openLedgerRowEditor}
                  onExportExcel={handleExportExcel}
                />
              )}

              {/* Admin Tab 5: Matriks Bobot PDRB (Internal) */}
              {currentTab === "pdrb" && (
                <div className="space-y-6">
                  <PdrbWeightsCard />
                  <div className="ui-card p-6 space-y-2">
                    <h4 className="ui-h2">
                      Catatan Internal Analis: Single Source of Truth Bobot PDRB KTT 2025
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed max-w-prose">
                      Sesuai prinsip kehati-hatian statistik BPS (Distribusi PDRB ADHB 2025 Seri 2010), berita media massa merupakan sinyal arah fenomena, bukan pengganti survei maupun data administrasi resmi. Prioritaskan 4 lapangan usaha utama Tana Tidung:{" "}
                      <b className="font-semibold text-slate-900 num">
                        Pertambangan Batubara ({PDRB_KTT_WEIGHTS.lapanganUsaha.B.weight.toFixed(2)}%)
                      </b>
                      ,{" "}
                      <b className="font-semibold text-slate-900 num">
                        Pertanian, Kehutanan & Perikanan ({PDRB_KTT_WEIGHTS.lapanganUsaha.A.weight.toFixed(2)}%)
                      </b>
                      ,{" "}
                      <b className="font-semibold text-slate-900 num">
                        Konstruksi ({PDRB_KTT_WEIGHTS.lapanganUsaha.F.weight.toFixed(2)}%)
                      </b>
                      , dan{" "}
                      <b className="font-semibold text-slate-900 num">
                        Administrasi Pemerintahan ({PDRB_KTT_WEIGHTS.lapanganUsaha.O.weight.toFixed(2)}%)
                      </b>{" "}
                      yang membentuk{" "}
                      <span className="num font-semibold text-slate-900">
                        {PDRB_KTT_WEIGHTS.top4LapanganUsahaShare}%
                      </span>{" "}
                      struktur PDRB daerah.
                    </p>
                  </div>
                </div>
              )}

              {/* Admin Tab 6: Kompilasi Draf Narasi BRS */}
              {currentTab === "narratives" && (
                <div className="ui-card overflow-hidden">
                  <div className="ui-card-header">
                    <div>
                      <h3 className="ui-h1">Kompilasi Narasi Fenomena Triwulanan BRS</h3>
                      <p className="ui-muted">
                        Disusun langsung dari entri ODON terverifikasi pada database Sheet 6503
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleCopyNarratives()}
                      className="ui-btn ui-btn-primary"
                    >
                      Salin Narasi Lengkap
                    </button>
                  </div>
                  <div className="p-6">
                    {data.brsNarratives.length === 0 ? (
                      <p className="text-sm text-slate-500">
                        Belum ada entri terverifikasi untuk dikompilasi ke narasi BRS.
                      </p>
                    ) : (
                      <div className="p-5 rounded-xl bg-slate-50/90 border-l-2 border-slate-300 rounded-l-none text-sm text-slate-700 leading-relaxed space-y-5 max-w-4xl">
                        {data.brsNarratives.map((group) => (
                          <div
                            key={`${group.year}-${group.quarter}-${group.kbliCategory}`}
                            className="space-y-1.5"
                          >
                            <p className="font-semibold text-slate-900 num text-xs tracking-wide uppercase">
                              [{group.quarter}-{group.year} • {group.kbliTitle} •{" "}
                              {group.pdrbWeightPercent.toFixed(2)}% PDRB ({group.entriesCount} Entri)]
                            </p>
                            {group.paragraphs.map((para, pIdx) => (
                              <p key={pIdx} className="leading-relaxed">
                                {para}
                              </p>
                            ))}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Admin Tab 7: Katalog KBLI 2025 */}
              {currentTab === "kbli" && <KbliCrosswalkTable />}

              {/* Admin Tab 8: Radar Scraper 7 Portal */}
              {currentTab === "scrapers" && (
                <ScrapersStatusView
                  sources={data.sourceStatuses}
                  onRunScraper={handleRunScraper}
                />
              )}

              {/* Admin Tab 9: Pedoman SOP ODON */}
              {currentTab === "methodology" && <MethodologyView />}
            </>
          )}
        </main>
      </div>

      {/* Global Dialogs & Modals */}
      <CurationModal
        isOpen={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        targetId={editTarget?.id ?? "none"}
        title={editTarget?.title ?? ""}
        initialKbliCategory={editTarget?.kbliCategory ?? "B"}
        initialKbli2020={editTarget?.kbliCode2020 ?? "05100"}
        initialPengeluaran={editTarget?.expenditureComponent ?? "EKSPOR"}
        initialImpactType={editTarget?.impactType ?? "positif"}
        initialSummary={editTarget?.summary ?? ""}
        submitLabel={
          editTarget?.promoteOnSave
            ? "Simpan & Tetapkan ke Sheet 6503"
            : "Simpan Perubahan Sheet 6503"
        }
        onSave={handleSaveClassification}
      />

      <ProposalModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmitSuccess={() => {
          showToast(
            "success",
            "Terima kasih! Usulan berita Anda telah tersimpan ke antrean Moderasi Tim Nerwilis."
          );
          if (hasAdminSession) {
            void refreshOdon();
          }
        }}
      />

      <BlueprintModal
        isOpen={isBlueprintModalOpen}
        onClose={() => setIsBlueprintModalOpen(false)}
      />
    </div>
  );
}
