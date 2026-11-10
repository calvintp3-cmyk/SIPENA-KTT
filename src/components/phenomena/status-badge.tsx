"use client";

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import {
  EXPENDITURE_COMPONENTS,
  KBLI_CATEGORIES,
  SOURCE_MEDIA_LABELS,
  STATUS_META,
} from "@/lib/constants/taxonomy";
import type {
  ExpenditureCode,
  ImpactDirection,
  KbliCode,
  PhenomenonStatus,
  PriceVolumeEffect,
} from "@/types/client";

export function StatusBadge({ status }: { status: PhenomenonStatus }) {
  const meta = STATUS_META[status] ?? {
    label: status,
    badgeClass: "bg-slate-800 text-slate-300 border-slate-700",
  };
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wide ${meta.badgeClass}`}
    >
      {meta.label}
    </span>
  );
}

export function KbliBadge({
  code,
  subsector,
}: {
  code: KbliCode | null;
  subsector?: string | null;
}) {
  if (!code) {
    return (
      <span className="font-mono text-[11px] text-slate-500">
        Belum terklasifikasi
      </span>
    );
  }
  const meta = KBLI_CATEGORIES[code];
  return (
    <div className="min-w-0">
      <span
        className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[11px] font-semibold ${meta.badgeColor}`}
      >
        {meta.code === "M_N"
          ? "M,N"
          : meta.code === "R_S_T_U"
            ? "R-U"
            : meta.code}{" "}
        &middot; {meta.shortName}
      </span>
      {subsector && (
        <span className="mt-0.5 block truncate text-[11px] text-slate-400">
          {subsector}
        </span>
      )}
    </div>
  );
}

export function ExpenditureBadge({ code }: { code: ExpenditureCode | null }) {
  if (!code) {
    return <span className="font-mono text-[11px] text-slate-500">-</span>;
  }
  const meta = EXPENDITURE_COMPONENTS[code];
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 font-mono text-[11px] font-medium ${meta.badgeColor}`}
    >
      {meta.label}
    </span>
  );
}

const EFFECT_LABELS: Record<PriceVolumeEffect, string> = {
  volume: "Volume",
  harga: "Harga",
  keduanya: "Harga & Volume",
  tidak_langsung: "Tidak Langsung",
};

export function ImpactIndicator({
  impact,
  effect,
}: {
  impact: ImpactDirection | null;
  effect: PriceVolumeEffect | null;
}) {
  const effectText = effect ? EFFECT_LABELS[effect] : "-";

  if (impact === "positif") {
    return (
      <div className="font-mono text-[11px]">
        <span className="flex items-center gap-1 font-medium text-emerald-400">
          <ArrowUp className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>Positif</span>
        </span>
        <span className="text-[10px] text-slate-400">{effectText}</span>
      </div>
    );
  }
  if (impact === "negatif") {
    return (
      <div className="font-mono text-[11px]">
        <span className="flex items-center gap-1 font-medium text-rose-400">
          <ArrowDown className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>Negatif</span>
        </span>
        <span className="text-[10px] text-slate-400">{effectText}</span>
      </div>
    );
  }
  return (
    <div className="font-mono text-[11px]">
      <span className="flex items-center gap-1 font-medium text-slate-300">
        <Minus className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span>Netral</span>
      </span>
      <span className="text-[10px] text-slate-400">{effectText}</span>
    </div>
  );
}

export function SourceMediaLabel({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center rounded border border-slate-700 bg-slate-800/90 px-1.5 py-0.5 font-mono text-[10px] font-medium text-slate-200">
      {SOURCE_MEDIA_LABELS[source] ?? source}
    </span>
  );
}

