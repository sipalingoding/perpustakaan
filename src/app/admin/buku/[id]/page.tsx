import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookForm } from "@/components/admin/BookForm";
import { PageShell } from "@/components/layout/PageShell";
import { BookFormSkeleton } from "@/components/Skeleton";
import { getAdminBook } from "@/lib/server/admin";
import { getCategories } from "@/lib/server/categories";
import { requireLibrarian } from "@/lib/server/session";

export const metadata: Metadata = {
  title: "Ubah buku",
  robots: { index: false },
};

export default function EditBookPage(props: PageProps<"/admin/buku/[id]">) {
  return (
    <PageShell>
      <Suspense fallback={<BookFormSkeleton />}>
        <EditBook {...props} />
      </Suspense>
    </PageShell>
  );
}

async function EditBook({ params, searchParams }: PageProps<"/admin/buku/[id]">) {
  const { id } = await params;
  await requireLibrarian(`/admin/buku/${id}`);
  const [book, query, categories] = await Promise.all([getAdminBook(id), searchParams, getCategories()]);
  if (!book) notFound();
  // key: muat ulang formulir bila pindah ke buku lain.
  return <BookForm
      key={book.id}
      initial={book}
      categories={categories.map((c) => c.name)}
      created={query.baru === "1"}
    />;
}
