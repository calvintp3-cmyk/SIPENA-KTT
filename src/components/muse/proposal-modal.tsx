"use client";

import React, { useState } from "react";
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
    <div className="fixed inset-0 bg-black/45 backdrop-blur-2xs z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-[0_1px_3px_0_rgba(0,0,0,0.05),0_20px_25px_-5px_rgba(0,0,0,0.04)] border border-[#f0f0f0] p-6 space-y-4">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#f0f0f0] pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#141414]">Usulkan Tautan Berita Ekonomi</h4>
              <p className="text-[11px] text-[#8c8c8c]">Kanal partisipasi publik untuk ODON Tana Tidung</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-[#8c8c8c]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-bold text-[#141414] mb-1">
              Tautan Berita (URL) <span className="text-rose-500">*</span>:
            </label>
            <input
              type="url"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://kaltara.prokal.co/tana-tidung/..."
              className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-[#141414] focus:outline-none focus:border-blue-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-[#141414] mb-1">Nama Pengusul:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Contoh: Rahmat Hidayat"
                className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-[#141414] focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-[#141414] mb-1">Instansi / Asal:</label>
              <input
                type="text"
                value={agency}
                onChange={(e) => setAgency(e.target.value)}
                placeholder="Bappeda KTT / Warga"
                className="w-full p-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-[#141414] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-[#141414] mb-1">
              Catatan Fenomena Ekonomi (Opsional):
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Misal: Pembangunan dermaga baru di Desa Bebatu sudah mulai beroperasi..."
              className="w-full p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-[#141414] focus:outline-none"
            />
          </div>

          <p className="text-[11px] text-[#8c8c8c] bg-slate-50 p-2.5 rounded-lg border border-slate-200/60 leading-relaxed">
            Tautan yang Anda kirim akan masuk ke antrean <b>Meja Kurasi Tim Nerwilis BPS</b> untuk diverifikasi kesesuaiannya dengan kriteria fenomena ekonomi makro.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#f0f0f0]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-[#141414] hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold shadow-[0_4px_14px_0_rgba(24,144,255,0.35)] hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? "Mengirim..." : "Kirim Usulan"}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

