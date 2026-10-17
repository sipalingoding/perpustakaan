import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminCategories } from "@/components/admin/AdminCategories";
import { AdminNav } from "@/components/admin/AdminNav";
import { PageShell } from "@/components/layout/PageShell";
import { AdminSkeleton } from "@/components/Skeleton";
import { getAdminCounts } from "@/lib/server/admin-counts";
import { getAdminCategories } from "@/lib/server/categories";
import { requireLibrarian } from "@/lib/server/session";

export const metadata: Metadata = { title: "Kategori", robots: { index: false } };

export default function AdminCategoriesPage() {
  return (
    <PageShell>
      <Suspense fallback={<AdminSkeleton />}>
        <Categories />
      </Suspense>
    </PageShell>
  );
}

async function Categories() {
  await requireLibrarian("/admin/kategori");
  const [categories, counts] = await Promise.all([getAdminCategories(), getAdminCounts()]);
  return (
    <>
      <AdminNav active="kategori" counts={counts} />
      <AdminCategories categories={categories} />
    </>
  );
}
