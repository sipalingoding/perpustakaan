import "server-only";
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { agendaEvents, agendaRegistrations, bookCopies, bookReviews, books, loans } from "@/db/schema";
import { AGENDA } from "@/lib/agenda";
import { expireMissedPickups } from "@/lib/server/loans";
import { fileUrl } from "@/lib/server/storage";
import { getProfile, libraryToday } from "@/lib/server/members";

export type ScheduleLoan = {
  id: string;
  title: string;
  author: string;
  slug: string;
  /** Warna sampul, dipakai untuk jalur di kalender. */
  color: string;
  /** Gambar sampul asli; kosong bila buku memakai sampul ilustrasi. */
  cover: string | null;
  status: "active" | "reserved" | "returned";
  /** Tanggal ambil dan batas kembali, ms UTC. */
  start: number;
  due: number;
  /** Jam kedatangan untuk mengambil buku yang dibooking; null untuk pinjaman lama. */
  pickupHour: number | null;
  /** Ulasan anggota ini untuk bukunya (dari pinjaman sebelumnya), untuk diisi ulang di popup pengembalian. */
  myReview: { rating: number; body: string } | null;
  /** Pengembalian sudah diajukan; menunggu pustakawan menerima bukunya. */
  returnRequested: boolean;
  /** Sudah pernah diperpanjang (perpanjangan hanya sekali). */
  extended: boolean;
};

/** Agenda yang diikuti anggota, ditandai di kalender. */
export type ScheduleEvent = {
  id: string;
  name: string;
  /** Tanggal acara, ms UTC. */
  date: number;
  /** "13.00" */
  start: string;
  end: string;
  place: string;
  /** Warna identitas agenda. */
  color: string;
  ink: string;
};

export type ScheduleData = {
  today: number;
  /** Tiga bulan yang bisa dibuka: sebelumnya, sekarang, berikutnya. */
  months: Array<[number, number]>;
  loans: ScheduleLoan[];
  events: ScheduleEvent[];
  remind: boolean;
};

const hhmm = (t: string) => t.slice(0, 5).replace(":", ".");

const pad = (n: number) => String(n).padStart(2, "0");

export async function getSchedule(userId: string): Promise<ScheduleData> {
  await expireMissedPickups();
  const today = await libraryToday();
  const [y, m] = today.split("-").map(Number);
  const at = (delta: number): [number, number] => {
    const i = y * 12 + (m - 1) + delta;
    return [Math.floor(i / 12), (i % 12) + 1];
  };
  const months = [at(-1), at(0), at(1)];
  const windowStart = `${months[0][0]}-${pad(months[0][1])}-01`;
  const windowEnd = new Date(Date.UTC(months[2][0], months[2][1], 0)).toISOString().slice(0, 10);

  const [rows, profile, joined] = await Promise.all([
    db
      .select({
        id: loans.id,
        title: books.title,
        author: books.author,
        slug: books.slug,
        color: books.coverBg,
        coverKey: books.coverKey,
        status: loans.status,
        startOn: loans.startOn,
        dueOn: loans.dueOn,
        pickupHour: loans.pickupHour,
        returnedOn: loans.returnedOn,
        returnRequested: sql<boolean>`${loans.returnRequestedAt} is not null`,
        extensions: loans.extensions,
        reviewRating: bookReviews.rating,
        reviewBody: bookReviews.body,
      })
      .from(loans)
      .innerJoin(bookCopies, eq(bookCopies.id, loans.copyId))
      .innerJoin(books, eq(books.id, bookCopies.bookId))
      .leftJoin(bookReviews, and(eq(bookReviews.bookId, books.id), eq(bookReviews.userId, userId)))
      .where(
        and(
          eq(loans.userId, userId),
          or(
            inArray(loans.status, ["active", "reserved"]),
            and(
              eq(loans.status, "returned"),
              sql`${loans.startOn} <= ${windowEnd}::date`,
              sql`${loans.dueOn} >= ${windowStart}::date`,
            ),
          ),
        ),
      )
      .orderBy(asc(loans.startOn)),
    getProfile(userId),
    db
      .select({
        id: agendaEvents.id,
        kind: agendaEvents.kind,
        date: agendaEvents.date,
        startTime: agendaEvents.startTime,
        endTime: agendaEvents.endTime,
        place: agendaEvents.place,
      })
      .from(agendaRegistrations)
      .innerJoin(agendaEvents, eq(agendaEvents.id, agendaRegistrations.eventId))
      .where(
        and(
          eq(agendaRegistrations.userId, userId),
          sql`${agendaEvents.date} between ${windowStart}::date and ${windowEnd}::date`,
        ),
      )
      .orderBy(asc(agendaEvents.date), asc(agendaEvents.startTime)),
  ]);

  return {
    today: Date.parse(today),
    months,
    loans: rows.map((r) => ({
      id: r.id,
      title: r.title,
      author: r.author,
      slug: r.slug,
      color: r.color,
      cover: r.coverKey ? fileUrl(r.coverKey) : null,
      status: r.status as ScheduleLoan["status"],
      start: Date.parse(r.startOn),
      // Buku yang sudah kembali: jalurnya berakhir di hari pengembalian, bukan di batas kembali.
      due: Date.parse(r.status === "returned" && r.returnedOn ? r.returnedOn : r.dueOn),
      pickupHour: r.pickupHour,
      returnRequested: r.returnRequested,
      extended: r.extensions > 0,
      myReview: r.reviewRating !== null ? { rating: r.reviewRating, body: r.reviewBody ?? "" } : null,
    })),
    events: joined.map((e) => ({
      id: e.id,
      name: AGENDA[e.kind].name,
      date: Date.parse(e.date),
      start: hhmm(e.startTime),
      end: hhmm(e.endTime),
      place: e.place,
      color: AGENDA[e.kind].tone.bg,
      ink: AGENDA[e.kind].tone.ink,
    })),
    remind: profile?.notifications.due ?? true,
  };
}
