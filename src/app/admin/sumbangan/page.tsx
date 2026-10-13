import type { Metadata } from "next";
import { Suspense } from "react";
import { AdminDonations } from "@/components/admin/AdminDonations";
import { AdminNav } from "@/components/admin/AdminNav";
import { PageShell } from "@/components/layout/PageShell";
import { AdminSkeleton } from "@/components/Skeleton";
import { getAdminCounts } from "@/lib/server/admin-counts";
import { getAdminDonations } from "@/lib/server/admin-donations";
import { requireLibrarian } from "@/lib/server/session";

export const metadata: Metadata = { title: "Sumbangan", robots: { index: false } };

export default function AdminDonationsPage() {
  return (
    <PageShell>
      <Suspense fallback={<AdminSkeleton />}>
        <Donations />
      </Suspense>
    </PageShell>
  );
}

async function Donations() {
  await requireLibrarian("/admin/sumbangan");
  const [donations, counts] = await Promise.all([getAdminDonations(), getAdminCounts()]);
  return (
    <>
      <AdminNav active="sumbangan" counts={counts} />
      <AdminDonations donations={donations} />
    </>
  );
}
