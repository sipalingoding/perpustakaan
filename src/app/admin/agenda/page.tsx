import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminAgenda } from "@/components/admin/AdminAgenda";
import { AdminNav } from "@/components/admin/AdminNav";
import { PageShell } from "@/components/layout/PageShell";
import { AdminSkeleton } from "@/components/Skeleton";
import { getAdminCounts } from "@/lib/server/admin-counts";
import { getAdminAgenda, getAgendaPhotos } from "@/lib/server/agenda";
import { requireLibrarian } from "@/lib/server/session";

export const metadata: Metadata = { title: "Agenda", robots: { index: false } };

export default function AdminAgendaPage() {
  return (
    <PageShell>
      <Suspense fallback={<AdminSkeleton />}>
        <Agenda />
      </Suspense>
    </PageShell>
  );
}

async function Agenda() {
  await requireLibrarian("/admin/agenda");
  const [{ upcoming, past }, photos, counts] = await Promise.all([
    getAdminAgenda(),
    getAgendaPhotos(),
    getAdminCounts(),
  ]);
  // Tanggal hari ini menurut jam perpustakaan, untuk batas bawah pilihan tanggal.
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
  return (
    <>
      <AdminNav active="agenda" counts={counts} />
      <AdminAgenda upcoming={upcoming} past={past} photos={photos} today={today} />
    </>
  );
}
