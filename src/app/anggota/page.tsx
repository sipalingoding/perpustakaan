import type { Metadata } from "next";
import { Suspense } from "react";
import { MembersSkeleton } from "@/components/Skeleton";
import { PageShell } from "@/components/layout/PageShell";
import { MembersClient } from "@/components/members/MembersClient";
import { getMemberBoard } from "@/lib/server/members-board";
import { requireViewer } from "@/lib/server/session";

export const metadata: Metadata = { title: "Anggota" };

export default function AnggotaPage() {
  return (
    <PageShell active="anggota">
      <Suspense fallback={<MembersSkeleton />}>
        <Anggota />
      </Suspense>
    </PageShell>
  );
}

async function Anggota() {
  const viewer = await requireViewer("/anggota");
  const { members, periods } = await getMemberBoard();
  return <MembersClient members={members} periods={periods} viewerId={viewer.id} />;
}
