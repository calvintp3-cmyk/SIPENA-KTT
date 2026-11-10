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
    <div className="flex min-h-screen flex-col bg-[var(--bg-canvas)] lg:flex-row">
      {/* Left: Sovereign BPS 65.04 Institutional Context Panel */}
      <aside className="relative flex flex-col justify-between bg-[var(--bg-rail)] px-6 py-8 text-[var(--text-rail)] sm:px-10 lg:w-[46%] lg:max-w-[560px] lg:px-12 lg:py-12">
        <div className="flex items-center gap-3">
          <BrandMark size="md" tone="navy" />
          <div>
            <span className="block text-sm font-semibold tracking-tight text-white">
              SIPENA-KTT
            </span>
            <span className="block font-mono text-[11px] text-sky-300">
              BPS Kabupaten Tana Tidung (65.04)
            </span>
          </div>
        </div>

        <div className="my-10 space-y-6 lg:my-0">
          <div className="space-y-3">
            <h1 className="text-2xl font-bold leading-tight tracking-[-0.025em] text-white sm:text-3xl">
              Sistem Informasi Fenomena Ekonomi dan Neraca Tana Tidung
            </h1>
            <p className="max-w-md text-sm leading-relaxed text-[#C7D7E8]">
              Workstation kurasi berita ekonomi daerah untuk mendukung penyusunan angka Produk Domestik Regional Bruto (PDRB) Triwulanan Tim Nerwilis.
            </p>
          </div>

          <dl className="grid grid-cols-1 gap-3 border-t border-[var(--border-rail)] pt-6 text-xs sm:grid-cols-2 lg:grid-cols-1">
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-rail)] pb-3">
              <dt className="font-medium text-white">Sumber Pemantauan</dt>
              <dd className="text-right text-[#C7D7E8]">
                5 Media Regional Kaltara &amp; Media Nasional
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-rail)] pb-3">
              <dt className="font-medium text-white">Taksonomi Baku</dt>
              <dd className="text-right font-mono text-[#C7D7E8]">
                17 Sektor KBLI &amp; 8 Komponen Pengeluaran
              </dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="font-medium text-white">Keluaran Rekonsiliasi</dt>
              <dd className="text-right text-[#C7D7E8]">
                Workbook .xlsx Tiga Sheet Standar Diseminasi
              </dd>
            </div>
          </dl>
        </div>

        <div className="font-mono text-[11px] text-[var(--text-rail-muted)]">
          Fungsi Neraca Wilayah dan Analisis Statistik &middot; Provinsi Kalimantan Utara
        </div>
      </aside>

      {/* Right: Daylight / Adaptive Sign-In Panel */}
      <main className="flex flex-1 flex-col justify-between px-4 py-6 sm:px-8 sm:py-8">
        <div className="flex items-center justify-end">
          <ThemeToggle />
        </div>

        <div className="mx-auto my-8 w-full max-w-md">
          <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 shadow-elevated sm:p-8">
            <div className="mb-6 border-b border-[var(--border-subtle)] pb-5">
              <h2 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
                Masuk ke Workstation
              </h2>
              <p className="mt-1.5 text-sm leading-relaxed text-[var(--text-secondary)]">
                Gunakan akun kerja resmi Tim Nerwilis BPS Kabupaten Tana Tidung untuk menelaah fenomena dan mengunduh kertas kerja PDRB.
              </p>
            </div>

            <LoginForm />
          </div>
        </div>

        <footer className="text-center font-mono text-[11px] text-[var(--text-muted)]">
          BPS Kab. Tana Tidung (65.04) &middot; Workstation Kurasi PDRB
        </footer>
      </main>
    </div>
  );
}
