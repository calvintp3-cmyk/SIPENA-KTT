"use client";

import React from "react";
import { BookOpen, Layers, ShieldCheck, Clock, Sparkles, Compass } from "lucide-react";
import { PDRB_KTT_WEIGHTS, PORTAL_SOURCES } from "@/lib/constants/taxonomy";

const PRINCIPLES = [
  {
    icon: Compass,
    box: "bg-blue-50 text-blue-600 ring-blue-600/15",
    title: "1. Prinsip Single Source of Truth",
    body: (
      <>
        Format ODON diadopsi langsung dari standar{" "}
        <b className="font-semibold text-slate-900">Sheet 6503 BPS Kabupaten Tana Tidung</b>,
        menggunakan bobot resmi{" "}
        <b className="font-semibold text-slate-900">Distribusi PDRB ADHB 2025 (Seri 2010)</b> serta{" "}
        <b className="font-semibold text-slate-900">Lampiran 5 BPS0000 KBLI 2020 ↔ KBLI 2025</b>.
      </>
    ),
  },
  {
    icon: Layers,
    box: "bg-emerald-50 text-emerald-600 ring-emerald-600/15",
    title: "2. Dual-Pillar Balance Transmission",
    body: (
      <>
        Setiap berita wajib diklasifikasikan secara berpasangan:{" "}
        <b className="font-semibold text-slate-900">Sisi Lapangan Usaha (17 Sektor KBLI)</b> dan{" "}
        <b className="font-semibold text-slate-900">Sisi Pengeluaran (Komponen PDRB)</b> agar
        dinamika ekonomi dapat direkonsiliasi serentak pada dua pendekatan.
      </>
    ),
  },
  {
    icon: ShieldCheck,
    box: "bg-amber-50 text-amber-600 ring-amber-600/15",
    title: "3. Human-in-the-Loop Verification",
    body: (
      <>
        Walaupun pengumpulan berita dan ekstraksi awal dibantu crawler dan AI Gemini, penetapan entri resmi harian{" "}
        <b className="font-semibold text-slate-900">mutlak disahkan oleh Tim Nerwilis BPS 6504</b>{" "}
        demi akurasi kodifikasi KBLI dan netralitas statistik.
      </>
    ),
  },
];

const SUPPLY_SIDE = [
  {
    label: `Sektor B: ${PDRB_KTT_WEIGHTS.lapanganUsaha.B.name}`,
    value: `${PDRB_KTT_WEIGHTS.lapanganUsaha.B.weight.toFixed(2)}%`,
  },
  {
    label: `Sektor A: ${PDRB_KTT_WEIGHTS.lapanganUsaha.A.name}`,
    value: `${PDRB_KTT_WEIGHTS.lapanganUsaha.A.weight.toFixed(2)}%`,
  },
  {
    label: `Sektor F: ${PDRB_KTT_WEIGHTS.lapanganUsaha.F.name}`,
    value: `${PDRB_KTT_WEIGHTS.lapanganUsaha.F.weight.toFixed(2)}%`,
  },
  {
    label: `Sektor O: ${PDRB_KTT_WEIGHTS.lapanganUsaha.O.name}`,
    value: `${PDRB_KTT_WEIGHTS.lapanganUsaha.O.weight.toFixed(2)}%`,
  },
];

const DEMAND_SIDE = [
  {
    label: PDRB_KTT_WEIGHTS.pengeluaran.NET_EKSPOR.label,
    value: `${PDRB_KTT_WEIGHTS.pengeluaran.NET_EKSPOR.weight.toFixed(2)}%`,
    strong: true,
  },
  {
    label: PDRB_KTT_WEIGHTS.pengeluaran.PMTB.label,
    value: `${PDRB_KTT_WEIGHTS.pengeluaran.PMTB.weight.toFixed(2)}%`,
    strong: true,
  },
  {
    label: PDRB_KTT_WEIGHTS.pengeluaran.PK_P.label,
    value: `${PDRB_KTT_WEIGHTS.pengeluaran.PK_P.weight.toFixed(2)}%`,
    strong: false,
  },
  {
    label: PDRB_KTT_WEIGHTS.pengeluaran.PK_RT.label,
    value: `${PDRB_KTT_WEIGHTS.pengeluaran.PK_RT.weight.toFixed(2)}%`,
    strong: false,
  },
  {
    label: PDRB_KTT_WEIGHTS.pengeluaran.PK_LNPRT.label,
    value: `${PDRB_KTT_WEIGHTS.pengeluaran.PK_LNPRT.weight.toFixed(2)}%`,
    strong: false,
  },
  {
    label: PDRB_KTT_WEIGHTS.pengeluaran.PI.label,
    value: `${PDRB_KTT_WEIGHTS.pengeluaran.PI.weight.toFixed(2)}%`,
    strong: false,
  },
];

