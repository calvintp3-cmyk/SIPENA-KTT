"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Lock, LogIn } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function validateEmail(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return "Masukkan alamat email pegawai terlebih dahulu.";
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return "Masukkan format email yang benar, misalnya analis@bps6504.go.id.";
    }
    return null;
  }

  function validatePassword(value: string): string | null {
    if (!value) {
      return "Masukkan kata sandi akun kerja Anda.";
    }
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrorMsg(null);

    const nextEmailErr = validateEmail(email);
    const nextPasswordErr = validatePassword(password);
    setEmailError(nextEmailErr);
    setPasswordError(nextPasswordErr);

    if (nextEmailErr) {
      emailInputRef.current?.focus();
      return;
    }
    if (nextPasswordErr) {
      passwordInputRef.current?.focus();
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
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
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {errorMsg && (
        <div
          role="alert"
          aria-live="assertive"
          className="flex items-start gap-2.5 rounded-lg border border-rose-300 bg-rose-50 p-3 text-xs leading-relaxed text-rose-900 dark:border-rose-800/80 dark:bg-rose-950/60 dark:text-rose-200"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400"
            aria-hidden="true"
          />
          <span>{errorMsg}</span>
        </div>
      )}

      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-xs font-semibold text-[var(--text-primary)]"
        >
          Email Pegawai / Akun Kerja{" "}
          <span className="text-rose-600 dark:text-rose-400" aria-hidden="true">
            *
          </span>
        </label>
        <p id="email-hint" className="mb-1.5 text-[11px] text-[var(--text-muted)]">
          Format: nama@bps6504.go.id
        </p>
        <input
          ref={emailInputRef}
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          autoCorrect="off"
          spellCheck={false}
          autoCapitalize="none"
          enterKeyHint="next"
          required
          aria-required="true"
          aria-invalid={emailError ? "true" : "false"}
          aria-describedby={emailError ? "email-hint email-error" : "email-hint"}
          value={email}
          onChange={(e) => {
            const next = e.target.value;
            setEmail(next);
            if (emailError) {
              setEmailError(validateEmail(next));
            }
          }}
          onBlur={() => {
            if (email.length > 0) {
              setEmailError(validateEmail(email));
            }
          }}
          placeholder="nama@bps6504.go.id"
          className={`min-h-[44px] w-full rounded-lg border bg-[var(--bg-subtle)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:bg-[var(--bg-surface)] focus:outline-none ${
            emailError
              ? "border-rose-600 focus:border-rose-600"
              : "border-[var(--border-strong)] focus:border-[var(--focus-ring)]"
          }`}
        />
        {emailError && (
          <p
            id="email-error"
            className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-300"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{emailError}</span>
          </p>
        )}
      </div>

      <div>
        <label
          htmlFor="password"
          className="mb-1.5 block text-xs font-semibold text-[var(--text-primary)]"
        >
          Kata Sandi{" "}
          <span className="text-rose-600 dark:text-rose-400" aria-hidden="true">
            *
          </span>
        </label>
        <div className="relative">
          <input
            ref={passwordInputRef}
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            enterKeyHint="done"
            required
            aria-required="true"
            aria-invalid={passwordError ? "true" : "false"}
            aria-describedby={passwordError ? "password-error" : undefined}
            value={password}
            onChange={(e) => {
              const next = e.target.value;
              setPassword(next);
              if (passwordError) {
                setPasswordError(validatePassword(next));
              }
            }}
            placeholder="Masukkan kata sandi akun"
            className={`min-h-[44px] w-full rounded-lg border bg-[var(--bg-subtle)] py-2.5 pl-3.5 pr-12 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] transition-colors focus:bg-[var(--bg-surface)] focus:outline-none ${
              passwordError
                ? "border-rose-600 focus:border-rose-600"
                : "border-[var(--border-strong)] focus:border-[var(--focus-ring)]"
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
            aria-pressed={showPassword}
            className="absolute right-0.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-md text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] sm:right-1.5 sm:h-9 sm:w-9"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {passwordError && (
          <p
            id="password-error"
            className="mt-1.5 flex items-center gap-1.5 text-xs font-medium text-rose-700 dark:text-rose-300"
          >
            <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span>{passwordError}</span>
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--accent-primary-hover)] disabled:opacity-60"
      >
        <LogIn className="h-4 w-4" aria-hidden="true" />
        <span>{isSubmitting ? "Memverifikasi Kredensial..." : "Masuk ke Workstation"}</span>
      </button>

      <div className="flex items-start gap-2 border-t border-[var(--border-subtle)] pt-4 text-[11px] leading-relaxed text-[var(--text-muted)]">
        <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>
          Sesi dilindungi cookie terenkripsi untuk fungsi Neraca Wilayah dan Analisis Statistik (Nerwilis).
        </span>
      </div>
    </form>
  );
}
