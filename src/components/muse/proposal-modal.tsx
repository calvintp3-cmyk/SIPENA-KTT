"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, PlusCircle, X } from "lucide-react";

interface ProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: () => void;
}

export function ProposalModal({
  isOpen,
  onClose,
  onSubmitSuccess,
}: ProposalModalProps) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [name, setName] = useState("");
  const [agency, setAgency] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setErrorMsg("Tautan URL berita wajib diisi.");
      return;
    }

    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/proposals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: url.trim(),
          title: title.trim() || undefined,
          submitterName: name.trim() || "Masyarakat / OPD",
          submitterAgency: agency.trim() || "Masyarakat Umum / OPD",
          economicNotes: notes.trim() || undefined,
        }),
      });

      const payload = (await res.json().catch(() => null)) as {
        error?: string;
        success?: boolean;
      } | null;

      if (!res.ok) {
        setErrorMsg(payload?.error ?? "Gagal mengirim usulan berita. Periksa format URL Anda.");
        return;
      }

      setUrl("");
      setTitle("");
      setName("");
      setAgency("");
      setNotes("");
      onClose();
      onSubmitSuccess();
    } catch {
      setErrorMsg("Koneksi jaringan gagal. Pastikan internet aktif dan coba lagi.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="ui-modal-scrim"
      onMouseDown={(e) => e.target === e.currentTarget && !isSubmitting && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="proposal-modal-title"
        className="ui-modal max-w-md"
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 py-5 border-b border-slate-200/80">
          <div className="flex items-center gap-3">
            <div className="rounded-xl p-2.5 bg-blue-50 text-blue-600 ring-1 ring-inset ring-blue-600/15">
              <PlusCircle className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <h4 id="proposal-modal-title" className="ui-h2">
                Usulkan Tautan Berita Ekonomi
              </h4>
              <p className="text-xs text-slate-500">Kanal partisipasi publik untuk ODON Tana Tidung</p>
            </div>
          </div>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            aria-label="Tutup dialog"
            className="ui-icon-btn !border-transparent !shadow-none"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs text-rose-800"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" aria-hidden="true" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div>
            <label htmlFor="pm-url" className="ui-label block mb-1.5">
              Tautan Berita (URL) <span className="text-rose-600" aria-hidden="true">*</span>:
            </label>
            <input
              id="pm-url"
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://radartarakan.jawapos.com/tana-tidung/..."
              className="ui-field num"
            />
          </div>

          <div>
            <label htmlFor="pm-title" className="ui-label block mb-1.5">
              Judul Berita (Opsional):
            </label>
            <input
              id="pm-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Pemkab KTT Resmikan Sentra Kayu Rakyat di Tana Lia"
              className="ui-field"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pm-name" className="ui-label block mb-1.5">
                Nama Pengusul:
              </label>
              <input
                id="pm-name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Rahmat Hidayat"
                className="ui-field"
              />
            </div>
            <div>
              <label htmlFor="pm-agency" className="ui-label block mb-1.5">
                Instansi / Asal:
              </label>
              <input
                id="pm-agency"
                type="text"
                value={agency}
                onChange={(e) => setAgency(e.target.value)}
                placeholder="Bappeda KTT / Warga"
                className="ui-field"
              />
            </div>
          </div>

          <div>
            <label htmlFor="pm-notes" className="ui-label block mb-1.5">
              Catatan Fenomena Ekonomi (Opsional):
            </label>
            <textarea
              id="pm-notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Misal: Pembangunan dermaga baru di Desa Bebatu sudah mulai beroperasi..."
              className="ui-field leading-relaxed"
            />
          </div>

          <p className="text-xs text-slate-600 bg-slate-50/90 border-l-2 border-slate-300 rounded-r-xl p-3.5 leading-relaxed">
            Tautan yang Anda kirim disimpan langsung ke database dan masuk ke antrean{" "}
            <b className="font-semibold text-slate-900">Moderasi Usulan Tim Nerwilis BPS</b>.
          </p>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200/80">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="ui-btn ui-btn-secondary"
            >
              Batal
            </button>
            <button type="submit" disabled={isSubmitting} className="ui-btn ui-btn-primary">
              {isSubmitting ? "Mengirim..." : "Kirim Usulan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
