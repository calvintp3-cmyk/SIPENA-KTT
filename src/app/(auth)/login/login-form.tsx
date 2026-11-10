"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Eye, EyeOff, Loader2, Lock, LogIn } from "lucide-react";

export function LoginForm() {
  const router = useRouter();
  const emailInputRef = useRef<HTMLInputElement>(null);
  const passwordInputRef = useRef<HTMLInputElement>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
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
      return "Gunakan format email yang benar, misalnya analis@bps6504.go.id.";
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
    setEmailTouched(true);
    setPasswordTouched(true);

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
        "Koneksi ke server terputus. Pastikan jaringan kantor aktif dan coba lagi."
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
          className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-3 text-xs leading-relaxed text-rose-800 dark:border-rose-800/80 dark:bg-rose-950/60 dark:text-rose-200"
        >
          <AlertCircle
            className="mt-0.5 h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400"
            aria-hidden="true"
          />
          <span>{errorMsg}</span>
        </div>
      )}

      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label
            htmlFor="email"
            className="text-[13px] font-medium text-[var(--text-primary)]"
          >
            Email Pegawai
          </label>
          <span className="text-[11px] text-[var(--text-muted)]">
            @bps6504.go.id
          </span>
        </div>
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
          aria-invalid={emailTouched && emailError ? "true" : "false"}
          aria-describedby={emailTouched && emailError ? "email-error" : undefined}
          value={email}
          onChange={(e) => {
            const next = e.target.value;
            setEmail(next);
            if (emailTouched) {
              setEmailError(validateEmail(next));
            }
          }}
          onBlur={() => {
            if (email.length > 0) {
              setEmailTouched(true);
              setEmailError(validateEmail(email));
            }
          }}
          placeholder="analis@bps6504.go.id"
          className={`input-modern h-11 w-full rounded-xl px-3.5 text-sm placeholder:text-[var(--text-muted)] ${
            emailTouched && emailError
              ? "border-rose-500 focus:border-rose-600 focus:shadow-[0_0_0_3px_rgba(225,29,72,0.14)]"
              : ""
          }`}
        />
        {emailTouched && emailError && (
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
          className="mb-1.5 block text-[13px] font-medium text-[var(--text-primary)]"
        >
          Kata Sandi
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
            aria-invalid={passwordTouched && passwordError ? "true" : "false"}
            aria-describedby={
              passwordTouched && passwordError ? "password-error" : undefined
            }
            value={password}
            onChange={(e) => {
              const next = e.target.value;
              setPassword(next);
              if (passwordTouched) {
                setPasswordError(validatePassword(next));
              }
            }}
            onBlur={() => {
              if (password.length > 0) {
                setPasswordTouched(true);
                setPasswordError(validatePassword(password));
              }
            }}
            placeholder="Masukkan kata sandi akun"
            className={`input-modern h-11 w-full rounded-xl pl-3.5 pr-12 text-sm placeholder:text-[var(--text-muted)] ${
              passwordTouched && passwordError
                ? "border-rose-500 focus:border-rose-600 focus:shadow-[0_0_0_3px_rgba(225,29,72,0.14)]"
                : ""
            }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            aria-label={
              showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"
            }
            aria-pressed={showPassword}
            className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[var(--text-muted)] transition-colors hover:bg-[var(--bg-subtle)] hover:text-[var(--text-primary)]"
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Eye className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
        {passwordTouched && passwordError && (
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
        className="btn-obsidian flex h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60"
      >
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <LogIn className="h-4 w-4" aria-hidden="true" />
        )}
        <span>
          {isSubmitting ? "Memverifikasi Kredensial..." : "Masuk ke Ruang Kerja"}
        </span>
      </button>

      <div className="flex items-center justify-center gap-1.5 pt-1 text-xs text-[var(--text-muted)]">
        <Lock className="h-3.5 w-3.5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
        <span>Sesi terenkripsi &middot; Akses khusus Tim Nerwilis</span>
      </div>
    </form>
  );
}
