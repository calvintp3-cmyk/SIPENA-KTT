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

type StatusFilter = "all" | "pending" | "accepted" | "rejected";

const STATUS_STRIPE: Record<ArticleProposal["status"], string> = {
  pending: "border-l-4 border-l-amber-400",
  accepted: "border-l-4 border-l-emerald-400",
  rejected: "border-l-4 border-l-rose-400",
};

export function ProposalsModerationView({
  onAcceptProposal,
}: ProposalsModerationViewProps) {
  const [proposals, setProposals] = useState<ArticleProposal[]>(INITIAL_PROPOSALS);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");

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

  const FILTERS: { key: StatusFilter; label: string; count: number }[] = [
    { key: "all", label: "Semua", count: proposals.length },
    { key: "pending", label: "Menunggu", count: pendingCount },
    { key: "accepted", label: "Diterima", count: acceptedCount },
    { key: "rejected", label: "Ditolak", count: rejectedCount },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="ui-card p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="ui-h1">Moderasi Usulan Berita Publik & OPD</h3>
            <span className="ui-badge ui-badge-warn num">{pendingCount} Menunggu Verifikasi</span>
          </div>
          <p className="ui-muted mt-1 max-w-2xl">
            Tinjau kontribusi berita dan fenomena ekonomi yang dikirim oleh masyarakat, akademisi, dan Organisasi Perangkat Daerah (OPD) Pemkab Tana Tidung.
          </p>
        </div>

        <div className="ui-seg" role="group" aria-label="Filter status usulan">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              aria-pressed={filterStatus === f.key}
              onClick={() => setFilterStatus(f.key)}
              className="ui-seg-item"
            >
              {f.label} (<span className="num">{f.count}</span>)
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search
          className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none"
          aria-hidden="true"
        />
        <label htmlFor="proposal-search" className="visually-hidden">
          Cari usulan berita
        </label>
        <input
          id="proposal-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari berdasarkan judul berita, nama pengusul, OPD, atau catatan ekonomi..."
          className="ui-input pr-24"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-100"
          >
            Bersihkan
          </button>
        )}
      </div>

      {/* Queue */}
      <div className="space-y-4">
        {filteredProposals.length === 0 ? (
          <div className="ui-card p-12 text-center space-y-2">
            <Inbox className="w-8 h-8 text-slate-400 mx-auto" aria-hidden="true" />
            <p className="text-sm font-semibold text-slate-900">Tidak ada usulan berita yang cocok</p>
            <p className="ui-muted">Coba ubah filter atau kata kunci pencarian Anda.</p>
          </div>
        ) : (
          filteredProposals.map((prop) => (
            <article
              key={prop.id}
              className={`ui-card ui-card-interactive p-5 sm:p-6 ${STATUS_STRIPE[prop.status]} ${
                prop.status === "rejected" ? "opacity-80" : ""
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5">
                {/* Main */}
                <div className="space-y-3.5 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
                    {prop.status === "pending" && (
                      <span className="ui-badge ui-badge-warn">Menunggu Moderasi</span>
                    )}
                    {prop.status === "accepted" && (
                      <span className="ui-badge ui-badge-success">Diterima ke Meja Kurasi</span>
                    )}
                    {prop.status === "rejected" && (
                      <span className="ui-badge ui-badge-danger">Ditolak</span>
                    )}

                    <span className="inline-flex items-center gap-1.5 text-slate-700 font-medium">
                      <User className="w-3.5 h-3.5 text-blue-600" aria-hidden="true" />
                      <span>{prop.submitterName}</span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                      <Building className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
                      <span>{prop.submitterAgency}</span>
                    </span>

                    <span className="inline-flex items-center gap-1.5 text-slate-500 num text-[11px]">
                      <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>{prop.submittedAt}</span>
                    </span>
                  </div>

                  <h4 className="text-[15px] font-semibold tracking-tight text-slate-900 leading-snug">
                    {prop.title}
                  </h4>

                  {/* Inset quote block */}
                  <blockquote className="bg-slate-50/90 border-l-2 border-slate-300 rounded-r-xl p-4 text-[13px] text-slate-600 space-y-1.5">
                    <span className="font-semibold text-slate-800 block text-[11px] uppercase tracking-wide">
                      Catatan Fenomena Ekonomi dari Pengusul:
                    </span>
                    <p className="leading-relaxed">{prop.economicNotes}</p>
                  </blockquote>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="text-slate-500">Tautan Sumber:</span>
                    <a
                      href={prop.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 hover:underline inline-flex items-center gap-1 num text-[11px] min-w-0 max-w-full"
                    >
                      <span className="truncate">{prop.url}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                    </a>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex lg:flex-col gap-2 shrink-0">
                  {prop.status === "pending" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleAccept(prop)}
                        className="ui-btn ui-btn-primary"
                      >
                        <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Terima ke Kurasi</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(prop.id)}
                        className="ui-btn ui-btn-danger-ghost"
                      >
                        <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Tolak</span>
                      </button>
                    </>
                  ) : prop.status === "accepted" ? (
                    <span className="ui-badge ui-badge-success h-9 px-3.5">
                      <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                      <span>Siap di Meja Kurasi</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleAccept(prop)}
                      className="ui-btn ui-btn-secondary"
                    >
                      Buka Kembali
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
