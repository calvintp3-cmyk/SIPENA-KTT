"use client";

import React, { useState } from "react";
import { MuseSidebar, type MuseViewTab } from "./muse-sidebar";
import { MuseNavbar } from "./muse-navbar";
import { OdonHeroSpotlight, type OdonSpotlightData } from "./odon-hero-spotlight";
import { PdrbWeightsCard } from "./pdrb-weights-card";
import { PipelineTimeline } from "./pipeline-timeline";
import { SheetLedgerTable, type OdonLedgerRow } from "./sheet-ledger-table";
import { CurationGrid, type CurationCandidate } from "./curation-grid";
import { PublicNewsTabulation } from "./public-news-tabulation";
import { ProposalsModerationView, type ArticleProposal } from "./proposals-moderation-view";
import { MethodologyView } from "./methodology-view";
import { KbliCrosswalkTable } from "./kbli-crosswalk-table";
import { ScrapersStatusView } from "./scrapers-status-view";
import { CurationModal } from "./curation-modal";
import { ProposalModal } from "./proposal-modal";
import { BlueprintModal } from "./blueprint-modal";
import {
  Newspaper,
  Pickaxe,
  TrendingUp,
  Radio,
  FileText,
  Layers,
  ArrowRight,
  Shield,
  BookOpen,
} from "lucide-react";

// Initial Ground Truth Spotlight
const INITIAL_SPOTLIGHT: OdonSpotlightData = {
  id: "odon-10-nov",
  entryDate: "Senin, 10 November 2026",
  releaseDate: "09 Nov 2026",
  source: "Radar Tarakan • Biro Tana Tidung",
  sourceUrl: "https://kaltara.prokal.co/tana-tidung",
  title:
    "Pelabuhan Bebatu Pacu Pengapalan Batubara dan Hasil Kelapa Sawit, Ekspor Tana Tidung Melonjak 14.8% di Q4",
  economicPhenomenonSummary:
    "Aktivitas transshipment di Terminal Khusus Bebatu mencatatkan lonjakan pengapalan batubara curah dan CPO kelapa sawit sebesar 14.8% (Q-o-Q). Ini menjadi katalisator langsung penopang nilai tambah bruto sektor primer serta mengonfirmasi ekspansi neraca perdagangan luar wilayah Tana Tidung.",
  kbliCode2020: "B (05100)",
  kbliTitle2020: "Pertambangan Batubara (37.8%)",
  kbliCode2025: "05101",
  kbliTitle2025: "Penambangan Batubara",
  kbliSecondary: "KBLI A (01262) - Sawit (23.4%)",
  expenditureCode: "Pos 6 • Net Ekspor Antar Daerah (49.98%)",
  expenditureSecondary: "Pos 4 • PMTB Modal Tetap (31.38%)",
  aggregateShare: "81.36%",
  verifierName: "Calvin (Tim Nerwilis KTT)",
  verifiedTime: "10 Nov 07:15 WITA",
  relevanceScore: 96,
};

