"use client";

import React, { useEffect } from "react";
import { Layers, X } from "lucide-react";
import { PDRB_KTT_WEIGHTS } from "@/lib/constants/taxonomy";

interface BlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BlueprintModal({ isOpen, onClose }: BlueprintModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="ui-modal-scrim"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="blueprint-modal-title"
        className="ui-modal max-w-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2.5 bg-blue-600 text-white shadow-sm shadow-blue-600/30">
              <Layers className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h4 id="blueprint-modal-title" className="ui-h2">
                Blueprint Arsitektur & Techstack SIPENA-KTT
              </h4>
              <p className="text-xs text-slate-500">
                Next.js 15 App Router • Drizzle ORM • PostgreSQL • Gemini AI
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup dialog"
            className="ui-icon-btn !border-transparent !shadow-none"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-sm">
          <div className="p-4 bg-blue-50/60 rounded-xl ring-1 ring-inset ring-blue-600/15 text-blue-950 leading-relaxed text-[13px]">
            <b className="font-semibold">Single Source of Truth:</b> BPS Satker 65.04 Kab. Tana Tidung (Distribusi PDRB ADHB 2025 Seri 2010). Top 4 Lapangan Usaha: Batubara (<span className="num">{PDRB_KTT_WEIGHTS.lapanganUsaha.B.weight.toFixed(2)}%</span>), Pertanian/Sawit (<span className="num">{PDRB_KTT_WEIGHTS.lapanganUsaha.A.weight.toFixed(2)}%</span>), Konstruksi (<span className="num">{PDRB_KTT_WEIGHTS.lapanganUsaha.F.weight.toFixed(2)}%</span>), Administrasi Pemerintahan (<span className="num">{PDRB_KTT_WEIGHTS.lapanganUsaha.O.weight.toFixed(2)}%</span>). Top 2 Pengeluaran: Net Ekspor (<span className="num">{PDRB_KTT_WEIGHTS.pengeluaran.NET_EKSPOR.weight.toFixed(2)}%</span>) & PMTB (<span className="num">{PDRB_KTT_WEIGHTS.pengeluaran.PMTB.weight.toFixed(2)}%</span>).
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl ring-1 ring-inset ring-slate-200/80 bg-slate-50/70">
              <p className="font-semibold text-slate-900 mb-2 text-[13px]">Frontend & API Layer</p>
              <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed">
                <li>• Next.js 15.1.7 App Router (React 19 SSR)</li>
                <li>• Tailwind CSS 3.4 & Lucide Icons</li>
                <li>• REST Endpoints: /api/odon, /api/proposals, /api/kbli</li>
                <li>• Session JWT RBAC & Rate Limiting + SSRF Allowlist</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl ring-1 ring-inset ring-slate-200/80 bg-slate-50/70">
              <p className="font-semibold text-slate-900 mb-2 text-[13px]">Backend & Pipeline Layer</p>
              <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed">
                <li>• Drizzle ORM 0.39 + PostgreSQL 16 (sipena_ktt)</li>
                <li>• Scraper H-1 7 Portal Berita Kaltara & Nasional</li>
                <li>• Google Gemini AI (@ai-sdk/google) Extraction</li>
                <li>• ExcelJS Sheet 6503 ODON Streaming Export (.xlsx)</li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-xl ring-1 ring-inset ring-slate-200/80 bg-slate-50/70">
            <p className="font-semibold text-slate-900 mb-2 text-[13px]">Database Schema Mapping</p>
            <pre className="text-[11px] bg-slate-950 text-slate-100 p-3.5 rounded-lg overflow-x-auto leading-relaxed">
{`odon_entries (id, article_id, entry_date, published_date, source_media, source_url, title, status, verified_by)
odon_classifications (id, odon_id, kbli_category, kbli_code_2020, kbli_code_2025, pdrb_weight, expenditure_component, impact_type)
kbli_conversions (id, code_2020, title_2020, code_2025, title_2025, lampiran_ref, conversion_type)
article_proposals (id, url, title, submitter_name, submitter_agency, economic_notes, status, reviewed_by)`}
            </pre>
          </div>
        </div>

        <div className="flex justify-end px-6 py-4 border-t border-slate-200/80">
          <button type="button" onClick={onClose} className="ui-btn ui-btn-primary">
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
