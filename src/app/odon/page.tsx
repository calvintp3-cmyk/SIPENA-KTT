import { MuseWorkspace } from "@/components/muse/muse-workspace";
import { getOdonOverviewData } from "@/db/odon-queries";
import { canEditPhenomena, getCurrentSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "SIPENA-KTT | One Day One News (ODON 6504)",
  description:
    "Sistem Informasi Pemantauan Fenomena Ekonomi BPS Kabupaten Tana Tidung (Sheet 6503 ODON)",
};

export default async function OdonPage() {
  const user = await getCurrentSessionUser();
  const hasAdminSession = Boolean(user && canEditPhenomena(user));
  const initialData = await getOdonOverviewData({
    includeAdmin: hasAdminSession,
  });

  return (
    <MuseWorkspace
      initialData={initialData}
      hasAdminSession={hasAdminSession}
      initialRole={hasAdminSession ? "admin" : "public"}
      sessionRole={user?.role ?? null}
      userName={user?.name ?? null}
    />
  );
}
