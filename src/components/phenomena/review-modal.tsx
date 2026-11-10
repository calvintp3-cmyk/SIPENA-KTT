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
  SOURCE_MEDIA_LABELS,
} from "@/lib/constants/taxonomy";
import { formatIndonesianDate, safeExternalHref } from "@/lib/utils";
import { StatusBadge } from "./status-badge";
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
  const pressedOutsideRef = useRef(false);

  const [summary, setSummary] = useState("");
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

  // Sync dialog open/close natively with showModal()
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (phenomenon) {
      setSummary(phenomenon.summary);
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

      // Fetch forensic audit log history & latest full record
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

  // Listen to native close event so Esc / close() syncs React state
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

  const submitVerification = useCallback(
    async (targetStatus: PhenomenonStatus) => {
      if (!phenomenon || !canEdit || isSaving) return;
      if (summary.trim().length < 10) {
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

  // Keyboard shortcuts [A] Approve, [R] Reject inside drawer (disabled in form fields)
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
      className="ml-auto mr-0 my-0 h-screen max-h-screen w-full max-w-4xl border-l border-slate-700 bg-[#0D131F] p-0 text-slate-100 shadow-2xl open:flex open:flex-col"
    >
      {phenomenon && (
        <>
          {/* Drawer Header */}
          <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-[#131B2B] px-5">
            <div className="flex items-center gap-2.5">
              <span className="rounded border border-sky-800 bg-[#002B49] px-2 py-0.5 font-mono text-xs font-medium text-sky-300">
                Telaah Fenomena
              </span>
              <StatusBadge status={phenomenon.status} />
              <span className="hidden font-mono text-[11px] text-slate-400 sm:inline tabular-nums">
                {phenomenon.quarter} {phenomenon.year}
              </span>
            </div>

            <div className="flex items-center gap-3">
              {canEdit && (
                <span className="hidden font-mono text-[11px] text-slate-400 md:inline">
                  Pintasan:{" "}
                  <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-200">
                    A
                  </kbd>{" "}
                  Setujui &middot;{" "}
                  <kbd className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-200">
                    R
                  </kbd>{" "}
                  Tolak
                </span>
              )}
              <button
                type="button"
                onClick={() => dialogRef.current?.close()}
                aria-label="Tutup panel telaah"
                className="rounded p-1.5 text-slate-400 transition-colors hover:bg-[#1A2438] hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Two-Column Body */}
          <div className="grid flex-1 grid-cols-1 divide-y divide-slate-800 overflow-y-auto md:grid-cols-2 md:divide-x md:divide-y-0">
            {/* Left Column: Evidence (Original News + Audit Trail) */}
            <div className="space-y-4 overflow-y-auto bg-[#080C14]/60 p-5">
              <div className="flex items-center justify-between font-mono text-[11px] text-slate-400">
                <span className="rounded border border-slate-700 bg-slate-800 px-2 py-0.5 text-slate-200">
                  {SOURCE_MEDIA_LABELS[phenomenon.article.source] ??
                    phenomenon.article.source}
                </span>
                <span>
                  {formatIndonesianDate(phenomenon.article.publishedDate)}
                </span>
              </div>

              <div>
                <h2
                  id="drawer-review-title"
                  className="font-display text-base font-semibold leading-snug text-white"
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
                      className="mt-1.5 inline-flex items-center gap-1 font-mono text-[11px] text-sky-400 hover:underline"
                    >
                      <span>Buka Artikel Asli di Portal Berita</span>
                      <ExternalLink className="h-3 w-3" aria-hidden="true" />
                    </a>
                  );
                })()}
              </div>

              <div className="space-y-3 border-t border-slate-800 pt-4 text-xs leading-relaxed text-slate-300">
                {phenomenon.article.content.split(/\n+/).map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>

              {numericalEntries.length > 0 && (
                <div className="border-t border-slate-800 pt-4">
                  <h3 className="mb-2 font-mono text-[11px] uppercase tracking-wide text-slate-400">
                    Ekstraksi Angka Nominal dari Berita
                  </h3>
                  <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                    {numericalEntries.map(([key, val]) => (
                      <div
                        key={key}
                        className="rounded border border-slate-800 bg-[#0D131F] px-2.5 py-1.5"
                      >
                        <span className="block text-[10px] text-slate-400">
                          {key}
                        </span>
                        <span className="font-semibold text-slate-100 tabular-nums">
                          {val !== null ? String(val) : "-"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Forensic Audit Trail */}
              <div className="border-t border-slate-800 pt-4">
                <div className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wide text-slate-400">
                  <History className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Riwayat Audit Verifikasi</span>
                </div>
                {isLoadingDetail ? (
                  <p className="font-mono text-[11px] text-slate-500">
                    Memuat riwayat audit...
                  </p>
                ) : auditHistory.length === 0 ? (
                  <p className="font-mono text-[11px] text-slate-500">
                    Belum ada riwayat perubahan manual oleh analis.
                  </p>
                ) : (
                  <ul className="space-y-1.5 font-mono text-[11px]">
                    {auditHistory.map((log) => (
                      <li
                        key={log.id}
                        className="rounded border border-slate-800 bg-[#0D131F] px-2.5 py-1.5 text-slate-300"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-sky-300">
                            {log.action}
                          </span>
                          <span className="text-[10px] text-slate-500">
                            {formatIndonesianDate(log.createdAt)}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Oleh: {log.userName ?? "Sistem Otomatis"}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* Right Column: Editable Extraction Form */}
            <div className="space-y-4 overflow-y-auto bg-[#131B2B] p-5 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="font-display text-sm font-semibold text-white">
                  Klasifikasi &amp; Verifikasi Analis
                </span>
                {phenomenon.confidenceScore !== null && (
                  <span className="rounded border border-emerald-800 bg-emerald-950 px-2 py-0.5 font-mono text-[10px] text-emerald-300 tabular-nums">
                    Keyakinan AI: {phenomenon.confidenceScore.toFixed(2)}
                  </span>
                )}
              </div>

              {!canEdit && (
                <div className="rounded border border-amber-800/70 bg-amber-950/50 px-3 py-2 text-[11px] text-amber-200">
                  Akun Anda berstatus <strong>Viewer</strong> (hanya baca). Hubungi Admin/Analis Nerwilis untuk menyunting klasifikasi.
                </div>
              )}

              <div>
                <label
                  htmlFor="review-summary"
                  className="mb-1 block font-mono text-[11px] uppercase text-slate-400"
                >
                  Ringkasan Narasi Fenomena (Standar BPS)
                </label>
                <textarea
                  id="review-summary"
                  rows={4}
                  disabled={!canEdit}
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  className="w-full rounded border border-slate-700 bg-[#0D131F] p-2.5 text-xs leading-relaxed text-slate-100 focus:border-sky-500 focus:outline-none disabled:opacity-70"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="review-kbli"
                    className="mb-1 block font-mono text-[11px] uppercase text-slate-400"
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
                    className="w-full rounded border border-slate-700 bg-[#0D131F] p-2 font-mono text-xs text-white focus:border-sky-500 focus:outline-none disabled:opacity-70"
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
                    className="mb-1 block font-mono text-[11px] uppercase text-slate-400"
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
                    className="w-full rounded border border-slate-700 bg-[#0D131F] p-2 text-xs text-white focus:border-sky-500 focus:outline-none disabled:opacity-70"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label
                    htmlFor="review-expenditure"
                    className="mb-1 block font-mono text-[11px] uppercase text-slate-400"
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
                    className="w-full rounded border border-slate-700 bg-[#0D131F] p-2 font-mono text-xs text-white focus:border-sky-500 focus:outline-none disabled:opacity-70"
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
                    className="mb-1 block font-mono text-[11px] uppercase text-slate-400"
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
                    className="w-full rounded border border-slate-700 bg-[#0D131F] p-2 font-mono text-xs font-semibold text-slate-100 focus:border-sky-500 focus:outline-none disabled:opacity-70"
                  >
                    <option value="positif">Positif (Ekspansi/Tumbuh)</option>
                    <option value="negatif">Negatif (Kontraksi/Inflasi)</option>
                    <option value="netral">Netral / Terkendali</option>
                  </select>
                </div>
              </div>

              <fieldset disabled={!canEdit}>
                <legend className="mb-1.5 font-mono text-[11px] uppercase text-slate-400">
                  Transmisi Efek (Harga / Volume)
                </legend>
                <div className="grid grid-cols-2 gap-2 font-mono text-xs sm:grid-cols-4">
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
                        className={`flex cursor-pointer items-center gap-1.5 rounded border p-2 transition-colors ${
                          checked
                            ? "border-sky-500 bg-[#002B49]/60 text-sky-300"
                            : "border-slate-700 bg-[#0D131F] text-slate-300 hover:bg-[#1A2438]"
                        }`}
                      >
                        <input
                          type="radio"
                          name="priceVolumeEffect"
                          value={opt.value}
                          checked={checked}
                          onChange={() => setPriceVolumeEffect(opt.value)}
                          className="text-sky-500"
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
                  className="mb-1 block font-mono text-[11px] uppercase text-slate-400"
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
                  className="w-full rounded border border-slate-700 bg-[#0D131F] p-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none disabled:opacity-70"
                />
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-t border-slate-800 bg-[#131B2B] px-5 py-2.5">
            {canEdit ? (
              <>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void submitVerification("rejected")}
                    className="inline-flex items-center gap-1.5 rounded border border-rose-800 bg-rose-950/70 px-3.5 py-2 text-xs font-medium text-rose-200 transition-colors hover:bg-rose-900 disabled:opacity-50"
                  >
                    <XCircle className="h-4 w-4" aria-hidden="true" />
                    <span>Tolak (Non-Ekonomi) [R]</span>
                  </button>
                  <button
                    type="button"
                    disabled={isSaving}
                    onClick={() => void submitVerification("needs_revision")}
                    className="inline-flex items-center gap-1.5 rounded border border-slate-700 bg-[#0D131F] px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:bg-[#1A2438] disabled:opacity-50"
                  >
                    <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Tandai Revisi</span>
                  </button>
                </div>

                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => void submitVerification("approved")}
                  className="inline-flex items-center gap-1.5 rounded bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-emerald-500 disabled:opacity-50"
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
                  className="rounded border border-slate-700 bg-[#0D131F] px-4 py-2 text-xs font-medium text-slate-200 hover:bg-[#1A2438]"
                >
                  Tutup
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </dialog>
  );
}

