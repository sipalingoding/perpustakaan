import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { BookForm } from "@/components/admin/BookForm";
import { PageShell } from "@/components/layout/PageShell";
import { BookFormSkeleton } from "@/components/Skeleton";
import { getAdminBook } from "@/lib/server/admin";
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
  const [book, query] = await Promise.all([getAdminBook(id), searchParams]);
  if (!book) notFound();
  // key: muat ulang formulir bila pindah ke buku lain.
  return <BookForm key={book.id} initial={book} created={query.baru === "1"} />;
}
