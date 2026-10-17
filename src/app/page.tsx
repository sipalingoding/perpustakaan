import { Suspense } from "react";
import { CatalogSkeleton } from "@/components/Skeleton";
import { KatalogClient } from "@/components/catalog/KatalogClient";
import { VisitInfo } from "@/components/catalog/VisitInfo";
import { AgendaPosterPopup } from "@/components/agenda/AgendaPosterPopup";
import { PageShell } from "@/components/layout/PageShell";
import { getUpcomingEvents } from "@/lib/server/agenda";
import { getMyActiveLoans } from "@/lib/server/loans";
import { getBooks } from "@/lib/server/catalog";
import { getCategories } from "@/lib/server/categories";
import { getLibraryStatus } from "@/lib/server/library-status";
import { getViewer } from "@/lib/server/session";

export default function KatalogPage() {
  return (
    <PageShell active="katalog">
      <Suspense fallback={<CatalogSkeleton />}>
        <Katalog />
      </Suspense>
      <Suspense fallback={<VisitInfo />}>
        <LiveVisitInfo />
      </Suspense>
    </PageShell>
  );
}

async function Katalog() {
  const viewer = await getViewer();
  const [books, myLoans, categories, events] = await Promise.all([
    getBooks(viewer?.id),
    viewer ? getMyActiveLoans(viewer.id) : [],
    getCategories(),
    // Anggota yang masuk melihat poster dari header (HeaderActions); di beranda hanya untuk tamu.
    viewer ? [] : getUpcomingEvents(null, 6),
  ]);
  const featured = events.find((e) => e.poster && !e.started);
  return (
    <>
      <KatalogClient books={books} myLoans={myLoans} categories={categories.map((c) => c.name)} />
      {featured && <AgendaPosterPopup event={featured} viewerKey="tamu" />}
    </>
  );
}

/** Status buka/tutup dibaca saat permintaan, supaya penutupan manual pustakawan langsung terlihat. */
async function LiveVisitInfo() {
  const { status, now } = await getLibraryStatus();
  return <VisitInfo status={status} now={now} />;
}
