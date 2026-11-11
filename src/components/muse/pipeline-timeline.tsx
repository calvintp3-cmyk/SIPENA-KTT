"use client";

import React from "react";
import { Check, Cpu, UserCheck, FileSpreadsheet } from "lucide-react";
import type { OdonKpiSummaryDto } from "@/types/odon";

interface PipelineTimelineProps {
  kpis?: OdonKpiSummaryDto;
}

export function PipelineTimeline({ kpis }: PipelineTimelineProps) {
  const portalsCount = kpis?.activePortalsCount ?? 7;
  const articlesCount = kpis?.totalArticlesCount ?? 0;
  const pendingCount = kpis?.pendingCandidatesCount ?? 0;
  const verifiedCount = kpis?.verifiedCount ?? 0;

  const steps = [
    {
      icon: Check,
      dot: "bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]",
      iconBox: "bg-emerald-50 text-emerald-600 ring-emerald-600/20",
      title: `05:00 WITA • Scraper ${portalsCount} Portal`,
      desc: `Total ${articlesCount} artikel terjaring dari Koran Kaltara, Radar Tarakan, Tribun, Benuanta, Fokus Borneo, Antara & Media Nasional.`,
    },
    {
      icon: Cpu,
      dot: "bg-blue-500 shadow-[0_0_0_4px_rgba(59,130,246,0.15)]",
      iconBox: "bg-blue-50 text-blue-600 ring-blue-600/20",
      title: "05:30 WITA • Ekstraksi AI Gemini",
      desc: `Mencocokkan bobot sektor PDRB KTT & menandai ${pendingCount} kandidat menunggu di Meja Kurasi AI.`,
    },
    {
      icon: UserCheck,
      dot: "bg-indigo-500 shadow-[0_0_0_4px_rgba(99,102,241,0.15)]",
      iconBox: "bg-indigo-50 text-indigo-600 ring-indigo-600/20",
      title: "Validasi Human-in-the-Loop Nerwilis",
      desc: "Petugas BPS memvalidasi KBLI 2020 <-> KBLI 2025 dan Pos Pengeluaran sebelum penetapan harian.",
    },
    {
      icon: FileSpreadsheet,
      dot: "bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.15)]",
      iconBox: "bg-amber-50 text-amber-600 ring-amber-600/20",
      title: "Sinkronisasi Sheet 6503",
      desc: `${verifiedCount} entri terverifikasi tersimpan di PostgreSQL dan siap diekspor ke .xlsx resmi BPS.`,
    },
  ];

  return (
    <div className="ui-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200/80">
        <h4 className="ui-h2">Jejak Alur Kerja ODON</h4>
        <span className="ui-badge ui-badge-info">Siklus Harian</span>
      </div>

      <ol className="mt-5">
        {steps.map((s, i) => {
          const Icon = s.icon;
          const last = i === steps.length - 1;
          return (
            <li key={s.title} className="relative flex gap-3.5 pb-5 last:pb-0">
              {!last && (
                <span
                  aria-hidden="true"
                  className="absolute left-[15px] top-8 bottom-0 w-px bg-gradient-to-b from-slate-300 to-slate-200"
                />
              )}
              <span
                className={`relative z-10 w-8 h-8 shrink-0 rounded-full flex items-center justify-center ring-1 ring-inset ${s.iconBox}`}
              >
                <Icon className="w-4 h-4" aria-hidden="true" />
                <span
                  aria-hidden="true"
                  className={`absolute -right-0.5 -bottom-0.5 w-2.5 h-2.5 rounded-full border-2 border-white ${s.dot}`}
                />
              </span>
              <div className="min-w-0 pt-0.5">
                <p className="text-[13px] font-semibold text-slate-900 leading-snug">{s.title}</p>
                <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{s.desc}</p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
