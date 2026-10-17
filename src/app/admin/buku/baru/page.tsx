import type { Metadata } from "next";
import { Suspense } from "react";
import { BookForm } from "@/components/admin/BookForm";
import { PageShell } from "@/components/layout/PageShell";
import { BookFormSkeleton } from "@/components/Skeleton";
import { EMPTY_BOOK } from "@/lib/server/admin";
import { getCategories } from "@/lib/server/categories";
import { requireLibrarian } from "@/lib/server/session";

export const metadata: Metadata = {
  title: "Tambah buku",
  robots: { index: false },
};

export default function NewBookPage() {
  return (
    <PageShell>
      <Suspense fallback={<BookFormSkeleton />}>
        <NewBook />
      </Suspense>
    </PageShell>
  );
}

async function NewBook() {
  await requireLibrarian("/admin/buku/baru");
  const categories = await getCategories();
  return <BookForm initial={EMPTY_BOOK} categories={categories.map((c) => c.name)} />;
}