// Initial Ground Truth Ledger Rows (Sheet 6503)
const INITIAL_LEDGER_ROWS: OdonLedgerRow[] = [
  {
    id: "row-1",
    entryDate: "10/11/2026",
    releaseDate: "09/11",
    source: "Radar Tarakan",
    sourceUrl: "https://kaltara.prokal.co",
    title: "Pelabuhan Bebatu Pacu Pengapalan Batubara dan Hasil Sawit, Ekspor KTT Melonjak di Q4",
    summary: "Frekuensi tongkang batubara dan CPO meningkat 14.8%. Transmisi langsung ke output PDRB Batubara dan Net Ekspor.",
    kbliCategory: "B",
    kbliCode: "05100",
    kbliDesc: "Batubara • 37.8%",
    kbli2025: "05101",
    expenditureCode: "Net Ekspor (49.98%)",
    expenditureDesc: "PMTB Logistik (31.38%)",
    triwulan: "Q4",
    status: "verified",
  },
  {
    id: "row-2",
    entryDate: "07/11/2026",
    releaseDate: "06/11",
    source: "Benuanta",
    sourceUrl: "https://benuanta.co.id",
    title: "Progres Pembangunan Pusat Pemerintahan Terpadu Tana Tidung Capai 82%, Target Rampung Akhir Tahun",
    summary: "Realisasi belanja modal konstruksi gedung dan jalan lingkar pemkab mengerek penyerapan anggaran fisik daerah.",
    kbliCategory: "F",
    kbliCode: "41011",
    kbliDesc: "Konstruksi • 18.5%",
    kbli2025: "41011",
    expenditureCode: "PMTB Fisik (31.38%)",
    expenditureDesc: "PK-P Belanja Modal",
    triwulan: "Q4",
    status: "verified",
  },
  {
    id: "row-3",
    entryDate: "06/11/2026",
    releaseDate: "05/11",
    source: "Tribun Kaltara",
    sourceUrl: "https://kaltara.tribunnews.com",
    title: "Harga Tandan Buah Segar (TBS) Sawit di Petani Mandiri Sesayap Naik Jadi Rp 2.750 per Kilogram",
    summary: "Kenaikan harga pembelian pabrik kelapa sawit meningkatkan pendapatan petani swadaya di Sesayap Hilir dan Betayau.",
    kbliCategory: "A",
    kbliCode: "01262",
    kbliDesc: "Sawit • 23.4%",
    kbli2025: "01262",
    expenditureCode: "PK-RT Pangan (7.06%)",
    expenditureDesc: "Net Ekspor CPO",
    triwulan: "Q4",
    status: "verified",
  },
  {
    id: "row-4",
    entryDate: "05/11/2026",
    releaseDate: "04/11",
    source: "Fokus Borneo",
    sourceUrl: "https://fokusborneo.com",
    title: "Dishub KTT Uji Coba Trayek Speedboat Reguler Rute Tideng Pale - Tarakan untuk Peningkatan Mobilitas Warga",
    summary: "Peningkatan konektivitas antarpulau menekan waktu tempuh dan ongkos angkut komoditas holtikultura antarwilayah.",
    kbliCategory: "H",
    kbliCode: "50111",
    kbliDesc: "Angkutan Perairan • 2.1%",
    kbli2025: "50111",
    expenditureCode: "PK-RT Jasa (7.06%)",
    expenditureDesc: "PK-P Pelayanan",
    triwulan: "Q4",
    status: "verified",
  },
  {
    id: "row-5",
    entryDate: "04/11/2026",
    releaseDate: "03/11",
    source: "Radar Tarakan",
    sourceUrl: "https://kaltara.prokal.co",
    title: "Dinas Pertanian Salurkan 15 Ton Bibit Padi Sawah Irigasi di Desa Limbu Sedulun",
    summary: "Penyaluran bantuan sarana produksi pertanian guna mendongkrak luas tanam musim rendeng 2026.",
    kbliCategory: "A",
    kbliCode: "01111",
    kbliDesc: "Padi & Palawija (23.4%)",
    kbli2025: "01111",
    expenditureCode: "PK-P Bansos (9.80%)",
    expenditureDesc: "PK-RT Pangan",
    triwulan: "Q4",
    status: "verified",
  },
];

// Initial Curation Desk Candidates
const INITIAL_CANDIDATES: CurationCandidate[] = [
  {
    id: "cand-1",
    source: "Radar Tarakan",
    sourceUrl: "https://kaltara.prokal.co/tana-tidung/ekspor-batubara",
    title: "Pelabuhan Bebatu Pacu Pengapalan Batubara dan Hasil Sawit, Ekspor KTT Melonjak di Q4",
    summary: "Aktivitas transshipment di Terminal Khusus Bebatu mencatatkan lonjakan pengapalan batubara curah dan CPO kelapa sawit sebesar 14.8%.",
    kbliCategory: "B",
    kbliCode: "05100",
    kbliDesc: "Pertambangan Batubara (37.8%)",
    expenditureCode: "Pos 6 • Net Ekspor (49.98%)",
    score: "96% Relevansi Batubara",
    isRecommended: true,
  },
  {
    id: "cand-2",
    source: "Benuanta",
    sourceUrl: "https://benuanta.co.id/kaltara/ktt/pusat-pemerintahan",
    title: "Progres Pembangunan Pusat Pemerintahan Terpadu Tana Tidung Capai 82%, Target Rampung Akhir Tahun",
    summary: "Realisasi belanja modal konstruksi gedung dan jalan lingkar pemkab mengerek penyerapan anggaran fisik daerah.",
    kbliCategory: "F",
    kbliCode: "41011",
    kbliDesc: "Konstruksi Gedung (18.5%)",
    expenditureCode: "Pos 4 • PMTB Fisik (31.38%)",
    score: "92% Relevansi Konstruksi",
    isRecommended: false,
  },
  {
    id: "cand-3",
    source: "Tribun Kaltara",
    sourceUrl: "https://kaltara.tribunnews.com/kaltara/tanah-tidung",
    title: "Pemerintah Siapkan Bantuan Benih dan Pupuk Subsidi untuk 20 Kelompok Tani Betayau",
    summary: "Stimulus produksi sektor pertanian tanaman pangan untuk menjaga pasokan beras lokal dan ketahanan pangan.",
    kbliCategory: "A",
    kbliCode: "01111",
    kbliDesc: "Pertanian Pangan (23.4%)",
    expenditureCode: "PK-P Bansos (9.80%)",
    score: "84% Relevansi Pertanian",
    isRecommended: false,
  },
];

