import { redirect } from "next/navigation";
import { getCurrentSessionUser } from "@/lib/auth";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const user = await getCurrentSessionUser();
  if (user) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#080C14] px-4 py-10">
      <div className="w-full max-w-md rounded-lg border border-slate-800 bg-[#0D131F] p-6 shadow-xl sm:p-8">
        <div className="mb-6 border-b border-slate-800 pb-5">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded border border-sky-500/40 bg-[#002B49] font-display text-sm font-bold text-sky-300">
              65.04
            </div>
            <div>
              <span className="block font-mono text-[11px] uppercase tracking-wider text-sky-400">
                BPS Kabupaten Tana Tidung
              </span>
              <h1 className="font-display text-xl font-semibold tracking-tight text-white">
                Masuk ke SIPENA-KTT
              </h1>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-slate-300">
            Sistem Informasi Fenomena Ekonomi dan Neraca Wilayah Tana Tidung. Gunakan akun kerja Tim Nerwilis untuk menelaah klasifikasi KBLI dan mengunduh kertas kerja PDRB.
          </p>
        </div>

        <LoginForm />

        <div className="mt-6 text-center font-mono text-[11px] text-slate-500">
          BPS Kab. Tana Tidung (65.04) &middot; Provinsi Kalimantan Utara
        </div>
      </div>
    </main>
  );
}

