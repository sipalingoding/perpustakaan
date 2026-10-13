import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { AdminNav } from "@/components/admin/AdminNav";
import { PageShell } from "@/components/layout/PageShell";
import { AdminSkeleton } from "@/components/Skeleton";
import { getAdminBooks } from "@/lib/server/admin";
import { getAdminCounts } from "@/lib/server/admin-counts";
import { requireLibrarian } from "@/lib/server/session";

export const metadata: Metadata = {
  title: "Kelola koleksi",
  robots: { index: false },
};

export default function AdminPage() {
  return (
    <PageShell>
      <Suspense fallback={<AdminSkeleton />}>
        <Dashboard />
      </Suspense>
    </PageShell>
  );
}

async function Dashboard() {
  await requireLibrarian();
  const [books, counts] = await Promise.all([getAdminBooks(), getAdminCounts()]);
  return (
    <>
      <AdminNav active="koleksi" counts={counts} />
      <AdminDashboard books={books} />
    </>
  );
}
