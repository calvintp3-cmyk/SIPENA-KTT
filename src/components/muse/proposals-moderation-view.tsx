"use client";

import React, { useState } from "react";
import {
  Inbox,
  CheckCircle,
  XCircle,
  ExternalLink,
  Search,
  Filter,
  User,
  Building,
  Clock,
  Sparkles,
  ArrowRight,
  Send,
} from "lucide-react";

export interface ArticleProposal {
  id: string;
  url: string;
  title: string;
  submitterName: string;
  submitterAgency: string;
  submitterEmail?: string;
  economicNotes: string;
  status: "pending" | "accepted" | "rejected";
  submittedAt: string;
}

const INITIAL_PROPOSALS: ArticleProposal[] = [
  {
    id: "prop-1",
    url: "https://kaltara.prokal.co/read/detail/45821-bupati-resmikan-pabrik-pengolahan-kayu-di-tana-lia",
    title: "Bupati Tana Tidung Resmikan Pabrik Pengolahan Kayu Sengon & Akasia di Kecamatan Tana Lia",
    submitterName: "Dinas Perindagkop & UKM Kab. Tana Tidung",
    submitterAgency: "OPD Pemkab Tana Tidung",
    submitterEmail: "disperindagkop@tanatidungkab.go.id",
    economicNotes:
      "Investasi baru hilirisasi hasil hutan kayu (KBLI C / Industri Pengolahan & Sektor A02 Kehutanan). Membuka lapangan kerja lokal dan menambah nilai tambah bruto daerah.",
    status: "pending",
    submittedAt: "10 Nov 2026 14:20 WITA",
  },
  {
    id: "prop-2",
    url: "https://benuanta.co.id/index.php/2026/11/08/pasokan-bbm-solar-subsidi-di-tideng-pale-kembali-lancar/",
    title: "Pasokan Solar dan Pertalite di SPBU Kompak Tideng Pale Kembali Normal Pasca Perbaikan Dermaga",
    submitterName: "Hendra Wijaya",
    submitterAgency: "Asosiasi Pengusaha Angkutan Sungai KTT",
    submitterEmail: "hendra.w@gmail.com",
    economicNotes:
      "Normalisasi kelancaran distribusi logistik dan transportasi air yang sempat terhambat cuaca buruk. Berdampak pada biaya logistik komoditas pangan.",
    status: "pending",
    submittedAt: "09 Nov 2026 18:45 WITA",
  },
  {
    id: "prop-3",
    url: "https://kaltara.tribunnews.com/2026/11/07/panen-raya-padi-gunung-di-desa-kujau-hasilkan-45-ton",
    title: "Petani Adat Kujau Gelar Syukuran Panen Padi Gunung, Hasil Mencapai 4.5 Ton Gabah Kering Giling",
    submitterName: "Penyuluh Pertanian Lapangan (PPL)",
    submitterAgency: "Dinas Pertanian dan Ketahanan Pangan KTT",
    submitterEmail: "pertanian@tanatidungkab.go.id",
    economicNotes:
      "Mendukung pasokan beras lokal musim tanam gadu di Kecamatan Sesayap, mengonfirmasi pertumbuhan subsektor tanaman pangan.",
    status: "pending",
    submittedAt: "08 Nov 2026 11:10 WITA",
  },
  {
    id: "prop-4",
    url: "https://fokusborneo.com/kaltara/tarakan/turnamen-futsal-antar-desa/",
    title: "Turnamen Futsal Antar Desa Resmi Dibuka di Lapangan Sesayap",
    submitterName: "Warga Tideng Pale",
    submitterAgency: "Masyarakat Umum",
    economicNotes: "Kegiatan olahraga pemuda desa.",
    status: "rejected",
    submittedAt: "05 Nov 2026 09:30 WITA",
  },
];

interface ProposalsModerationViewProps {
  onAcceptProposal?: (proposal: ArticleProposal) => void;
}

