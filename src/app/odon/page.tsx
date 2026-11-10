import { MuseWorkspace } from "@/components/muse/muse-workspace";
import { getCurrentSessionUser } from "@/lib/auth";

export const metadata = {
  title: "SIPENA-KTT — One Day One News (Muse Edition)",
  description: "Sistem Informasi Pemantauan Fenomena Ekonomi BPS Kabupaten Tana Tidung (Sheet 6503 ODON)",
};

export default async function OdonPage() {
  const user = await getCurrentSessionUser();
  const initialRole = user?.role === "admin" ? "admin" : "public";

  return <MuseWorkspace initialRole={initialRole} />;
}