interface MuseWorkspaceProps {
  initialRole?: "admin" | "public";
}

const KPI_CARDS = [
  {
    label: "ODON Terverifikasi",
    value: "156 Hari",
    note: "Edisi 10 Nov (H-1) Siap",
    noteClass: "text-emerald-700",
    icon: Newspaper,
    iconBox: "bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-600/15",
    spark: "text-blue-500",
  },
  {
    label: "Sektor KBLI Terbesar",
    value: "37.80%",
    note: "KBLI B • Tambang Batubara",
    noteClass: "text-slate-500",
    icon: Pickaxe,
    iconBox: "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-300/50",
    spark: "text-slate-500",
  },
  {
    label: "Pengeluaran Dominan",
    value: "49.98%",
    note: "Pos 6 • Net Ekspor Antardaerah",
    noteClass: "text-emerald-700",
    icon: TrendingUp,
    iconBox: "bg-emerald-50 text-emerald-600 ring-1 ring-inset ring-emerald-600/15",
    spark: "text-emerald-500",
  },
  {
    label: "Radar Scraper H-1",
    value: "5 Portal",
    note: "05:00 WITA Aktif",
    noteClass: "text-blue-700 num",
    icon: Radio,
    iconBox: "bg-amber-50 text-amber-600 ring-1 ring-inset ring-amber-600/15",
    spark: "text-amber-500",
  },
];

