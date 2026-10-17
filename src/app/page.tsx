import { Suspense } from "react";
import { CatalogSkeleton } from "@/components/Skeleton";
import { KatalogClient } from "@/components/catalog/KatalogClient";
import { PageShell } from "@/components/layout/PageShell";
import { getMyActiveLoans } from "@/lib/server/loans";
import { getBooks } from "@/lib/server/catalog";
import { getCategories } from "@/lib/server/categories";
import { getViewer } from "@/lib/server/session";

export default function KatalogPage() {
  return (
    <PageShell active="katalog">
      <Suspense fallback={<CatalogSkeleton />}>
        <Katalog />
      </Suspense>
    </PageShell>
  );
}

async function Katalog() {
  const viewer = await getViewer();
  const [books, myLoans, categories] = await Promise.all([
    getBooks(viewer?.id),
    viewer ? getMyActiveLoans(viewer.id) : [],
    getCategories(),
  ]);
  return <KatalogClient books={books} myLoans={myLoans} categories={categories.map((c) => c.name)} />;
}