export function ProposalsModerationView({
  onAcceptProposal,
}: ProposalsModerationViewProps) {
  const [proposals, setProposals] = useState<ArticleProposal[]>(INITIAL_PROPOSALS);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "accepted" | "rejected">("all");

  const pendingCount = proposals.filter((p) => p.status === "pending").length;
  const acceptedCount = proposals.filter((p) => p.status === "accepted").length;
  const rejectedCount = proposals.filter((p) => p.status === "rejected").length;

  const handleAccept = (prop: ArticleProposal) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === prop.id ? { ...p, status: "accepted" as const } : p))
    );
    if (onAcceptProposal) {
      onAcceptProposal(prop);
    }
    alert(
      `Usulan dari "${prop.submitterName}" telah DITERIMA dan dimasukkan ke Antrean Meja Kurasi Tim Nerwilis!`
    );
  };

  const handleReject = (id: string) => {
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "rejected" as const } : p))
    );
    alert("Usulan ditolak karena tidak memenuhi kriteria fenomena ekonomi PDRB.");
  };

  const filteredProposals = proposals.filter((p) => {
    const matchesFilter = filterStatus === "all" ? true : p.status === filterStatus;
    const matchesSearch =
      search === "" ||
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.submitterName.toLowerCase().includes(search.toLowerCase()) ||
      p.submitterAgency.toLowerCase().includes(search.toLowerCase()) ||
      p.economicNotes.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.04)] border border-[#f0f0f0] flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-extrabold text-[#141414] tracking-tight">
              Moderasi Usulan Berita Publik & OPD
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-mono font-bold">
              {pendingCount} Menunggu Verifikasi
            </span>
          </div>
          <p className="text-xs text-[#595959] mt-1 max-w-2xl">
            Tinjau kontribusi berita dan fenomena ekonomi yang dikirim oleh masyarakat, akademisi, dan Organisasi Perangkat Daerah (OPD) Pemkab Tana Tidung.
          </p>
        </div>

        {/* Status Filter Badges */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              filterStatus === "all"
                ? "bg-slate-900 text-white"
                : "bg-slate-100 text-[#595959] hover:bg-slate-200"
            }`}
          >
            Semua ({proposals.length})
          </button>
          <button
            onClick={() => setFilterStatus("pending")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              filterStatus === "pending"
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            Menunggu ({pendingCount})
          </button>
          <button
            onClick={() => setFilterStatus("accepted")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              filterStatus === "accepted"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            Diterima ({acceptedCount})
          </button>
          <button
            onClick={() => setFilterStatus("rejected")}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              filterStatus === "rejected"
                ? "bg-rose-600 text-white shadow-sm"
                : "bg-rose-50 text-rose-700 hover:bg-rose-100"
            }`}
          >
            Ditolak ({rejectedCount})
          </button>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] border border-[#f0f0f0] flex items-center gap-3">
        <Search className="w-4 h-4 text-[#8c8c8c]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari berdasarkan judul berita, nama pengusul, OPD, atau catatan ekonomi..."
          className="w-full text-xs text-[#141414] placeholder-[#8c8c8c] bg-transparent focus:outline-hidden"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="text-xs text-[#8c8c8c] hover:text-[#141414]"
          >
            Bersihkan
          </button>
        )}
      </div>

      {/* Proposals List Cards */}
      <div className="space-y-4">
        {filteredProposals.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-[#f0f0f0] space-y-2">
            <Inbox className="w-8 h-8 text-[#8c8c8c] mx-auto" />
            <p className="text-xs font-semibold text-[#141414]">Tidak ada usulan berita yang cocok</p>
            <p className="text-[11px] text-[#8c8c8c]">Coba ubah filter atau kata kunci pencarian Anda.</p>
          </div>
        ) : (
          filteredProposals.map((prop) => (
            <div
              key={prop.id}
              className={`bg-white rounded-2xl p-5 shadow-[0_1px_3px_0_rgba(0,0,0,0.05)] border transition-all ${
                prop.status === "pending"
                  ? "border-amber-200 hover:border-blue-300"
                  : prop.status === "accepted"
                  ? "border-emerald-200 bg-emerald-50/20"
                  : "border-slate-200 opacity-70"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                
                {/* Main Content */}
                <div className="space-y-3 flex-1">
                  
                  {/* Status & Submitter meta */}
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {prop.status === "pending" && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200 text-[11px]">
                        Menunggu Moderasi
                      </span>
                    )}
                    {prop.status === "accepted" && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200 text-[11px]">
                        Diterima ke Meja Kurasi
                      </span>
                    )}
                    {prop.status === "rejected" && (
                      <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 font-bold border border-rose-200 text-[11px]">
                        Ditolak
                      </span>
                    )}

                    <span className="text-[#8c8c8c]">•</span>
                    
                    <span className="flex items-center gap-1 text-[#595959] font-medium">
                      <User className="w-3.5 h-3.5 text-blue-600" />
                      <span>{prop.submitterName}</span>
                    </span>

                    <span className="text-[#8c8c8c]">•</span>

                    <span className="flex items-center gap-1 text-[#595959]">
                      <Building className="w-3.5 h-3.5 text-slate-500" />
                      <span>{prop.submitterAgency}</span>
                    </span>

                    <span className="text-[#8c8c8c]">•</span>

                    <span className="flex items-center gap-1 text-[#8c8c8c] font-mono text-[11px]">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{prop.submittedAt}</span>
                    </span>
                  </div>

                  {/* News Title */}
                  <h4 className="text-sm font-bold text-[#141414] leading-snug">
                    {prop.title}
                  </h4>

                  {/* Submitter's Economic Notes */}
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#595959] space-y-1">
                    <span className="font-semibold text-[#141414] block text-[11px] uppercase tracking-wide">
                      Catatan Fenomena Ekonomi dari Pengusul:
                    </span>
                    <p className="leading-relaxed">{prop.economicNotes}</p>
                  </div>

                  {/* URL Reference */}
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-[#8c8c8c]">Tautan Sumber:</span>
                    <a
                      href={prop.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline flex items-center gap-1 font-mono text-[11px] truncate max-w-md"
                    >
                      <span>{prop.url}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>

                </div>

                {/* Action Buttons */}
                <div className="flex lg:flex-col gap-2 shrink-0 pt-2 lg:pt-0">
                  {prop.status === "pending" ? (
                    <>
                      <button
                        onClick={() => handleAccept(prop)}
                        className="px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold shadow-[0_4px_14px_0_rgba(24,144,255,0.35)] hover:bg-blue-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span>Terima ke Kurasi</span>
                      </button>
                      <button
                        onClick={() => handleReject(prop.id)}
                        className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-xs font-semibold text-[#595959] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Tolak</span>
                      </button>
                    </>
                  ) : prop.status === "accepted" ? (
                    <div className="text-right">
                      <span className="text-xs text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle className="w-4 h-4" />
                        <span>Siap di Meja Kurasi</span>
                      </span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleAccept(prop)}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-[#595959] hover:bg-slate-100 cursor-pointer"
                    >
                      Buka Kembali
                    </button>
                  )}
                </div>

              </div>
            </div>
          ))
        )}
      </div>

    </div>
  );
}

