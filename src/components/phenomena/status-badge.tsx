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
      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold leading-none ${meta.badgeClass}`}
    >
      <StatusGlyph status={status} />
      <span>{meta.label}</span>
    </span>
  );
}

export function KbliBadge({
  code,
  subsector,
  compact = false,
}: {
  code: KbliCode | null;
  subsector?: string | null;
  compact?: boolean;
}) {
  if (!code) {
    return (
      <span className="inline-flex items-center rounded-lg border border-dashed border-[var(--border-input)] bg-[var(--bg-subtle)]/60 px-2.5 py-1 text-xs text-[var(--text-muted)]">
        Belum terklasifikasi
      </span>
    );
  }
  const meta = KBLI_CATEGORIES[code];
  const shortCode =
    meta.code === "M_N" ? "M,N" : meta.code === "R_S_T_U" ? "R-U" : meta.code;

  return (
    <div className="inline-flex max-w-full flex-wrap items-center gap-1.5">
      <span
        title={meta.fullName}
        className={`inline-flex max-w-full items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium ${meta.badgeColor}`}
      >
        <span className="font-mono text-[11px] font-bold">{shortCode}</span>
        <span aria-hidden="true" className="opacity-40">
          &middot;
        </span>
        <span className="truncate">{meta.shortName}</span>
      </span>
      {!compact && subsector && (
        <span className="truncate text-xs text-[var(--text-muted)]">
          ({subsector})
        </span>
      )}
    </div>
  );
}

export function ExpenditureBadge({ code }: { code: ExpenditureCode | null }) {
  if (!code) {
    return null;
  }
  const meta = EXPENDITURE_COMPONENTS[code];
  return (
    <span
      title={meta.fullName}
      className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-xs font-medium ${meta.badgeColor}`}
    >
      {meta.label}
    </span>
  );
}

const EFFECT_LABELS: Record<PriceVolumeEffect, string> = {
  volume: "Volume",
  harga: "Harga",
  keduanya: "Harga & Volume",
  tidak_langsung: "Tak Langsung",
};

export function ImpactIndicator({
  impact,
  effect,
  inline = false,
}: {
  impact: ImpactDirection | null;
  effect: PriceVolumeEffect | null;
  inline?: boolean;
}) {
  const effectText = effect ? EFFECT_LABELS[effect] : null;

  if (inline) {
    if (impact === "positif") {
      return (
        <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-200/80 bg-emerald-50/70 px-2 py-1 text-xs font-medium text-emerald-800 dark:border-emerald-800/60 dark:bg-emerald-950/50 dark:text-emerald-200">
          <ArrowUp className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>Positif{effectText ? ` · ${effectText}` : ""}</span>
        </span>
      );
    }
    if (impact === "negatif") {
      return (
        <span className="inline-flex items-center gap-1 rounded-lg border border-rose-200/80 bg-rose-50/70 px-2 py-1 text-xs font-medium text-rose-800 dark:border-rose-800/60 dark:bg-rose-950/50 dark:text-rose-200">
          <ArrowDown className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span>Negatif{effectText ? ` · ${effectText}` : ""}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-2 py-1 text-xs font-medium text-[var(--text-secondary)]">
        <Minus className="h-3 w-3 shrink-0" aria-hidden="true" />
        <span>Netral{effectText ? ` · ${effectText}` : ""}</span>
      </span>
    );
  }

  if (impact === "positif") {
    return (
      <div className="text-xs">
        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 dark:text-emerald-300">
          <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>Positif</span>
        </span>
        {effectText && (
          <span className="block text-[11px] text-[var(--text-muted)]">
            {effectText}
          </span>
        )}
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
        {effectText && (
          <span className="block text-[11px] text-[var(--text-muted)]">
            {effectText}
          </span>
        )}
      </div>
    );
  }
  return (
    <div className="text-xs">
      <span className="inline-flex items-center gap-1 font-semibold text-[var(--text-secondary)]">
        <Minus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Netral</span>
      </span>
      {effectText && (
        <span className="block text-[11px] text-[var(--text-muted)]">
          {effectText}
        </span>
      )}
    </div>
  );
}

export function SourceMediaLabel({ source }: { source: string }) {
  return (
    <span className="inline-flex items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/80 px-2 py-0.5 text-xs font-medium text-[var(--text-secondary)]">
      {SOURCE_MEDIA_LABELS[source] ?? source}
    </span>
  );
}
