"use client";

import React, { useEffect, useState } from "react";
import { PlusCircle, X } from "lucide-react";

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
  const [name, setName] = useState("");
  const [agency, setAgency] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setUrl("");
      setName("");
      setAgency("");
      setNotes("");
      onSubmitSuccess();
      onClose();
    }, 600);
  };

  return (
    <div className="ui-modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
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
              <h4 id="proposal-modal-title" className="ui-h2">Usulkan Tautan Berita Ekonomi</h4>
              <p className="text-xs text-slate-500">Kanal partisipasi publik untuk ODON Tana Tidung</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Tutup dialog" className="ui-icon-btn !border-transparent !shadow-none">
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
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
              placeholder="https://kaltara.prokal.co/tana-tidung/..."
              className="ui-field num"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="pm-name" className="ui-label block mb-1.5">Nama Pengusul:</label>
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
              <label htmlFor="pm-agency" className="ui-label block mb-1.5">Instansi / Asal:</label>
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
            Tautan yang Anda kirim akan masuk ke antrean <b className="font-semibold text-slate-900">Meja Kurasi Tim Nerwilis BPS</b> untuk diverifikasi kesesuaiannya dengan kriteria fenomena ekonomi makro.
          </p>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200/80">
            <button type="button" onClick={onClose} className="ui-btn ui-btn-secondary">
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
