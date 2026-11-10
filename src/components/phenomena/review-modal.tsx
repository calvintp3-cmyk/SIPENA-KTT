"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  ExternalLink,
  FileText,
  History,
  Inbox,
  RotateCcw,
  SlidersHorizontal,
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

type InspectionTab = "classify" | "article" | "audit";

interface InspectionPaneSharedProps {
  phenomenon: SerializedPhenomenon | null;
  user: AuthenticatedUser;
  onSaved: (message: string) => void;
  onError: (message: string) => void;
  onClose?: () => void;
  isDialog?: boolean;
  enableKeyboardShortcuts?: boolean;
}

function InspectionWorkbenchContent({
  phenomenon,
  user,
  onSaved,
  onError,
  onClose,
  isDialog = false,
  enableKeyboardShortcuts = false,
}: InspectionPaneSharedProps) {
  const canEdit = user.role === "admin" || user.role === "editor";
  const summaryRef = useRef<HTMLTextAreaElement>(null);
  const pendingFocusSummaryRef = useRef(false);

  const [activeSubTab, setActiveSubTab] = useState<InspectionTab>("classify");
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
    if (!phenomenon) return;
    setActiveSubTab("classify");
    setSummary(phenomenon.summary);
    setSummaryTouched(false);
    setKbliCategory(phenomenon.kbliCategory ?? "");
    setKbliSubsector(phenomenon.kbliSubsector ?? "");
    setExpenditureComponent(phenomenon.expenditureComponent ?? "");
    setImpactType(phenomenon.impactType ?? "positif");
    setPriceVolumeEffect(phenomenon.priceVolumeEffect ?? "volume");
    setReviewerNotes(phenomenon.reviewerNotes ?? "");
    setAuditHistory([]);

    let cancelled = false;
    setIsLoadingDetail(true);
    fetch(`/api/phenomena/${phenomenon.id}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) return null;
        return (await res.json()) as {
          auditLogs?: SerializedAuditLog[];
        };
      })
      .then((detail) => {
        if (!cancelled && detail?.auditLogs) {
          setAuditHistory(detail.auditLogs);
        }
      })
      .catch(() => {
        // Non-blocking audit history fetch failure
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDetail(false);
      });

    return () => {
      cancelled = true;
    };
  }, [phenomenon]);

  useEffect(() => {
    if (activeSubTab === "classify" && pendingFocusSummaryRef.current) {
      pendingFocusSummaryRef.current = false;
      summaryRef.current?.focus();
    }
  }, [activeSubTab]);

  const summaryInvalid = summary.trim().length < 10;

  const submitVerification = useCallback(
    async (targetStatus: PhenomenonStatus) => {
      if (!phenomenon || !canEdit || isSaving) return;
      if (summary.trim().length < 10) {
        setSummaryTouched(true);
        if (activeSubTab !== "classify") {
          pendingFocusSummaryRef.current = true;
          setActiveSubTab("classify");
        } else {
          summaryRef.current?.focus();
        }
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
      activeSubTab,
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
    if (!phenomenon || !canEdit || !enableKeyboardShortcuts) return;
    function onKeyDown(e: KeyboardEvent) {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") {
        return;
      }
      if (!isDialog && document.querySelector("dialog[open]")) {
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
  }, [phenomenon, canEdit, enableKeyboardShortcuts, isDialog, submitVerification]);

  if (!phenomenon) {
    return (
      <div className="saas-card flex min-h-[420px] flex-col items-center justify-center rounded-2xl p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
          <Inbox className="h-5 w-5" aria-hidden="true" />
        </div>
        <h3 className="mt-4 text-base font-semibold text-[var(--text-primary)]">
          Pilih Fenomena untuk Ditelaah
        </h3>
        <p className="mt-1.5 max-w-xs text-xs leading-relaxed text-[var(--text-muted)]">
          Klik salah satu berita di daftar sebelah kiri atau gunakan tombol{" "}
          <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-primary)]">
            J
          </kbd>{" "}
          /{" "}
          <kbd className="rounded border border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-1.5 py-0.5 font-mono text-[11px] text-[var(--text-primary)]">
            K
          </kbd>{" "}
          untuk memeriksa dan menyetujui klasifikasi PDRB.
        </p>
      </div>
    );
  }

  const externalUrl = safeExternalHref(phenomenon.article.url);
  const numericalEntries = phenomenon.keyNumericalData
    ? Object.entries(phenomenon.keyNumericalData)
    : [];

  return (
    <div
      className={`flex flex-col bg-[var(--bg-surface)] ${
        isDialog
          ? "h-full"
          : "saas-card overflow-hidden rounded-2xl max-h-[calc(100vh-6rem)]"
      }`}
    >
      {/* Top Meta & Headline Header */}
      <div className="shrink-0 border-b border-[var(--border-hairline)] p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={phenomenon.status} />
            <SourceMediaLabel source={phenomenon.article.source} />
            <span className="text-xs text-[var(--text-muted)] tabular-nums">
              {formatIndonesianDate(phenomenon.article.publishedDate)}
            </span>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup panel telaah"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        <h2
          id={isDialog ? "drawer-review-title" : undefined}
          className="mt-3 text-base font-bold leading-snug tracking-tight text-[var(--text-primary)]"
        >
          {phenomenon.article.title}
        </h2>

        <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          {externalUrl ? (
            <a
              href={externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:text-emerald-800 hover:underline dark:text-emerald-400"
            >
              <span>Buka sumber asli</span>
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : (
            <span className="text-[var(--text-muted)]">Input manual internal</span>
          )}

          {phenomenon.confidenceScore !== null && (
            <span className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-subtle)]/70 px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)] tabular-nums">
              Skor AI: {Math.round(phenomenon.confidenceScore * 100)}%
            </span>
          )}
        </div>

        {/* TellDesk-Style Underline Sub-Tabs */}
        <div
          role="tablist"
          aria-label="Bagian Inspeksi Fenomena"
          className="-mb-5 mt-4 flex items-center gap-5 border-t border-[var(--border-hairline)] pt-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === "classify"}
            onClick={() => setActiveSubTab("classify")}
            className={`relative inline-flex items-center gap-1.5 py-2.5 text-xs transition-colors ${
              activeSubTab === "classify"
                ? "font-semibold text-emerald-800 dark:text-emerald-300"
                : "font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Ringkasan &amp; Klasifikasi</span>
            {activeSubTab === "classify" && (
              <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-emerald-600 dark:bg-emerald-400" />
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === "article"}
            onClick={() => setActiveSubTab("article")}
            className={`relative inline-flex items-center gap-1.5 py-2.5 text-xs transition-colors ${
              activeSubTab === "article"
                ? "font-semibold text-emerald-800 dark:text-emerald-300"
                : "font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Teks Berita Asli</span>
            {activeSubTab === "article" && (
              <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-emerald-600 dark:bg-emerald-400" />
            )}
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSubTab === "audit"}
            onClick={() => setActiveSubTab("audit")}
            className={`relative inline-flex items-center gap-1.5 py-2.5 text-xs transition-colors ${
              activeSubTab === "audit"
                ? "font-semibold text-emerald-800 dark:text-emerald-300"
                : "font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            }`}
          >
            <History className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Riwayat Audit</span>
            {auditHistory.length > 0 && (
              <span className="rounded-md bg-[var(--bg-subtle)] px-1.5 py-0.2 text-[10px] font-semibold tabular-nums">
                {auditHistory.length}
              </span>
            )}
            {activeSubTab === "audit" && (
              <span className="absolute inset-x-0 bottom-0 h-[2px] rounded-full bg-emerald-600 dark:bg-emerald-400" />
            )}
          </button>
        </div>
      </div>

      {/* Scrollable Tab Body */}
      <div className="flex-1 space-y-4 overflow-y-auto p-5 text-xs">
        {activeSubTab === "classify" && (
          <>
            {!canEdit && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/60 dark:text-amber-200">
                Akun berstatus <strong>Viewer</strong> (hanya baca). Hubungi Admin atau Analis Nerwilis untuk menyunting klasifikasi.
              </div>
            )}

            <div>
              <label
                htmlFor={isDialog ? "dialog-review-summary" : "split-review-summary"}
                className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]"
              >
                Ringkasan Narasi Fenomena (Standar BPS){" "}
                <span className="text-rose-600" aria-hidden="true">
                  *
                </span>
              </label>
              <textarea
                ref={summaryRef}
                id={isDialog ? "dialog-review-summary" : "split-review-summary"}
                rows={3}
                disabled={!canEdit}
                required
                minLength={10}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                onBlur={() => setSummaryTouched(true)}
                className="input-modern w-full resize-y rounded-xl p-3 text-xs leading-relaxed disabled:opacity-65"
              />
              {summaryTouched && summaryInvalid && (
                <p className="mt-1 text-xs font-medium text-rose-700 dark:text-rose-300">
                  Ringkasan harus berisi minimal 10 karakter.
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor={isDialog ? "dialog-review-kbli" : "split-review-kbli"}
                  className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Kategori KBLI (17 Sektor)
                </label>
                <select
                  id={isDialog ? "dialog-review-kbli" : "split-review-kbli"}
                  disabled={!canEdit}
                  value={kbliCategory}
                  onChange={(e) =>
                    setKbliCategory(e.target.value as KbliCode | "")
                  }
                  className="input-modern h-10 w-full rounded-xl px-3 text-xs font-medium disabled:opacity-65"
                >
                  <option value="">-- Belum Terklasifikasi --</option>
                  {KBLI_LIST.map((item) => (
                    <option key={item.code} value={item.code}>
                      {item.fullName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor={isDialog ? "dialog-review-subsector" : "split-review-subsector"}
                  className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Rincian Subsektor
                </label>
                <input
                  id={isDialog ? "dialog-review-subsector" : "split-review-subsector"}
                  type="text"
                  disabled={!canEdit}
                  value={kbliSubsector}
                  onChange={(e) => setKbliSubsector(e.target.value)}
                  placeholder="Misal: Perkebunan Kelapa Sawit"
                  className="input-modern h-10 w-full rounded-xl px-3 text-xs placeholder:text-[var(--text-muted)] disabled:opacity-65"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label
                  htmlFor={isDialog ? "dialog-review-exp" : "split-review-exp"}
                  className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Komponen Pengeluaran
                </label>
                <select
                  id={isDialog ? "dialog-review-exp" : "split-review-exp"}
                  disabled={!canEdit}
                  value={expenditureComponent}
                  onChange={(e) =>
                    setExpenditureComponent(
                      e.target.value as ExpenditureCode | ""
                    )
                  }
                  className="input-modern h-10 w-full rounded-xl px-3 text-xs font-medium disabled:opacity-65"
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
                  htmlFor={isDialog ? "dialog-review-impact" : "split-review-impact"}
                  className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]"
                >
                  Arah Dampak Ekonomi
                </label>
                <select
                  id={isDialog ? "dialog-review-impact" : "split-review-impact"}
                  disabled={!canEdit}
                  value={impactType}
                  onChange={(e) =>
                    setImpactType(e.target.value as ImpactDirection)
                  }
                  className="input-modern h-10 w-full rounded-xl px-3 text-xs font-medium disabled:opacity-65"
                >
                  <option value="positif">Positif (Ekspansi/Tumbuh)</option>
                  <option value="negatif">Negatif (Kontraksi/Inflasi)</option>
                  <option value="netral">Netral / Terkendali</option>
                </select>
              </div>
            </div>

            <fieldset disabled={!canEdit}>
              <legend className="mb-1.5 text-xs font-semibold text-[var(--text-primary)]">
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
                      className={`flex h-9 items-center justify-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium transition-colors ${
                        checked
                          ? "border-emerald-300 bg-emerald-50 font-semibold text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-200"
                          : "border-[var(--border-subtle)] bg-[var(--bg-canvas)] text-[var(--text-secondary)] hover:bg-[var(--bg-subtle)]"
                      }`}
                    >
                      <input
                        type="radio"
                        name={
                          isDialog
                            ? "dialogPriceVolumeEffect"
                            : "splitPriceVolumeEffect"
                        }
                        value={opt.value}
                        checked={checked}
                        onChange={() => setPriceVolumeEffect(opt.value)}
                        className="sr-only"
                      />
                      <span>{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div>
              <label
                htmlFor={isDialog ? "dialog-review-notes" : "split-review-notes"}
                className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]"
              >
                Catatan Verifikator BPS (Opsional)
              </label>
              <input
                id={isDialog ? "dialog-review-notes" : "split-review-notes"}
                type="text"
                disabled={!canEdit}
                value={reviewerNotes}
                onChange={(e) => setReviewerNotes(e.target.value)}
                placeholder="Contoh: Terkonfirmasi data SP2D BPKAD Q1 2025"
                className="input-modern h-10 w-full rounded-xl px-3 text-xs placeholder:text-[var(--text-muted)] disabled:opacity-65"
              />
            </div>
          </>
        )}

        {activeSubTab === "article" && (
          <div className="space-y-4">
            <div className="max-w-[65ch] space-y-3 text-[13px] leading-[1.7] text-[var(--text-secondary)]">
              {phenomenon.article.content.split(/\n+/).map((para, idx) => (
                <p key={idx}>{para}</p>
              ))}
            </div>

            {numericalEntries.length > 0 && (
              <div className="border-t border-[var(--border-hairline)] pt-4">
                <h3 className="mb-2.5 text-xs font-semibold text-[var(--text-primary)]">
                  Angka Nominal Terekstrak
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  {numericalEntries.map(([key, val]) => (
                    <div
                      key={key}
                      className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3 py-2"
                    >
                      <span className="block text-[11px] text-[var(--text-muted)]">
                        {key}
                      </span>
                      <span className="mt-0.5 block text-xs font-semibold text-[var(--text-primary)] tabular-nums">
                        {val !== null ? String(val) : "-"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === "audit" && (
          <div className="space-y-2.5">
            {isLoadingDetail ? (
              <div className="space-y-2" aria-busy="true">
                <div className="h-12 w-full rounded-xl bg-[var(--bg-subtle)]" />
                <div className="h-12 w-4/5 rounded-xl bg-[var(--bg-subtle)]" />
              </div>
            ) : auditHistory.length === 0 ? (
              <div className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] p-5 text-center text-xs text-[var(--text-muted)]">
                Belum ada riwayat perubahan manual oleh analis pada entri ini.
              </div>
            ) : (
              <ul className="space-y-2">
                {auditHistory.map((log) => (
                  <li
                    key={log.id}
                    className="rounded-xl border border-[var(--border-hairline)] bg-[var(--bg-canvas)] px-3.5 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                        {log.action}
                      </span>
                      <span className="text-[11px] text-[var(--text-muted)] tabular-nums">
                        {formatIndonesianDate(log.createdAt)}
                      </span>
                    </div>
                    <span className="mt-0.5 block text-[11px] text-[var(--text-secondary)]">
                      Oleh: {log.userName ?? "Sistem Otomatis"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Sticky Verification Action Footer */}
      {canEdit ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[var(--border-hairline)] bg-[var(--bg-canvas)]/70 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void submitVerification("rejected")}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-800 transition-colors hover:bg-rose-100 disabled:opacity-50 dark:border-rose-800/70 dark:bg-rose-950/70 dark:text-rose-200"
            >
              <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Tolak</span>
              <kbd className="hidden rounded bg-white/80 px-1 font-mono text-[10px] text-rose-700 sm:inline dark:bg-black/30 dark:text-rose-300">
                R
              </kbd>
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={() => void submitVerification("needs_revision")}
              className="btn-secondary inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-semibold disabled:opacity-50"
            >
              <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Revisi</span>
            </button>
          </div>

          <button
            type="button"
            disabled={isSaving}
            onClick={() => void submitVerification("approved")}
            className="btn-emerald inline-flex h-10 items-center gap-1.5 rounded-xl px-4 text-xs font-semibold disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            <span>{isSaving ? "Menyimpan..." : "Setujui"}</span>
            <kbd className="hidden rounded bg-black/15 px-1 font-mono text-[10px] text-white sm:inline">
              A
            </kbd>
          </button>
        </div>
      ) : (
        onClose && (
          <div className="flex shrink-0 justify-end border-t border-[var(--border-hairline)] bg-[var(--bg-canvas)]/70 px-5 py-3.5">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary h-10 rounded-xl px-4 text-xs font-semibold"
            >
              Tutup Panel
            </button>
          </div>
        )
      )}
    </div>
  );
}

export function SplitInspectionPane({
  phenomenon,
  user,
  onSaved,
  onError,
}: Omit<InspectionPaneSharedProps, "onClose" | "isDialog">) {
  return (
    <InspectionWorkbenchContent
      phenomenon={phenomenon}
      user={user}
      onSaved={onSaved}
      onError={onError}
      isDialog={false}
      enableKeyboardShortcuts={true}
    />
  );
}

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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pressedOutsideRef = useRef(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (phenomenon && !dialog.open) {
      dialog.showModal();
    } else if (!phenomenon && dialog.open) {
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
      className="my-0 ml-auto mr-0 h-screen max-h-screen w-full max-w-xl rounded-l-2xl border-l border-[var(--border-hairline)] bg-[var(--bg-surface)] p-0 text-[var(--text-primary)] shadow-floating open:flex open:flex-col"
    >
      {phenomenon && (
        <InspectionWorkbenchContent
          phenomenon={phenomenon}
          user={user}
          onClose={() => dialogRef.current?.close()}
          onSaved={onSaved}
          onError={onError}
          isDialog={true}
          enableKeyboardShortcuts={true}
        />
      )}
    </dialog>
  );
}
