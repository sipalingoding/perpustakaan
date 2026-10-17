import type { Metadata } from "next";
import { Suspense } from "react";
import { DonateSkeleton } from "@/components/Skeleton";
import { DonateClient } from "@/components/donate/DonateClient";
import { PageShell } from "@/components/layout/PageShell";
import { getCategories } from "@/lib/server/categories";
import { donationSchedule } from "@/lib/server/donations";
import { getProfile } from "@/lib/server/members";
import { requireViewer } from "@/lib/server/session";

export const metadata: Metadata = { title: "Sumbang buku" };

export default function SumbangPage() {
  return (
    <PageShell active="sumbang">
      <Suspense fallback={<DonateSkeleton />}>
        <Sumbang />
      </Suspense>
    </PageShell>
  );
}

async function Sumbang() {
  const viewer = await requireViewer("/sumbang");
  const [profile, schedule, categories] = await Promise.all([
    getProfile(viewer.id),
    donationSchedule(),
    getCategories(),
  ]);
  return <DonateClient donor={profile?.nickname ?? viewer.name} schedule={schedule} categories={categories} />;
}