export function MuseWorkspace({ initialRole = "public" }: MuseWorkspaceProps) {
  const [currentTab, setCurrentTab] = useState<MuseViewTab>("overview");
  const [userRole, setUserRole] = useState<"admin" | "public">(initialRole);
  const [spotlight, setSpotlight] = useState<OdonSpotlightData>(INITIAL_SPOTLIGHT);
  const [ledgerRows, setLedgerRows] = useState<OdonLedgerRow[]>(INITIAL_LEDGER_ROWS);
  const [candidates, setCandidates] = useState<CurationCandidate[]>(INITIAL_CANDIDATES);

  // Modals state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] = useState(false);

  const isAdmin = userRole === "admin";

  const handleRoleToggle = () => {
    const nextRole = isAdmin ? "public" : "admin";
    setUserRole(nextRole);
    if (nextRole === "public") {
      setCurrentTab("overview");
    }
  };

  const handleExportExcel = () => {
    alert("Membuat dan mengunduh file ODON_6503_Tana_Tidung_2026.xlsx sesuai standar format resmi BPS!");
  };

  const handleApproveCandidate = (id: string) => {
    const cand = candidates.find((c) => c.id === id);
    if (!cand) return;

    setSpotlight((prev) => ({
      ...prev,
      source: cand.source,
      sourceUrl: cand.sourceUrl,
      title: cand.title,
      economicPhenomenonSummary: cand.summary,
      kbliCode2020: cand.kbliCode,
      kbliTitle2020: cand.kbliDesc,
      expenditureCode: cand.expenditureCode,
    }));

    alert(`Berita "${cand.title.slice(0, 40)}..." berhasil disetujui sebagai ODON Edisi Hari Ini!`);
    setCurrentTab("overview");
  };

  const handleAcceptProposal = (prop: ArticleProposal) => {
    const newCand: CurationCandidate = {
      id: `cand-${Date.now()}`,
      source: `${prop.submitterAgency} (${prop.submitterName})`,
      sourceUrl: prop.url,
      title: prop.title,
      summary: prop.economicNotes,
      kbliCategory: "C",
      kbliCode: "16101",
      kbliDesc: "Industri Pengolahan Kayu",
      expenditureCode: "PMTB Investasi",
      score: "90% Usulan OPD Terverifikasi",
      isRecommended: true,
    };
    setCandidates((prev) => [newCand, ...prev]);
  };

  const handleSaveClassification = (data: {
    kbli2020: string;
    kbli2025: string;
    pengeluaran: string;
    summary: string;
  }) => {
    setSpotlight((prev) => ({
      ...prev,
      kbliCode2020: data.kbli2020,
      kbliCode2025: data.kbli2025,
      expenditureCode: data.pengeluaran,
      economicPhenomenonSummary: data.summary,
    }));
    alert("Klasifikasi ODON berhasil disimpan dan disinkronkan ke Buku Kerja Sheet 6503!");
  };

  return (
    <div className="ui-canvas text-slate-900 font-sans antialiased min-h-screen flex selection:bg-blue-600/20 selection:text-blue-900">

      {/* 1. Dark Sidebar (Shown ONLY for Admin) */}
      <MuseSidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        userRole={userRole}
        onRoleToggle={handleRoleToggle}
        onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
        onOpenBlueprintModal={() => setIsBlueprintModalOpen(true)}
      />

      {/* 2. Main column: sticky header + widescreen content container */}
      <div className="flex-1 min-w-0 flex flex-col">
        <MuseNavbar
          currentTab={currentTab}
          onTabChange={setCurrentTab}
          userRole={userRole}
          onRoleChange={setUserRole}
          onExportExcel={handleExportExcel}
          onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
        />

      <main className="w-full max-w-[1440px] mx-auto px-6 lg:px-10 py-6 lg:py-8 space-y-6">

        {/* ======================================================== */}
        {/* 1. PUBLIC VIEW: Clean Static-Style News Tabulation       */}
        {/* ======================================================== */}
        {!isAdmin ? (
          <PublicNewsTabulation
            onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
            onLoginClick={() => setUserRole("admin")}
          />
        ) : (
          /* ======================================================== */
          /* 2. ADMIN VIEW: Full NextAdmin Operations Workspace       */
          /* ======================================================== */
          <>
            {/* Admin Tab 1: Dashboard Operasional & ODON Spotlight */}
            {currentTab === "overview" && (
              <div className="space-y-6">
                
                {/* KPI cards */}
                <section aria-label="Ringkasan KPI" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 lg:gap-6">
                  {KPI_CARDS.map((k) => {
                    const Icon = k.icon;
                    return (
                      <div key={k.label} className="ui-card ui-card-interactive relative overflow-hidden p-5">
                        <svg
                          aria-hidden="true"
                          viewBox="0 0 120 40"
                          preserveAspectRatio="none"
                          className={`absolute inset-x-0 bottom-0 h-10 w-full opacity-60 ${k.spark}`}
                        >
                          <path d="M0 32 C 15 30, 22 20, 38 22 S 62 10, 78 14 S 104 4, 120 8 L120 40 L0 40 Z" fill="currentColor" fillOpacity="0.12" />
                          <path d="M0 32 C 15 30, 22 20, 38 22 S 62 10, 78 14 S 104 4, 120 8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.45" />
                        </svg>
                        <div className="relative flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <span className="text-xs text-slate-500 font-semibold block">{k.label}</span>
                            <h3 className="text-2xl font-bold text-slate-900 mt-1.5 num tracking-tight">{k.value}</h3>
                            <span className={`text-xs font-medium block mt-1.5 ${k.noteClass}`}>{k.note}</span>
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
                      data={spotlight}
                      isAdmin={isAdmin}
                      onEditClassification={() => setIsEditModalOpen(true)}
                    />
                  </div>

                  <div className="space-y-6">
                    <PipelineTimeline />
                    <PdrbWeightsCard />
                  </div>
                </section>

                {/* Sheet 6503 Table */}
                <SheetLedgerTable
                  rows={ledgerRows}
                  isAdmin={isAdmin}
                  onEditRow={() => setIsEditModalOpen(true)}
                  onExportExcel={handleExportExcel}
                />

              </div>
            )}

            {/* Admin Tab 2: Meja Kurasi AI */}
            {currentTab === "curation" && (
              <CurationGrid
                candidates={candidates}
                onApprove={handleApproveCandidate}
                onEditCandidate={() => setIsEditModalOpen(true)}
                onRefreshScraper={() =>
                  alert("Menjalankan scraper H-1... 54 berita masuk antrean kurasi!")
                }
              />
            )}

            {/* Admin Tab 3: Moderasi Usulan Publik & OPD */}
            {currentTab === "proposals" && (
              <ProposalsModerationView onAcceptProposal={handleAcceptProposal} />
            )}

            {/* Admin Tab 4: Buku Kerja Master Sheet 6503 */}
            {currentTab === "ledger" && (
              <SheetLedgerTable
                rows={ledgerRows}
                isAdmin={isAdmin}
                onEditRow={() => setIsEditModalOpen(true)}
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
                    Sesuai prinsip kehati-hatian statistik BPS, berita media massa adalah sinyal arah fenomena, bukan data dukung resmi mutlak. Prioritaskan 4 sektor utama Tana Tidung: <b className="font-semibold text-slate-900 num">Batubara (37.80%)</b>, <b className="font-semibold text-slate-900 num">Sawit (23.41%)</b>, <b className="font-semibold text-slate-900 num">Konstruksi (18.50%)</b>, dan <b className="font-semibold text-slate-900 num">Kehutanan (8.44%)</b> yang membentuk <span className="num">88.14%</span> PDRB daerah.
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
                    <p className="ui-muted">Format siap pakai untuk naskah rilis resmi BPS Kabupaten Tana Tidung</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => alert("Menyalin kompilasi narasi triwulanan ke clipboard...")}
                    className="ui-btn ui-btn-primary"
                  >
                    Salin Narasi Lengkap
                  </button>
                </div>
                <div className="p-6">
                  <div className="p-5 rounded-xl bg-slate-50/90 border-l-2 border-slate-300 rounded-l-none text-sm text-slate-700 leading-relaxed space-y-4 max-w-4xl">
                    <p><b className="font-semibold text-slate-900">[TRIWULAN IV-2026 - LAPANGAN USAHA B: PERTAMBANGAN BATUBARA]</b><br/>
                    Pada Triwulan IV-2026, aktivitas pengapalan batubara melalui Terminal Khusus Bebatu mencatatkan lonjakan volume ekspor antar daerah sebesar <span className="num">14.8%</span> (Q-o-Q). Hal ini didorong oleh membaiknya cuaca perairan Sungai Sesayap dan peningkatan kuota produksi akhir tahun.</p>
                    <p><b className="font-semibold text-slate-900">[TRIWULAN IV-2026 - LAPANGAN USAHA F: KONSTRUKSI]</b><br/>
                    Realisasi fisik pembangunan Pusat Pemerintahan Terpadu Tana Tidung mencapai <span className="num">82%</span> hingga awal November 2026. Penyerapan belanja modal konstruksi gedung dan jalan lingkar pemkab mengerek komponen PMTB dan pertumbuhan sektor konstruksi.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Admin Tab 7: Katalog KBLI 2025 */}
            {currentTab === "kbli" && <KbliCrosswalkTable />}

            {/* Admin Tab 8: Radar Scraper 5 Portal */}
            {currentTab === "scrapers" && <ScrapersStatusView />}

            {/* Admin Tab 9: Pedoman SOP ODON */}
            {currentTab === "methodology" && <MethodologyView />}
          </>
        )}

      </main>
      </div>

      {/* Global Dialogs & Modals */}
      <CurationModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={spotlight.title}
        initialKbli2020={spotlight.kbliCode2020.replace(/[^0-9]/g, "")}
        initialPengeluaran="NET_EKSPOR"
        initialSummary={spotlight.economicPhenomenonSummary}
        onSave={handleSaveClassification}
      />

      <ProposalModal
        isOpen={isSubmitModalOpen}
        onClose={() => setIsSubmitModalOpen(false)}
        onSubmitSuccess={() =>
          alert("Terima kasih! Tautan berita Anda telah diterima dan masuk ke antrean Meja Kurasi Tim Nerwilis.")
        }
      />

      <BlueprintModal
        isOpen={isBlueprintModalOpen}
        onClose={() => setIsBlueprintModalOpen(false)}
      />

    </div>
  );
}
