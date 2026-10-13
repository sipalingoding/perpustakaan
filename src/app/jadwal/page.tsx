import type { Metadata } from "next";
import { Suspense } from "react";
import { PageShell } from "@/components/layout/PageShell";
import { ScheduleClient } from "@/components/schedule/ScheduleClient";
import { ScheduleSkeleton } from "@/components/Skeleton";
import { getSchedule } from "@/lib/server/schedule";
import { requireViewer } from "@/lib/server/session";

export const metadata: Metadata = { title: "Jadwal peminjaman" };

export default function JadwalPage() {
  return (
    <PageShell active="jadwal">
      <Suspense fallback={<ScheduleSkeleton />}>
        <Jadwal />
      </Suspense>
    </PageShell>
  );
}

async function Jadwal() {
  const viewer = await requireViewer("/jadwal");
  return <ScheduleClient data={await getSchedule(viewer.id)} />;
}
