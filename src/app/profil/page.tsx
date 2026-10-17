import type { Metadata } from "next";
import { Suspense } from "react";
import { ProfileSkeleton } from "@/components/Skeleton";
import { PageShell } from "@/components/layout/PageShell";
import { ProfileClient } from "@/components/profile/ProfileClient";
import { getCategories } from "@/lib/server/categories";
import { getProfilePage } from "@/lib/server/profile-page";
import { requireViewer } from "@/lib/server/session";

export const metadata: Metadata = { title: "Profil anggota" };

export default function ProfilPage() {
  return (
    <PageShell active="profil">
      <Suspense fallback={<ProfileSkeleton />}>
        <Profile />
      </Suspense>
    </PageShell>
  );
}

async function Profile() {
  const viewer = await requireViewer("/profil");
  const [data, categories] = await Promise.all([getProfilePage(viewer.id), getCategories()]);
  if (!data) throw new Error("Profil anggota tidak ditemukan");
  return <ProfileClient data={data} categories={categories.map((c) => c.name)} />;
}
