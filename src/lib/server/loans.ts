import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookCopies, books, loans } from "@/db/schema";
import { formatDay } from "@/lib/dates";
import { LIBRARY_TZ } from "@/lib/server/members";
import { notify } from "@/lib/server/notifications";
import { visitSchedule } from "@/lib/server/slots";

/** Tanggal hari ini menurut kalender perpustakaan, sebagai ekspresi SQL. */
const libraryDate = sql`(now() at time zone ${LIBRARY_TZ})::date`;

/**
 * Pinjaman yang memegang eksemplar: sudah diambil (active), atau dibooking (reserved) dan hari ambilnya belum lewat.
 * Booking yang tidak diambil sampai akhir hari jadwalnya tidak lagi memegang eksemplar.
 */
export const holdsCopy = sql`(${loans.status} = 'active' or (${loans.status} = 'reserved' and ${loans.startOn} >= ${libraryDate}))`;

/**
 * Batalkan booking yang tidak diambil sampai akhir hari jadwalnya, supaya eksemplarnya terbuka lagi untuk anggota lain.
 * Belum ada penjadwal, jadi dipanggil setiap kali peminjaman dibaca atau dibuat; murah karena hanya menyentuh
 * booking yang sudah lewat. Mengembalikan jumlah booking yang dibatalkan.
 */
export async function expireMissedPickups(): Promise<number> {
  return db.transaction(async (tx) => {
    const expired = await tx
      .update(loans)
      .set({ status: "cancelled" })
      .where(and(eq(loans.status, "reserved"), sql`${loans.startOn} < ${libraryDate}`))
      .returning({ userId: loans.userId, copyId: loans.copyId, startOn: loans.startOn });
    if (expired.length === 0) return 0;
    // Setiap baris hanya dikembalikan sekali (dikunci oleh UPDATE), jadi notifikasinya tidak ganda.
    const titles = await tx
      .select({ copyId: bookCopies.id, title: books.title, slug: books.slug })
      .from(bookCopies)
      .innerJoin(books, eq(books.id, bookCopies.bookId))
      .where(inArray(bookCopies.id, expired.map((e) => e.copyId)));
    const byCopy = new Map(titles.map((t) => [t.copyId, t]));
    await notify(
      expired.map((e) => {
        const book = byCopy.get(e.copyId);
        return {
          userId: e.userId,
          kind: "peminjaman" as const,
          title: "Booking dibatalkan",
          body: `“${book?.title ?? "Buku"}” tidak diambil pada ${formatDay(Date.parse(e.startOn))}, jadi booking-nya batal otomatis dan buku terbuka untuk anggota lain.`,
          href: book ? `/buku/${book.slug}` : undefined,
        };
      }),
      tx,
    );
    return expired.length;
  });
}

export type MyLoanSummary = { title: string; slug: string; dueOn: string };

/** Pinjaman aktif anggota, yang paling dekat jatuh tempo lebih dulu. */
export async function getMyActiveLoans(userId: string): Promise<MyLoanSummary[]> {
  return db
    .select({ title: books.title, slug: books.slug, dueOn: loans.dueOn })
    .from(loans)
    .innerJoin(bookCopies, eq(bookCopies.id, loans.copyId))
    .innerJoin(books, eq(books.id, bookCopies.bookId))
    .where(and(eq(loans.userId, userId), eq(loans.status, "active")))
    .orderBy(asc(loans.dueOn));
}

/** Jendela ambil buku: hari ini (bila masih ada slot jam) sampai 7 hari ke depan, menurut kalender perpustakaan. */
export const PICKUP_WINDOW_DAYS = 7;

export const pickupSchedule = () => visitSchedule(PICKUP_WINDOW_DAYS);

/** Pinjaman atau pesanan anggota yang masih berjalan untuk satu buku, bila ada. */
export async function getMyBookLoan(userId: string, slug: string) {
  await expireMissedPickups();
  const [row] = await db
    .select({ status: loans.status, startOn: loans.startOn, dueOn: loans.dueOn, pickupHour: loans.pickupHour })
    .from(loans)
    .innerJoin(bookCopies, eq(bookCopies.id, loans.copyId))
    .innerJoin(books, eq(books.id, bookCopies.bookId))
    .where(and(eq(loans.userId, userId), eq(books.slug, slug), inArray(loans.status, ["active", "reserved"])))
    .limit(1);
  return row as { status: "active" | "reserved"; startOn: string; dueOn: string; pickupHour: number | null } | undefined;
}
