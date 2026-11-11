"use client";

import React, { useEffect } from "react";
import { Layers, X } from "lucide-react";

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
    <div className="ui-modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
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
              <h4 id="blueprint-modal-title" className="ui-h2">Blueprint Arsitektur & Techstack SIPENA-KTT</h4>
              <p className="text-xs text-slate-500">Next.js 15 App Router • Drizzle ORM • PostgreSQL • Gemini AI</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup dialog" className="ui-icon-btn !border-transparent !shadow-none">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4 text-sm">
          <div className="p-4 bg-blue-50/60 rounded-xl ring-1 ring-inset ring-blue-600/15 text-blue-950 leading-relaxed text-[13px]">
            <b className="font-semibold">Single Source of Truth:</b> BPS Satker 65.04 Kabupaten Tana Tidung. Bobot sektor ekonomi didominasi oleh Batubara (<span className="num">37.8%</span>) dan Sawit (<span className="num">23.4%</span>) pada sisi Lapangan Usaha, serta Net Ekspor (<span className="num">49.98%</span>) dan PMTB (<span className="num">31.38%</span>) pada sisi Pengeluaran.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl ring-1 ring-inset ring-slate-200/80 bg-slate-50/70">
              <p className="font-semibold text-slate-900 mb-2 text-[13px]">Frontend Layer</p>
              <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed">
                <li>• Next.js 15.1.7 (React 19 Server Components)</li>
                <li>• Tailwind CSS 3.4 (Muse Ant Design Tokens)</li>
                <li>• Lucide React Icons & Tipografi Inter + JetBrains Mono</li>
                <li>• TanStack Table v8 for Ledger & Faceted Filters</li>
              </ul>
            </div>

            <div className="p-4 rounded-xl ring-1 ring-inset ring-slate-200/80 bg-slate-50/70">
              <p className="font-semibold text-slate-900 mb-2 text-[13px]">Backend & Pipeline Layer</p>
              <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed">
                <li>• Drizzle ORM 0.39 + PostgreSQL 16 (Neon / Local)</li>
                <li>• Scheduled Cron (05:00 WITA) H-1 Window Scraper</li>
                <li>• Google Gemini AI SDK (@google/genai) for Extraction</li>
                <li>• ExcelJS for Google Sheet 6503 ODON direct export</li>
              </ul>
            </div>
          </div>

          <div className="p-4 rounded-xl ring-1 ring-inset ring-slate-200/80 bg-slate-50/70">
            <p className="font-semibold text-slate-900 mb-2 text-[13px]">Database Schema Mapping</p>
            <pre className="text-[11px] bg-slate-950 text-slate-100 p-3.5 rounded-lg overflow-x-auto leading-relaxed">
{`odon_entries (id, date, title, url, source, raw_content, ai_summary, status, verifier_id)
odon_classifications (id, odon_id, kbli_2020, kbli_2025, expenditure_component, impact_direction, pdrb_weight)
kbli_conversions (id, code_2020, title_2020, code_2025, title_2025, lampiran_ref)`}
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
