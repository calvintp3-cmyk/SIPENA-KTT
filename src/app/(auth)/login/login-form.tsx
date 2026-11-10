"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Lock, AlertCircle, LogIn } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = (await res.json().catch(() => null)) as
        | { error?: string; success?: boolean }
        | null;

      if (!res.ok) {
        setErrorMsg(
          data?.error ??
            "Gagal masuk. Periksa kembali email dinas dan kata sandi Anda."
        );
        setIsSubmitting(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setErrorMsg(
        "Koneksi ke server terputus. Pastikan layanan jaringan kantor aktif dan coba lagi."
      );
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMsg && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-md border border-rose-800/80 bg-rose-950/60 p-3 text-xs text-rose-200"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" aria-hidden="true" />
          <span>{errorMsg}</span>
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-slate-300"
        >
          Email Pegawai / Akun Kerja
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          spellCheck={false}
          autoCapitalize="none"
          enterKeyHint="next"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@bps6504.go.id"
          className="w-full rounded-md border border-slate-700 bg-[#080C14] px-3 py-2 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-sky-500 focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block font-mono text-[11px] uppercase tracking-wide text-slate-300"
        >
          Kata Sandi
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            enterKeyHint="done"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Masukkan kata sandi akun"
            className="w-full rounded-md border border-slate-700 bg-[#080C14] py-2 pl-3 pr-10 text-sm text-slate-100 placeholder-slate-500 transition-colors focus:border-sky-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            aria-pressed={showPassword}
            className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-200"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-md bg-[#0284C7] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        <span>{isSubmitting ? "Memverifikasi Kredensial..." : "Masuk ke Workstation"}</span>
      </button>

      <div className="flex items-center gap-2 border-t border-slate-800 pt-3 text-[11px] text-slate-400">
        <Lock className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
        <span>
          Sesi dilindungi cookie terenkripsi untuk fungsi Neraca Wilayah dan Analisis Statistik (Nerwilis).
        </span>
      </div>
    </form>
  );
}

