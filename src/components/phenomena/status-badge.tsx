"use client";

import {
  ArrowDown,
  ArrowUp,
  Check,
  Clock,
  Minus,
  RotateCcw,
  X,
} from "lucide-react";
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

function StatusGlyph({ status }: { status: PhenomenonStatus }) {
  switch (status) {
    case "approved":
      return <Check className="h-3 w-3 shrink-0" aria-hidden="true" />;
    case "rejected":
      return <X className="h-3 w-3 shrink-0" aria-hidden="true" />;
    case "needs_revision":
      return <RotateCcw className="h-3 w-3 shrink-0" aria-hidden="true" />;
    case "pending":
    default:
      return <Clock className="h-3 w-3 shrink-0" aria-hidden="true" />;
  }
}

export function StatusBadge({ status }: { status: PhenomenonStatus }) {
  const meta = STATUS_META[status] ?? {
    label: status,
    badgeClass:
      "border-[var(--border-subtle)] bg-[var(--bg-subtle)] text-[var(--text-secondary)]",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold tracking-tight ${meta.badgeClass}`}
    >
      <StatusGlyph status={status} />
      <span>{meta.label}</span>
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
      <span className="text-xs text-[var(--text-muted)]">
        Belum terklasifikasi
      </span>
    );
  }
  const meta = KBLI_CATEGORIES[code];
  const shortCode =
    meta.code === "M_N" ? "M,N" : meta.code === "R_S_T_U" ? "R-U" : meta.code;

  return (
    <div className="min-w-0">
      <div className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2 py-0.5 text-xs">
        <span
          className={`inline-flex h-4 min-w-[1.25rem] items-center justify-center rounded px-1 font-mono text-[10px] font-bold text-white ${meta.swatchColor}`}
        >
          {shortCode}
        </span>
        <span className="truncate font-medium text-[var(--text-primary)]">
          {meta.shortName}
        </span>
      </div>
      {subsector && (
        <span className="mt-1 block truncate text-[11px] text-[var(--text-muted)]">
          {subsector}
        </span>
      )}
    </div>
  );
}

export function ExpenditureBadge({ code }: { code: ExpenditureCode | null }) {
  if (!code) {
    return <span className="font-mono text-xs text-[var(--text-muted)]">-</span>;
  }
  const meta = EXPENDITURE_COMPONENTS[code];
  return (
    <span
      title={meta.fullName}
      className={`inline-flex items-center rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold ${meta.badgeColor}`}
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
      <div className="text-xs">
        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300">
          <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Positif</span>
        </span>
        <span className="block font-mono text-[11px] text-[var(--text-muted)]">
          {effectText}
        </span>
      </div>
    );
  }
  if (impact === "negatif") {
    return (
      <div className="text-xs">
        <span className="inline-flex items-center gap-1 font-semibold text-rose-700 dark:text-rose-300">
          <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Negatif</span>
        </span>
        <span className="block font-mono text-[11px] text-[var(--text-muted)]">
          {effectText}
        </span>
      </div>
    );
  }
  return (
    <div className="text-xs">
      <span className="inline-flex items-center gap-1 font-semibold text-[var(--text-secondary)]">
        <Minus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Netral</span>
      </span>
      <span className="block font-mono text-[11px] text-[var(--text-muted)]">
        {effectText}
      </span>
    </div>
  );
}

export function SourceMediaLabel({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
      {SOURCE_MEDIA_LABELS[source] ?? source}
    </span>
  );
}
