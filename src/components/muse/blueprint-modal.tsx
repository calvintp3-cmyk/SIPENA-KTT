"use client";

import React from "react";
import { Layers, X } from "lucide-react";

interface BlueprintModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function BlueprintModal({ isOpen, onClose }: BlueprintModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.04)] border border-[#f0f0f0] p-6 space-y-4 max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#141414]">Blueprint Arsitektur & Techstack SIPENA-KTT</h4>
              <p className="text-[11px] text-[#8c8c8c]">Next.js 15 App Router • Drizzle ORM • PostgreSQL • Gemini AI</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-[#8c8c8c]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-4 text-xs">
          <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 text-blue-900 leading-relaxed">
            <b>Single Source of Truth:</b> BPS Satker 65.04 Kabupaten Tana Tidung. Bobot sektor ekonomi didominasi oleh Batubara (37.8%) dan Sawit (23.4%) pada sisi Lapangan Usaha, serta Net Ekspor (49.98%) dan PMTB (31.38%) pada sisi Pengeluaran.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <p className="font-bold text-[#141414] mb-1">Frontend Layer</p>
              <ul className="space-y-1 text-[11px] text-[#8c8c8c]">
                <li>• Next.js 15.1.7 (React 19 Server Components)</li>
                <li>• Tailwind CSS 3.4 (Muse Ant Design Tokens)</li>
                <li>• Lucide React Icons & Tipografi Inter + JetBrains Mono</li>
                <li>• TanStack Table v8 for Ledger & Faceted Filters</li>
              </ul>
            </div>

            <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
              <p className="font-bold text-[#141414] mb-1">Backend & Pipeline Layer</p>
              <ul className="space-y-1 text-[11px] text-[#8c8c8c]">
                <li>• Drizzle ORM 0.39 + PostgreSQL 16 (Neon / Local)</li>
                <li>• Scheduled Cron (05:00 WITA) H-1 Window Scraper</li>
                <li>• Google Gemini AI SDK (@google/genai) for Extraction</li>
                <li>• ExcelJS for Google Sheet 6503 ODON direct export</li>
              </ul>
            </div>
          </div>

          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50">
            <p className="font-bold text-[#141414] mb-1">Database Schema Mapping</p>
            <div className="font-mono text-[10px] bg-slate-900 text-slate-100 p-2.5 rounded-lg overflow-x-auto leading-relaxed">
odon_entries (id, date, title, url, source, raw_content, ai_summary, status, verifier_id)<br/>
odon_classifications (id, odon_id, kbli_2020, kbli_2025, expenditure_component, impact_direction, pdrb_weight)<br/>
kbli_conversions (id, code_2020, title_2020, code_2025, title_2025, lampiran_ref)
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

