"use server";

import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { agendaEvents, agendaRegistrations } from "@/db/schema";
import { AGENDA } from "@/lib/agenda";
import { formatDay } from "@/lib/dates";
import { startedSql } from "@/lib/server/agenda";
import { notify } from "@/lib/server/notifications";
import { getViewer } from "@/lib/server/session";

export type JoinResult =
  { ok: true; registered: number; mine: boolean } | { ok: false; error: string; registered?: number };

const SESSION_ENDED = { ok: false, error: "Masuk dulu untuk ikut agenda." } as const;
const GONE = { ok: false, error: "Jadwal ini sudah tidak ada. Muat ulang halaman." } as const;

const hhmm = (t: string) => t.slice(0, 5).replace(":", ".");

/**
 * Daftar ikut satu pertemuan. Baris jadwal dikunci selama transaksi supaya dua pendaftar terakhir
 * tidak sama-sama mendapat kursi yang tinggal satu.
 */
export async function joinEvent(eventId: string): Promise<JoinResult> {
  const viewer = await getViewer();
  if (!viewer) return SESSION_ENDED;
  if (!z.uuid().safeParse(eventId).success) return GONE;

  return db.transaction(async (tx): Promise<JoinResult> => {
    const [event] = await tx
      .select({
        kind: agendaEvents.kind,
        date: agendaEvents.date,
        startTime: agendaEvents.startTime,
        place: agendaEvents.place,
        capacity: agendaEvents.capacity,
        started: startedSql,
      })
      .from(agendaEvents)
      .where(eq(agendaEvents.id, eventId))
      .for("update");
    if (!event) return GONE;

    const count = async () =>
      (
        await tx
          .select({ n: sql<number>`count(*)::int` })
          .from(agendaRegistrations)
          .where(eq(agendaRegistrations.eventId, eventId))
      )[0].n;

    const [already] = await tx
      .select({ userId: agendaRegistrations.userId })
      .from(agendaRegistrations)
      .where(and(eq(agendaRegistrations.eventId, eventId), eq(agendaRegistrations.userId, viewer.id)));
    if (already) return { ok: true, registered: await count(), mine: true };

    if (event.started) return { ok: false, error: "Agenda ini sudah dimulai, pendaftarannya ditutup." };
    const before = await count();
    if (event.capacity !== null && before >= event.capacity) {
      return { ok: false, error: "Kursinya baru saja habis. Coba jadwal berikutnya, ya.", registered: before };
    }

    await tx.insert(agendaRegistrations).values({ eventId, userId: viewer.id });
    const info = AGENDA[event.kind];
    await notify(
      {
        userId: viewer.id,
        kind: "agenda",
        title: "Terdaftar di agenda",
        body: `${info.name}: ${formatDay(Date.parse(event.date))}, ${hhmm(event.startTime)} di ${event.place}. Sampai ketemu!`,
        href: `/agenda#jadwal-${eventId}`,
      },
      tx,
    );
    return { ok: true, registered: before + 1, mine: true };
  });
}

/** Batal ikut. Hanya sebelum acara dimulai. */
export async function leaveEvent(eventId: string): Promise<JoinResult> {
  const viewer = await getViewer();
  if (!viewer) return SESSION_ENDED;
  if (!z.uuid().safeParse(eventId).success) return GONE;

  const [event] = await db.select({ started: startedSql }).from(agendaEvents).where(eq(agendaEvents.id, eventId));
  if (!event) return GONE;
  if (event.started) return { ok: false, error: "Agenda ini sudah dimulai, jadi tidak bisa dibatalkan lagi." };

  await db
    .delete(agendaRegistrations)
    .where(and(eq(agendaRegistrations.eventId, eventId), eq(agendaRegistrations.userId, viewer.id)));
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(agendaRegistrations)
    .where(eq(agendaRegistrations.eventId, eventId));
  return { ok: true, registered: n, mine: false };
}
