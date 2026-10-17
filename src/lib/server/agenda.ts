import "server-only";
import { and, asc, desc, eq, gt, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { agendaEvents, agendaPhotos, agendaRegistrations, user } from "@/db/schema";
import { AGENDA_KINDS, type AgendaKind } from "@/lib/agenda";
import { LIBRARY_TZ } from "@/lib/server/members";
import { fileUrl } from "@/lib/server/storage";

/** Tanggal dan jam sekarang menurut waktu Jakarta, untuk dibandingkan dengan kolom date dan time. */
export const todayJakarta = sql`(now() at time zone ${LIBRARY_TZ})::date`;
export const nowTimeJakarta = sql`(now() at time zone ${LIBRARY_TZ})::time`;

/** Belum selesai: tanggalnya nanti, atau hari ini dan jam selesainya belum lewat. */
const notFinished = or(
  gt(agendaEvents.date, todayJakarta),
  and(eq(agendaEvents.date, todayJakarta), gt(agendaEvents.endTime, nowTimeJakarta)),
)!;

/** Sudah dimulai (pendaftaran dan pembatalan ditutup). */
export const startedSql = sql<boolean>`(${agendaEvents.date} < ${todayJakarta} or (${agendaEvents.date} = ${todayJakarta} and ${agendaEvents.startTime} <= ${nowTimeJakarta}))`;

export type AgendaEventView = {
  id: string;
  kind: AgendaKind;
  /** "YYYY-MM-DD" */
  date: string;
  /** "19.30" */
  start: string;
  end: string;
  place: string;
  note: string;
  capacity: number | null;
  registered: number;
  /** Sudah dimulai: pendaftaran ditutup, acara sedang berjalan. */
  started: boolean;
  /** Anggota yang sedang melihat sudah terdaftar. */
  mine: boolean;
  /** Poster acara, bila pustakawan mengunggahnya. */
  poster: { src: string; width: number; height: number } | null;
};

/** "19:30:00" -> "19.30" */
const hhmm = (t: string) => t.slice(0, 5).replace(":", ".");

const registeredCount = sql<number>`(select count(*)::int from ${agendaRegistrations} where ${agendaRegistrations.eventId} = ${agendaEvents.id})`;

const eventColumns = {
  id: agendaEvents.id,
  kind: agendaEvents.kind,
  date: agendaEvents.date,
  startTime: agendaEvents.startTime,
  endTime: agendaEvents.endTime,
  place: agendaEvents.place,
  note: agendaEvents.note,
  capacity: agendaEvents.capacity,
  registered: registeredCount,
  started: startedSql,
  posterKey: agendaEvents.posterKey,
  posterWidth: agendaEvents.posterWidth,
  posterHeight: agendaEvents.posterHeight,
};

type EventRow = {
  id: string;
  kind: AgendaKind;
  date: string;
  startTime: string;
  endTime: string;
  place: string;
  note: string;
  capacity: number | null;
  registered: number;
  started: boolean;
  posterKey: string | null;
  posterWidth: number | null;
  posterHeight: number | null;
};

const toView = (r: EventRow, mine: boolean): AgendaEventView => ({
  id: r.id,
  kind: r.kind,
  date: r.date,
  start: hhmm(r.startTime),
  end: hhmm(r.endTime),
  place: r.place,
  note: r.note,
  capacity: r.capacity,
  registered: r.registered,
  started: r.started,
  mine,
  poster:
    r.posterKey && r.posterWidth && r.posterHeight
      ? { src: fileUrl(r.posterKey), width: r.posterWidth, height: r.posterHeight }
      : null,
});

/** Jadwal yang belum selesai, terdekat lebih dulu. */
export async function getUpcomingEvents(viewerId: string | null, limit = 12): Promise<AgendaEventView[]> {
  const rows = await db
    .select(eventColumns)
    .from(agendaEvents)
    .where(notFinished)
    .orderBy(asc(agendaEvents.date), asc(agendaEvents.startTime))
    .limit(limit);
  const mine = new Set<string>();
  if (viewerId && rows.length > 0) {
    const regs = await db
      .select({ eventId: agendaRegistrations.eventId })
      .from(agendaRegistrations)
      .where(
        and(
          eq(agendaRegistrations.userId, viewerId),
          inArray(
            agendaRegistrations.eventId,
            rows.map((r) => r.id),
          ),
        ),
      );
    for (const r of regs) mine.add(r.eventId);
  }
  return rows.map((r) => toView(r, mine.has(r.id)));
}

export type AgendaPhoto = { id: string; kind: AgendaKind; src: string; width: number; height: number; caption: string };

/** Foto dokumentasi per agenda, terbaru lebih dulu. */
export async function getAgendaPhotos(): Promise<Record<AgendaKind, AgendaPhoto[]>> {
  const rows = await db.select().from(agendaPhotos).orderBy(desc(agendaPhotos.createdAt));
  const out = Object.fromEntries(AGENDA_KINDS.map((k) => [k, [] as AgendaPhoto[]])) as Record<
    AgendaKind,
    AgendaPhoto[]
  >;
  for (const r of rows) {
    out[r.kind].push({
      id: r.id,
      kind: r.kind,
      src: fileUrl(r.fileKey),
      width: r.width,
      height: r.height,
      caption: r.caption,
    });
  }
  return out;
}

/* ---------------------------------------------------------------- */
/* Admin                                                             */
/* ---------------------------------------------------------------- */

export type AdminAgendaEvent = AgendaEventView & {
  /** Nilai mentah untuk formulir ubah: "19:30". */
  startTime: string;
  endTime: string;
  participants: Array<{ name: string; email: string }>;
};

/** Jadwal yang belum selesai (beserta peserta), dan 10 jadwal terakhir yang sudah lewat. */
export async function getAdminAgenda(): Promise<{ upcoming: AdminAgendaEvent[]; past: AdminAgendaEvent[] }> {
  const [upcoming, past] = await Promise.all([
    db
      .select(eventColumns)
      .from(agendaEvents)
      .where(notFinished)
      .orderBy(asc(agendaEvents.date), asc(agendaEvents.startTime)),
    db
      .select(eventColumns)
      .from(agendaEvents)
      .where(sql`not (${notFinished})`)
      .orderBy(desc(agendaEvents.date), desc(agendaEvents.startTime))
      .limit(10),
  ]);
  const ids = [...upcoming, ...past].map((r) => r.id);
  const people = ids.length
    ? await db
        .select({ eventId: agendaRegistrations.eventId, name: user.name, email: user.email })
        .from(agendaRegistrations)
        .innerJoin(user, eq(user.id, agendaRegistrations.userId))
        .where(inArray(agendaRegistrations.eventId, ids))
        .orderBy(asc(agendaRegistrations.createdAt))
    : [];
  const byEvent = new Map<string, Array<{ name: string; email: string }>>();
  for (const p of people) {
    const list = byEvent.get(p.eventId) ?? [];
    list.push({ name: p.name, email: p.email });
    byEvent.set(p.eventId, list);
  }
  const full = (r: EventRow): AdminAgendaEvent => ({
    ...toView(r, false),
    startTime: r.startTime.slice(0, 5),
    endTime: r.endTime.slice(0, 5),
    participants: byEvent.get(r.id) ?? [],
  });
  return { upcoming: upcoming.map(full), past: past.map(full) };
}

/** Jadwal yang sudah lewat tanggalnya tidak boleh dibuat atau dipindah ke masa lalu. */
export async function isPastSlot(date: string, startTime: string) {
  const { rows } = await db.execute<{ past: boolean }>(
    sql`select (${date}::date < ${todayJakarta} or (${date}::date = ${todayJakarta} and ${startTime}::time <= ${nowTimeJakarta})) as past`,
  );
  return rows[0].past;
}
