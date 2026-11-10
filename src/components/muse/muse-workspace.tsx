"use client";

import React, { useState } from "react";
import { MuseSidebar, type MuseViewTab } from "./muse-sidebar";
import { MuseNavbar } from "./muse-navbar";
import { OdonHeroSpotlight, type OdonSpotlightData } from "./odon-hero-spotlight";
import { PdrbWeightsCard } from "./pdrb-weights-card";
import { PipelineTimeline } from "./pipeline-timeline";
import { SheetLedgerTable, type OdonLedgerRow } from "./sheet-ledger-table";
import { CurationGrid, type CurationCandidate } from "./curation-grid";
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
    title: "Disperindagkop Tana Tidung Gelar Operasi Pasar Murah Sembako Jelang Akhir Tahun di Tideng Pale",
    summary: "Stabilisasi pasokan beras, minyak goreng, dan gula pasir untuk meredam potensi lonjakan inflasi bahan makanan.",
    kbliCategory: "G",
    kbliCode: "47111",
    kbliDesc: "Perdagangan • 5.1%",
    kbli2025: "47111",
    expenditureCode: "PK-RT (Konsumsi)",
    expenditureDesc: "PK-P Bansos Subsidi",
    triwulan: "Q4",
    status: "verified",
  },
  {
    id: "row-5",
    entryDate: "04/11/2026",
    releaseDate: "03/11",
    source: "Radar Tarakan",
    sourceUrl: "https://kaltara.prokal.co",
    title: "Bupati Ibrahim Ali Resmikan Jembatan Penghubung Antar Desa di Tana Lia, Mudahkan Angkutan Hasil Tani",
    summary: "Infrastruktur konektivitas menurunkan ongkos angkut komoditas pertanian dan perikanan lokal.",
    kbliCategory: "F",
    kbliCode: "42101",
    kbliDesc: "Konstruksi Jembatan",
    kbli2025: "42101",
    expenditureCode: "PMTB Infrastruktur (31.38%)",
    expenditureDesc: "PK-P Belanja Modal",
    triwulan: "Q4",
    status: "verified",
  },
];

// Initial Curation Candidates
const INITIAL_CANDIDATES: CurationCandidate[] = [
  {
    id: "cand-1",
    source: "Radar Tarakan",
    sourceUrl: "https://kaltara.prokal.co/tana-tidung",
    title: "Pelabuhan Bebatu Pacu Pengapalan Batubara dan Hasil Kelapa Sawit, Ekspor KTT Melonjak di Q4",
    summary: "Peningkatan frekuensi tongkang curah batubara dan CPO di Terminal Bebatu mendorong lonjakan ekspor triwulanan.",
    kbliCategory: "B",
    kbliCode: "05100",
    kbliDesc: "Batubara (37.8%)",
    expenditureCode: "Net Ekspor (49.98%)",
    score: "96% Kecocokan PDRB",
    isRecommended: true,
  },
  {
    id: "cand-2",
    source: "Benuanta",
    sourceUrl: "https://benuanta.co.id/category/tana-tidung",
    title: "Dinas PUPR KTT Percepat Pengaspalan Jalan Poros Sesayap Menuju Pelabuhan Feri",
    summary: "Belanja modal konstruksi infrastruktur konektivitas untuk mempercepat mobilitas logistik dan barang antardaerah.",
    kbliCategory: "F",
    kbliCode: "42101",
    kbliDesc: "Konstruksi Jalan (18.5%)",
    expenditureCode: "PMTB Fisik (31.38%)",
    score: "89% Kecocokan PDRB",
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
    score: "84% Kecocokan PDRB",
    isRecommended: false,
  },
];

