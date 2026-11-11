"use client";

import React, { useState } from "react";
import {
  Inbox,
  CheckCircle,
  XCircle,
  ExternalLink,
  Search,
  User,
  Building,
  Clock,
} from "lucide-react";
import type { OdonProposalDto } from "@/types/odon";

interface ProposalsModerationViewProps {
  proposals: OdonProposalDto[];
  onModerate: (id: string, action: "accept" | "reject") => Promise<void>;
  busyProposalId?: string | null;
}

type StatusFilter = "all" | "pending" | "accepted" | "rejected";

const STATUS_STRIPE: Record<OdonProposalDto["status"], string> = {
  pending: "border-l-4 border-l-amber-400",
  accepted: "border-l-4 border-l-emerald-400",
  rejected: "border-l-4 border-l-rose-400",
};

export function ProposalsModerationView({
  proposals,
  onModerate,
  busyProposalId = null,
}: ProposalsModerationViewProps) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");

  const pendingCount = proposals.filter((p) => p.status === "pending").length;
  const acceptedCount = proposals.filter((p) => p.status === "accepted").length;
  const rejectedCount = proposals.filter((p) => p.status === "rejected").length;

  const filteredProposals = proposals.filter((p) => {
    const matchesFilter = filterStatus === "all" ? true : p.status === filterStatus;
    const q = search.trim().toLowerCase();
    const matchesSearch =
      q === "" ||
      p.title.toLowerCase().includes(q) ||
      p.url.toLowerCase().includes(q) ||
      p.submitterName.toLowerCase().includes(q) ||
      p.submitterAgency.toLowerCase().includes(q) ||
      p.economicNotes.toLowerCase().includes(q);
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
            Tinjau kontribusi tautan berita yang dikirim oleh masyarakat, akademisi, dan OPD Kab. Tana Tidung dari database <code className="text-xs">article_proposals</code>.
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
          placeholder="Cari berdasarkan judul berita, nama pengusul, OPD, URL, atau catatan ekonomi..."
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
            <p className="text-sm font-semibold text-slate-900">
              {proposals.length === 0
                ? "Belum ada usulan berita masuk"
                : "Tidak ada usulan berita yang cocok"}
            </p>
            <p className="ui-muted">
              {proposals.length === 0
                ? "Usulan yang dikirim publik melalui tombol Usulkan Berita Daerah akan muncul di sini."
                : "Coba ubah filter atau kata kunci pencarian Anda."}
            </p>
          </div>
        ) : (
          filteredProposals.map((prop) => {
            const isBusy = busyProposalId === prop.id;
            return (
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
                          disabled={isBusy}
                          onClick={() => void onModerate(prop.id, "accept")}
                          className="ui-btn ui-btn-primary"
                        >
                          <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>{isBusy ? "Memproses..." : "Terima ke Kurasi"}</span>
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => void onModerate(prop.id, "reject")}
                          className="ui-btn ui-btn-danger-ghost"
                        >
                          <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Tolak</span>
                        </button>
                      </>
                    ) : prop.status === "accepted" ? (
                      <span className="ui-badge ui-badge-success h-9 px-3.5">
                        <CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />
                        <span>Masuk Meja Kurasi</span>
                      </span>
                    ) : (
                      <button
                        type="button"
                        disabled={isBusy}
                        onClick={() => void onModerate(prop.id, "accept")}
                        className="ui-btn ui-btn-secondary"
                      >
                        {isBusy ? "Memproses..." : "Buka Kembali"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
