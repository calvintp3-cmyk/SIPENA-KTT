import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/auth";
import { BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-provider";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentSessionUser();
  if (user) {
    redirect("/");
  }

  return (
    <div className="relative flex min-h-screen flex-col justify-between bg-[var(--bg-canvas)] bg-[radial-gradient(ellipse_80%_42%_at_50%_-6%,rgba(5,150,105,0.09),transparent)] px-4 py-6 sm:px-8">
      {/* Top Minimal Institutional Bar */}
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3.5 py-1.5 text-xs font-medium text-[var(--text-secondary)] shadow-xs">
          <span
            aria-hidden="true"
            className="h-2 w-2 rounded-full bg-emerald-600"
          />
          <span>BPS Kabupaten Tana Tidung &middot; 65.04</span>
        </div>

        <ThemeToggle />
      </header>

      {/* Centerpiece Light-First SaaS Gateway Card */}
      <main className="mx-auto my-8 w-full max-w-[440px]">
        <div className="saas-card-floating p-7 sm:p-10">
          <div className="flex items-center gap-3">
            <BrandMark size="md" tone="emerald" />
            <div>
              <span className="block text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                SIPENA-KTT
              </span>
              <span className="block text-xs text-[var(--text-muted)]">
                Neraca Wilayah &amp; Analisis Statistik
              </span>
            </div>
          </div>

          <div className="mt-6">
            <h1 className="text-[22px] font-bold leading-snug tracking-[-0.02em] text-[var(--text-primary)] sm:text-2xl">
              Masuk ke Ruang Kerja
            </h1>
            <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
              Kurasi fenomena ekonomi daerah dan penyusunan kertas kerja PDRB Triwulanan.
            </p>
          </div>

          <div className="my-6 border-t border-[var(--border-hairline)]" />

          <LoginForm />
        </div>

        <p className="mt-5 text-center text-xs text-[var(--text-muted)]">
          17 Sektor KBLI &middot; 8 Komponen Pengeluaran &middot; Rekonsiliasi .xlsx
        </p>
      </main>

      {/* Minimal Footer */}
      <footer className="mx-auto w-full max-w-5xl text-center text-xs text-[var(--text-muted)]">
        Fungsi Neraca Wilayah dan Analisis Statistik &middot; BPS Kab. Tana Tidung
      </footer>
    </div>
  );
}