interface MuseWorkspaceProps {
  initialRole?: "admin" | "public";
}

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
    <div className="bg-[#f0f2f5] text-[#434343] font-sans antialiased min-h-screen flex selection:bg-blue-100 selection:text-blue-900">
      
      {/* 1. Muse Sidebar Navigation */}
      <MuseSidebar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        userRole={userRole}
        onOpenSubmitModal={() => setIsSubmitModalOpen(true)}
        onOpenBlueprintModal={() => setIsBlueprintModalOpen(true)}
      />

      {/* 2. Main Canvas Area */}
      <main className="flex-1 p-4 lg:p-6 overflow-y-auto max-w-7xl mx-auto w-full space-y-6">
        
        {/* Navbar */}
        <MuseNavbar
          currentTab={currentTab}
          userRole={userRole}
          onRoleChange={setUserRole}
          onExportExcel={handleExportExcel}
        />

        {/* TAB 1: OVERVIEW & EDISI HARI INI */}
        {currentTab === "overview" && (
          <div className="space-y-6">
            
            {/* 4 Muse Stat Cards */}
            <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.04)] border border-[#f0f0f0] flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#8c8c8c] font-semibold block">ODON Terverifikasi</span>
                  <h3 className="text-xl font-extrabold text-[#141414] mt-1">156 Hari</h3>
                  <span className="text-[11px] text-emerald-600 font-bold block mt-1">
                    Edisi 10 Nov (H-1) Siap
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                  <Newspaper className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.04)] border border-[#f0f0f0] flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#8c8c8c] font-semibold block">Sektor KBLI Terbesar</span>
                  <h3 className="text-xl font-extrabold text-[#141414] mt-1">37.80%</h3>
                  <span className="text-[11px] text-[#8c8c8c] font-medium block mt-1">
                    KBLI B • Tambang Batubara
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold">
                  <Pickaxe className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.04)] border border-[#f0f0f0] flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#8c8c8c] font-semibold block">Pengeluaran Dominan</span>
                  <h3 className="text-xl font-extrabold text-[#141414] mt-1">49.98%</h3>
                  <span className="text-[11px] text-emerald-600 font-bold block mt-1">
                    Pos 6 • Net Ekspor Antardaerah
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.04)] border border-[#f0f0f0] flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#8c8c8c] font-semibold block">Scraper Pipeline H-1</span>
                  <h3 className="text-xl font-extrabold text-[#141414] mt-1">4 Portal</h3>
                  <span className="text-[11px] text-blue-600 font-mono font-medium block mt-1">
                    Radar, Benuanta, Fokus, Tribun
                  </span>
                </div>
                <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                  <Radio className="w-6 h-6" />
                </div>
              </div>
            </section>

            {/* Iconic 2-Card Hero Spotlight Layout */}
            <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
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

            {/* Recent 5 Working Days Quick Ledger */}
            <SheetLedgerTable
              rows={ledgerRows}
              isAdmin={isAdmin}
              onEditRow={() => setIsEditModalOpen(true)}
              onExportExcel={handleExportExcel}
            />

          </div>
        )}

        {/* TAB 2: MEJA KURASI BERITA (ADMIN ONLY) */}
        {currentTab === "curation" && (
          <CurationGrid
            candidates={candidates}
            onApprove={handleApproveCandidate}
            onRefreshScraper={() => alert("Menjalankan scraper H-1... 54 berita masuk antrean kurasi!")}
          />
        )}

        {/* TAB 3: BUKU KERJA MASTER SHEET 6503 */}
        {currentTab === "ledger" && (
          <SheetLedgerTable
            rows={ledgerRows}
            isAdmin={isAdmin}
            onEditRow={() => setIsEditModalOpen(true)}
            onExportExcel={handleExportExcel}
          />
        )}

        {/* TAB 4: MATRIKS BOBOT PDRB KTT */}
        {currentTab === "pdrb" && (
          <div className="space-y-6">
            <PdrbWeightsCard />
            <div className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.04)] border border-[#f0f0f0]">
              <h4 className="text-sm font-bold text-[#141414] mb-2">
                Analisis Transmisi Makroekonomi Tana Tidung 2025/2026
              </h4>
              <p className="text-xs text-[#595959] leading-relaxed">
                Perekonomian Tana Tidung sangat terkonsentrasi pada dua poros utama: <b>Ekstraktif Batubara (37.80%)</b> dan <b>Agroindustri Kelapa Sawit (23.41%)</b>. Pada sisi pengeluaran, pergerakan komoditas ini langsung memicu fluktuasi pada <b>Net Ekspor Antar Daerah (49.98%)</b> dan pembentukan modal fisik pada <b>PMTB (31.38%)</b>. Berita nasional yang tidak berhubungan dengan rantai nilai batubara, CPO, pupuk, atau belanja konstruksi pemerintah daerah akan disaring keluar oleh AI untuk menjaga presisi estimasi neraca.
              </p>
            </div>
          </div>
        )}

        {/* TAB 5: NARASI FENOMENA TRIWULANAN */}
        {currentTab === "narratives" && (
          <div className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.04)] border border-[#f0f0f0] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#f0f0f0]">
              <div>
                <h3 className="text-sm font-bold text-[#141414]">Kompilasi Narasi Fenomena Triwulanan PDRB</h3>
                <p className="text-xs text-[#8c8c8c]">Format siap pakai untuk naskah publikasi BPS Kabupaten Tana Tidung</p>
              </div>
              <button
                onClick={() => alert("Menyalin kompilasi narasi triwulanan ke clipboard...")}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-[0_4px_14px_0_rgba(24,144,255,0.35)] cursor-pointer"
              >
                Salin Narasi Lengkap
              </button>
            </div>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#141414] leading-relaxed space-y-3 font-mono">
              <p><b>[TRIWULAN IV-2026 - LAPANGAN USAHA B: PERTAMBANGAN BATUBARA]</b><br/>
              Pada Triwulan IV-2026, aktivitas pengapalan batubara melalui Terminal Khusus Bebatu mencatatkan lonjakan volume ekspor antar daerah sebesar 14.8% (Q-o-Q). Hal ini didorong oleh membaiknya cuaca perairan Sungai Sesayap dan peningkatan kuota produksi akhir tahun.</p>
              <p><b>[TRIWULAN IV-2026 - LAPANGAN USAHA F: KONSTRUKSI]</b><br/>
              Realisasi fisik pembangunan Pusat Pemerintahan Terpadu Tana Tidung mencapai 82% hingga awal November 2026. Penyerapan belanja modal konstruksi gedung dan jalan lingkar pemkab mengerek komponen PMTB dan pertumbuhan sektor konstruksi.</p>
            </div>
          </div>
        )}

        {/* TAB 6: KONVERSI KBLI 2020 ↔ 2025 */}
        {currentTab === "kbli" && <KbliCrosswalkTable />}

        {/* TAB 7: RADAR SCRAPER 4 PORTAL */}
        {currentTab === "scrapers" && <ScrapersStatusView />}

      </main>

      {/* 3. Global Dialogs & Modals */}
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

