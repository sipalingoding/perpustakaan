import type { Metadata } from "next";
import { Suspense } from "react";
import { AgendaClient } from "@/components/agenda/AgendaClient";
import { PageShell } from "@/components/layout/PageShell";
import { AgendaSkeleton } from "@/components/Skeleton";
import { getAgendaPhotos, getUpcomingEvents } from "@/lib/server/agenda";
import { getViewer } from "@/lib/server/session";

export const metadata: Metadata = {
  title: "Agenda",
  description: "Agenda kopi darat Lembar bersama @kopiku_literasi: 2 Jam Tanpa Gadget, Basa-Basi, KKN, dan Ngopi.",
};

export default function AgendaPage() {
  return (
    <PageShell active="agenda">
      <Suspense fallback={<AgendaSkeleton />}>
        <Agenda />
      </Suspense>
    </PageShell>
  );
}

/** Terbuka untuk tamu; mendaftar perlu masuk. */
async function Agenda() {
  const viewer = await getViewer();
  const [events, photos] = await Promise.all([getUpcomingEvents(viewer?.id ?? null), getAgendaPhotos()]);
  return <AgendaClient events={events} photos={photos} signedIn={!!viewer} />;
}
