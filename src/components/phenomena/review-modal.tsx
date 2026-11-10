"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  History,
  RotateCcw,
  X,
  XCircle,
} from "lucide-react";
import {
  EXPENDITURE_COMPONENTS,
  KBLI_LIST,
} from "@/lib/constants/taxonomy";
import { formatIndonesianDate, safeExternalHref } from "@/lib/utils";
import { SourceMediaLabel, StatusBadge } from "./status-badge";
import type {
  AuthenticatedUser,
  ExpenditureCode,
  ImpactDirection,
  KbliCode,
  PhenomenonStatus,
  PriceVolumeEffect,
  SerializedAuditLog,
  SerializedPhenomenon,
} from "@/types/client";

interface ReviewModalProps {
  phenomenon: SerializedPhenomenon | null;
  user: AuthenticatedUser;
  onClose: () => void;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
}

export function ReviewModal({
  phenomenon,
  user,
  onClose,
  onSaved,
  onError,
}: ReviewModalProps) {
  const canEdit = user.role === "admin" || user.role === "editor";
  const dialogRef = useRef<HTMLDialogElement>(null);
  const summaryRef = useRef<HTMLTextAreaElement>(null);
  const pressedOutsideRef = useRef(false);

  const [summary, setSummary] = useState("");
  const [summaryTouched, setSummaryTouched] = useState(false);
  const [kbliCategory, setKbliCategory] = useState<KbliCode | "">("");
  const [kbliSubsector, setKbliSubsector] = useState("");
  const [expenditureComponent, setExpenditureComponent] = useState<
    ExpenditureCode | ""
  >("");
  const [impactType, setImpactType] = useState<ImpactDirection>("positif");
  const [priceVolumeEffect, setPriceVolumeEffect] =
    useState<PriceVolumeEffect>("volume");
  const [reviewerNotes, setReviewerNotes] = useState("");
  const [auditHistory, setAuditHistory] = useState<SerializedAuditLog[]>([]);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (phenomenon) {
      setSummary(phenomenon.summary);
      setSummaryTouched(false);
      setKbliCategory(phenomenon.kbliCategory ?? "");
      setKbliSubsector(phenomenon.kbliSubsector ?? "");
      setExpenditureComponent(phenomenon.expenditureComponent ?? "");
      setImpactType(phenomenon.impactType ?? "positif");
      setPriceVolumeEffect(phenomenon.priceVolumeEffect ?? "volume");
      setReviewerNotes(phenomenon.reviewerNotes ?? "");
      setAuditHistory([]);

      if (!dialog.open) {
        dialog.showModal();
      }

      setIsLoadingDetail(true);
      fetch(`/api/phenomena/${phenomenon.id}`, { cache: "no-store" })
        .then(async (res) => {
          if (!res.ok) return null;
          return (await res.json()) as {
            auditLogs?: SerializedAuditLog[];
          };
        })
        .then((detail) => {
          if (detail?.auditLogs) {
            setAuditHistory(detail.auditLogs);
          }
        })
        .catch(() => {
          // Non-blocking audit history fetch failure
        })
        .finally(() => setIsLoadingDetail(false));
    } else if (dialog.open) {
      dialog.close();
    }
  }, [phenomenon]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => {
      dialog.returnValue = "";
      onClose();
    };
    dialog.addEventListener("close", handleClose);
    return () => dialog.removeEventListener("close", handleClose);
  }, [onClose]);

  const summaryInvalid = summary.trim().length < 10;

  const submitVerification = useCallback(
    async (targetStatus: PhenomenonStatus) => {
      if (!phenomenon || !canEdit || isSaving) return;
      if (summary.trim().length < 10) {
        setSummaryTouched(true);
        summaryRef.current?.focus();
        onError("Ringkasan narasi minimal 10 karakter sesuai standar BPS.");
        return;
      }

      setIsSaving(true);
      try {
        const res = await fetch(`/api/phenomena/${phenomenon.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            summary: summary.trim(),
            kbli_category: kbliCategory || null,
            kbli_subsector: kbliSubsector.trim() || null,
            expenditure_component: expenditureComponent || null,
            impact_type: impactType,
            price_volume_effect: priceVolumeEffect,
            status: targetStatus,
            reviewer_notes: reviewerNotes.trim() || undefined,
          }),
        });

        const payload = (await res.json().catch(() => null)) as
          | { error?: string }
          | null;

        if (!res.ok) {
          onError(payload?.error ?? "Gagal menyimpan hasil telaah.");
          setIsSaving(false);
          return;
        }

        const label =
          targetStatus === "approved"
            ? "Disetujui"
            : targetStatus === "rejected"
              ? "Ditolak"
              : "Ditandai Perlu Revisi";
        onSaved(`Fenomena berhasil disimpan dengan status ${label}.`);
      } catch {
        onError("Koneksi terputus saat menyimpan verifikasi.");
      } finally {
        setIsSaving(false);
      }
    },
    [
      phenomenon,
      canEdit,
      isSaving,
      summary,
      kbliCategory,
      kbliSubsector,
      expenditureComponent,
      impactType,
      priceVolumeEffect,
      reviewerNotes,
      onSaved,
      onError,
    ]
  );

  useEffect(() => {
    if (!phenomenon || !canEdit) return;
    function onKeyDown(e: KeyboardEvent) {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return;
      }
      if (e.key.toLowerCase() === "a" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        void submitVerification("approved");
      } else if (e.key.toLowerCase() === "r" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        void submitVerification("rejected");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [phenomenon, canEdit, submitVerification]);

  function isPointerOutsideDialog(
    e: React.PointerEvent<HTMLDialogElement>,
    dialog: HTMLDialogElement
  ) {
    const r = dialog.getBoundingClientRect();
    return (
      e.clientX < r.left ||
      e.clientX > r.right ||
      e.clientY < r.top ||
      e.clientY > r.bottom
    );
  }

  const numericalEntries = phenomenon?.keyNumericalData
    ? Object.entries(phenomenon.keyNumericalData)
    : [];

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="drawer-review-title"
      onPointerDown={(e) => {
        if (dialogRef.current) {
          pressedOutsideRef.current = isPointerOutsideDialog(
            e,
            dialogRef.current
          );
        }
      }}
      onPointerUp={(e) => {
        if (
          pressedOutsideRef.current &&
          dialogRef.current &&
          isPointerOutsideDialog(e, dialogRef.current)
        ) {
          dialogRef.current.close();
        }
        pressedOutsideRef.current = false;
      }}
      className="my-0 ml-auto mr-0 h-screen max-h-screen w-full max-w-5xl border-l border-[var(--border-subtle)] bg-[var(--bg-surface)] p-0 text-[var(--text-primary)] shadow-elevated open:flex open:flex-col"
    >
      {phenomenon && (
        <>
          {/* Sticky Drawer Header */}
          <div className="flex min-h-14 shrink-0 items-center justify-between gap-3 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-5 py-2.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-md border border-[var(--accent-soft-border)] bg-[var(--accent-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--accent-text)]">
                Telaah Fenomena
              </span>
              <StatusBadge status={phenomenon.status} />
              <span className="hidden font-mono text-xs text-[var(--text-muted)] sm:inline tabular-nums">
                {phenomenon.quarter} {phenomenon.year}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {canEdit && (
                <span className="hidden font-mono text-[11px] text-[var(--text-muted)] md:inline">
                  Pintasan:{" "}
                  <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1.5 py-0.5 text-[var(--text-primary)]">
                    A
                  </kbd>{" "}
                  Setujui &middot;{" "}
                  <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-1.5 py-0.5 text-[var(--text-primary)]">
                    R
                  </kbd>{" "}
                  Tolak
                </span>
              )}
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                aria-label="Tutup panel telaah"
                className="flex h-11 w-11 items-center justify-center rounded-lg border border-transparent text-[var(--text-muted)] transition-colors hover:border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] sm:h-9 sm:w-9"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Two-Column Body: Source Evidence + Analyst Classification */}
          <div className="grid flex-1 grid-cols-1 divide-y divide-[var(--border-subtle)] overflow-y-auto md:grid-cols-2 md:divide-x md:divide-y-0">
            {/* Left Column: Evidence Reader & Audit Trail */}
            <div className="space-y-5 overflow-y-auto bg-[var(--bg-subtle)] p-5 sm:p-6">
              <div className="flex items-center justify-between gap-2">
                <SourceMediaLabel source={phenomenon.article.source} />
                <span className="font-mono text-xs text-[var(--text-muted)] tabular-nums">
                  {formatIndonesianDate(phenomenon.article.publishedDate)}
                </span>
              </div>

              <div>
                <h2
                  id="drawer-review-title"
                  className="text-base font-bold leading-snug tracking-tight text-[var(--text-primary)] sm:text-lg"
                >
                  {phenomenon.article.title}
                </h2>
                {(() => {
                  const externalUrl = safeExternalHref(phenomenon.article.url);
                  if (!externalUrl) return null;
                  return (
                    <a
                      href={externalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--accent-text)] hover:underline"
                    >
                      <span>Buka Artikel Asli di Portal Berita</span>
                      <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  );
                })()}
              </div>

              <div className="max-w-[65ch] space-y-3 border-t border-[var(--border-subtle)] pt-4 text-xs leading-[1.65] text-[var(--text-secondary)]">
                {phenomenon.article.content.split(/\n+/).map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>

              {numericalEntries.length > 0 && (
                <div className="border-t border-[var(--border-subtle)] pt-4">
                  <h3 className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                    Ekstraksi Angka Nominal dari Berita
                  </h3>
                  <div className="grid grid-cols-2 gap-2.5 font-mono text-xs">
                    {numericalEntries.map(([key, val]) => (
                      <div
                        key={key}
                        className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2"
                      >
                        <span className="block text-[10px] text-[var(--text-muted)]">
                          {key}
                        </span>
                        <span className="mt-0.5 block font-semibold text-[var(--text-primary)] tabular-nums">
                          {val !== null ? String(val) : "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Forensic Verification Timeline */}
              <div className="border-t border-[var(--border-subtle)] pt-4">
                <div className="mb-2.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[var(--text-muted)]">
                  <History className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Riwayat Audit Verifikasi</span>
                </div>
                {isLoadingDetail ? (
                  <div className="space-y-2" aria-busy="true">
                    <div className="h-10 w-full rounded-lg bg-[var(--bg-surface)]" />
                    <div className="h-10 w-4/5 rounded-lg bg-[var(--bg-surface)]" />
                  </div>
                ) : auditHistory.length === 0 ? (
                  <p className="text-xs text-[var(--text-muted)]">
                    Belum ada riwayat perubahan manual oleh analis.
                  </p>
                ) : (
                  <ul className="space-y-2 font-mono text-[11px]">
                    {auditHistory.map((log) => (
                      <li
                        key={log.id}
                        className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-2 text-[var(--text-secondary)]"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-[var(--accent-text)]">
                            {log.action}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)] tabular-nums">
                            {formatIndonesianDate(log.createdAt)}
                          </span>
                        </div>
                        <span className="mt-0.5 block text-[10px] text-[var(--text-muted)]">
                          Oleh: {log.userName ?? "Sistem Otomatis"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Right Column: Editable Verification Form */}
            <div className="space-y-4 overflow-y-auto bg-[var(--bg-surface)] p-5 text-xs sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--border-subtle)] pb-3">
                <h3 className="text-sm font-bold text-[var(--text-primary)]">
                  Klasifikasi &amp; Verifikasi Analis
                </h3>
                {phenomenon.confidenceScore !== null && (
                  <span className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-emerald-900 tabular-nums dark:border-emerald-700/80 dark:bg-emerald-950/70 dark:text-emerald-200">
                    Skor Ekstraksi: {phenomenon.confidenceScore.toFixed(2)}
                  </span>
                )}
              </div>

              {!canEdit && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900 dark:border-amber-700/80 dark:bg-amber-950/60 dark:text-amber-200">
                  Akun Anda berstatus <strong>Viewer</strong> (hanya baca). Hubungi Admin atau Analis Nerwilis untuk menyunting klasifikasi.
                </div>
              )}

              <div>
                <label
                  htmlFor="review-summary"
                  className="mb-1 block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Ringkasan Narasi Fenomena (Standar BPS){" "}
                  <span className="text-rose-600 dark:text-rose-400" aria-hidden="true">
                    *
                  </span>
                </label>
                <p id="review-summary-hint" className="mb-1.5 text-[11px] text-[var(--text-muted)]">
                  Minimal 10 karakter menjelaskan pelaku, peristiwa, komoditas, dan dampak ekonomi.
                </p>
                <textarea
                  ref={summaryRef}
                  id="review-summary"
                  rows={4}
                  disabled={!canEdit}
                  required
                  minLength={10}
                  aria-invalid={summaryTouched && summaryInvalid ? "true" : "false"}
                  aria-describedby={
                    summaryTouched && summaryInvalid
                      ? "review-summary-hint review-summary-error"
                      : "review-summary-hint"
                  }
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  onBlur={() => setSummaryTouched(true)}
                  className="w-full resize-y rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] p-3 text-xs leading-relaxed text-[var(--text-primary)] focus:bg-[var(--bg-surface)] focus:outline-none disabled:opacity-65"
                />
                {summaryTouched && summaryInvalid && (
                  <p
                    id="review-summary-error"
                    className="mt-1 text-xs font-medium text-rose-700 dark:text-rose-300"
                  >
                    Ringkasan harus berisi minimal 10 karakter.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="review-kbli"
                    className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Kategori KBLI (17 Sektor)
                  </label>
                  <select
                    id="review-kbli"
                    disabled={!canEdit}
                    value={kbliCategory}
                    onChange={(e) =>
                      setKbliCategory(e.target.value as KbliCode | "")
                    }
                    className="min-h-[44px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] focus:outline-none disabled:opacity-65 sm:min-h-[40px]"
                  >
                    <option value="">-- Tidak Terklasifikasi --</option>
                    {KBLI_LIST.map((item) => (
                      <option key={item.code} value={item.code}>
                        {item.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="review-subsector"
                    className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Rincian Subsektor
                  </label>
                  <input
                    id="review-subsector"
                    type="text"
                    disabled={!canEdit}
                    value={kbliSubsector}
                    onChange={(e) => setKbliSubsector(e.target.value)}
                    placeholder="Misal: Perkebunan Kelapa Sawit"
                    className="min-h-[44px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:bg-[var(--bg-surface)] focus:outline-none disabled:opacity-65 sm:min-h-[40px]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="review-expenditure"
                    className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Komponen Pengeluaran PDRB
                  </label>
                  <select
                    id="review-expenditure"
                    disabled={!canEdit}
                    value={expenditureComponent}
                    onChange={(e) =>
                      setExpenditureComponent(
                        e.target.value as ExpenditureCode | ""
                      )
                    }
                    className="min-h-[44px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-medium text-[var(--text-primary)] focus:outline-none disabled:opacity-65 sm:min-h-[40px]"
                  >
                    <option value="">-- Pilih Komponen --</option>
                    {Object.values(EXPENDITURE_COMPONENTS).map((comp) => (
                      <option key={comp.code} value={comp.code}>
                        {comp.label} - {comp.fullName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="review-impact"
                    className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]"
                  >
                    Arah Dampak Ekonomi
                  </label>
                  <select
                    id="review-impact"
                    disabled={!canEdit}
                    value={impactType}
                    onChange={(e) =>
                      setImpactType(e.target.value as ImpactDirection)
                    }
                    className="min-h-[44px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] focus:outline-none disabled:opacity-65 sm:min-h-[40px]"
                  >
                    <option value="positif">Positif (Ekspansi/Tumbuh)</option>
                    <option value="negatif">Negatif (Kontraksi/Inflasi)</option>
                    <option value="netral">Netral / Terkendali</option>
                  </select>
                </div>
              </div>

              <fieldset disabled={!canEdit}>
                <legend className="mb-2 text-xs font-semibold text-[var(--text-primary)]">
                  Transmisi Efek (Harga / Volume)
                </legend>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {(
                    [
                      { value: "volume", label: "Volume" },
                      { value: "harga", label: "Harga" },
                      { value: "keduanya", label: "Keduanya" },
                      { value: "tidak_langsung", label: "Tak Langsung" },
                    ] as const
                  ).map((opt) => {
                    const checked = priceVolumeEffect === opt.value;
                    return (
                      <label
                        key={opt.value}
                        className={`flex min-h-[44px] items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors sm:min-h-[40px] ${
                          checked
                            ? "border-[var(--accent-primary)] bg-[var(--accent-soft)] text-[var(--accent-text)]"
                            : "border-[var(--border-strong)] bg-[var(--bg-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="priceVolumeEffect"
                          value={opt.value}
                          checked={checked}
                          onChange={() => setPriceVolumeEffect(opt.value)}
                          className="accent-[var(--accent-primary)]"
                        />
                        <span>{opt.label}</span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>

              <div>
                <label
                  htmlFor="review-notes"
                  className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Catatan Verifikator BPS (Opsional)
                </label>
                <input
                  id="review-notes"
                  type="text"
                  disabled={!canEdit}
                  value={reviewerNotes}
                  onChange={(e) => setReviewerNotes(e.target.value)}
                  placeholder="Contoh: Terkonfirmasi data SP2D BPKAD Q1 2025"
                  className="min-h-[44px] w-full rounded-lg border border-[var(--border-strong)] bg-[var(--bg-subtle)] px-3 py-2 text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:bg-[var(--bg-surface)] focus:outline-none disabled:opacity-65 sm:min-h-[40px]"
                />
              </div>
            </div>
          </div>

          {/* Sticky Drawer Footer Actions */}
          <div className="flex min-h-16 shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-5 py-3">
            {canEdit ? (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void submitVerification("rejected")}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3.5 py-2 text-xs font-semibold text-rose-900 transition-colors hover:bg-rose-100 disabled:opacity-50 dark:border-rose-700/80 dark:bg-rose-950/75 dark:text-rose-200 dark:hover:bg-rose-900 sm:min-h-[40px]"
                  >
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    <span>Tolak (Non-Ekonomi) [R]</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void submitVerification("needs_revision")}
                    className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50 sm:min-h-[40px]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Tandai Revisi</span>
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void submitVerification("approved")}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-800 disabled:opacity-50 sm:min-h-[42px]"
                >
                  <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  <span>
                    {isSaving
                      ? "Menyimpan..."
                      : "Setujui & Simpan Verifikasi [A]"}
                  </span>
                </button>
              </>
            ) : (
              <div className="ml-auto">
                <button
                  type="button"
                  onClick={() => dialogRef.current?.close()}
                  className="min-h-[44px] rounded-lg border border-[var(--border-strong)] bg-[var(--bg-surface)] px-4 py-2 text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-hover)] sm:min-h-[40px]"
                >
                  Tutup Panel
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </dialog>
  );
}
