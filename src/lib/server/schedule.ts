import "server-only";
import { and, asc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookCopies, bookReviews, books, loans } from "@/db/schema";
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
};

export type ScheduleData = {
  today: number;
  /** Tiga bulan yang bisa dibuka: sebelumnya, sekarang, berikutnya. */
  months: Array<[number, number]>;
  loans: ScheduleLoan[];
  remind: boolean;
};

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

  const [rows, profile] = await Promise.all([
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
      myReview: r.reviewRating !== null ? { rating: r.reviewRating, body: r.reviewBody ?? "" } : null,
    })),
    remind: profile?.notifications.due ?? true,
  };
}
