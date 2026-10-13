import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminLoans } from "@/components/admin/AdminLoans";
import { AdminNav } from "@/components/admin/AdminNav";
import { PageShell } from "@/components/layout/PageShell";
import { AdminSkeleton } from "@/components/Skeleton";
import { getAdminCounts } from "@/lib/server/admin-counts";
import { getAdminLoans } from "@/lib/server/admin-loans";
import { requireLibrarian } from "@/lib/server/session";

export const metadata: Metadata = { title: "Peminjaman", robots: { index: false } };

export default function AdminLoansPage() {
  return (
    <PageShell>
      <Suspense fallback={<AdminSkeleton />}>
        <Loans />
      </Suspense>
    </PageShell>
  );
}

async function Loans() {
  await requireLibrarian("/admin/peminjaman");
  const [loans, counts] = await Promise.all([getAdminLoans(), getAdminCounts()]);
  return (
    <>
      <AdminNav active="peminjaman" counts={counts} />
      <AdminLoans loans={loans} />
    </>
  );
}