const LIFECYCLE = [
  {
    time: "05:00 WITA",
    title: `1. Crawler ${PORTAL_SOURCES.length} Portal Media`,
    body: "Bot menyisir 7 sumber resmi: Koran Kaltara, Radar Tarakan, Tribun Kaltara, Benuanta, Fokus Borneo, Antara Kaltara, dan Media Nasional.",
    tone: "border-blue-200/70 bg-blue-50/40",
    chip: "text-blue-700 ring-blue-200",
    dot: "bg-blue-500",
  },
  {
    time: "05:30 WITA",
    title: "2. Ekstraksi AI & KBLI 2025",
    body: "Gemini AI menyaring fenomena ekonomi KTT, merangkum narasi standar BPS, dan memetakan KBLI 2020 <-> KBLI 2025.",
    tone: "border-sky-200/70 bg-sky-50/40",
    chip: "text-sky-700 ring-sky-200",
    dot: "bg-sky-500",
  },
  {
    time: "07:30 WITA",
    title: "3. Kurasi Tim Nerwilis",
    body: "Analis BPS 6504 meninjau antrean di Meja Kurasi AI maupun usulan OPD/publik, memvalidasi kode KBLI dan Pengeluaran.",
    tone: "border-amber-200/70 bg-amber-50/40",
    chip: "text-amber-700 ring-amber-200",
    dot: "bg-amber-500",
  },
  {
    time: "08:00 WITA",
    title: "4. Sinkronisasi Sheet 6503",
    body: "Entri terverifikasi tampil di portal publik & Buku Kerja Sheet 6503 serta siap diekspor ke format Excel resmi (.xlsx).",
    tone: "border-emerald-200/70 bg-emerald-50/40",
    chip: "text-emerald-700 ring-emerald-200",
    dot: "bg-emerald-500",
  },
];

function WeightRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3 bg-white px-3.5 py-3 rounded-xl ring-1 ring-inset ring-slate-200/80 transition-colors hover:ring-slate-300">
      <span className="text-[13px] font-medium text-slate-800 leading-snug">{label}</span>
      <span className={`num font-bold text-[13px] shrink-0 ${valueClass}`}>{value}</span>
    </div>
  );
}

export function MethodologyView() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="ui-card p-6 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="ui-badge ui-badge-info num">Standar BPS 65.04</span>
              <span className="text-xs text-slate-500 font-medium">Buku Panduan Nerwilis</span>
            </div>
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
              Metodologi & Prinsip Satu Data ODON (One Day One News)
            </h3>
            <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
              Panduan resmi pencatatan fenomena ekonomi harian Kabupaten Tana Tidung berdasarkan Distribusi PDRB ADHB 2025 (Seri 2010) dan Crosswalk KBLI 2020 ↔ KBLI 2025.
            </p>
          </div>
          <div className="rounded-xl p-3.5 bg-blue-600 text-white shadow-md shadow-blue-600/25">
            <BookOpen className="w-6 h-6" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Principles */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PRINCIPLES.map((p) => {
          const Icon = p.icon;
          return (
            <div key={p.title} className="ui-card ui-card-interactive p-6 space-y-3">
              <div
                className={`w-10 h-10 rounded-xl ring-1 ring-inset flex items-center justify-center ${p.box}`}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
              </div>
              <h4 className="ui-h2">{p.title}</h4>
              <p className="text-[13px] text-slate-600 leading-relaxed">{p.body}</p>
            </div>
          );
        })}
      </div>

      {/* Dual pillars */}
      <div className="ui-card overflow-hidden">
        <div className="ui-card-header !justify-start gap-2.5">
          <Sparkles className="w-4 h-4 text-blue-600" aria-hidden="true" />
          <h4 className="ui-h2">
            Struktur Pembobotan PDRB ADHB Kabupaten Tana Tidung Tahun 2025 (Seri 2010)
          </h4>
        </div>

        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-5 rounded-2xl bg-slate-50/80 ring-1 ring-inset ring-slate-200/70 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-900">
                Pilar 1: Lapangan Usaha (Supply-Side)
              </span>
              <span className="ui-badge ui-badge-info num">
                Top 4 = {PDRB_KTT_WEIGHTS.top4LapanganUsahaShare}% PDRB
              </span>
            </div>
            <p className="text-[13px] text-slate-600 leading-relaxed">
              Prioritas analisis mengacu pada 4 sektor dengan kontribusi terbesar di Kab. Tana Tidung (ditambah Jasa Pendidikan 1.29%, Perdagangan 5.06%, Industri Pengolahan 3.54%, dan Transportasi 0.64%):
            </p>
            <div className="space-y-2">
              {SUPPLY_SIDE.map((r) => (
                <WeightRow
                  key={r.label}
                  label={r.label}
                  value={r.value}
                  valueClass="text-blue-700"
                />
              ))}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50/80 ring-1 ring-inset ring-slate-200/70 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-900">
                Pilar 2: Komponen Pengeluaran (Demand-Side)
              </span>
              <span className="ui-badge ui-badge-success num">
                Top 2 = {PDRB_KTT_WEIGHTS.top2PengeluaranShare}% PDRB
              </span>
            </div>
            <p className="text-[13px] text-slate-600 leading-relaxed">
              Setiap fenomena produksi diterjemahkan ke pos pengeluaran PDRB 2025:
            </p>
            <div className="space-y-2">
              {DEMAND_SIDE.map((r) => (
                <WeightRow
                  key={r.label}
                  label={r.label}
                  value={r.value}
                  valueClass={r.strong ? "text-emerald-700" : "text-slate-600"}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Daily lifecycle */}
      <div className="ui-card p-6 space-y-4">
        <h4 className="ui-h2 flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600" aria-hidden="true" />
          <span>Siklus Operasional Harian ODON (WITA / UTC+8)</span>
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 pt-1">
          {LIFECYCLE.map((s) => (
            <div key={s.time} className={`p-4 rounded-xl border space-y-2 ${s.tone}`}>
              <span
                className={`inline-flex items-center gap-1.5 text-[11px] num font-bold bg-white px-2.5 py-0.5 rounded-full ring-1 ring-inset ${s.chip}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} aria-hidden="true" />
                {s.time}
              </span>
              <h5 className="text-[13px] font-semibold text-slate-900">{s.title}</h5>
              <p className="text-xs text-slate-600 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
