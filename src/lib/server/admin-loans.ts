import "server-only";
import { and, eq, inArray, isNotNull, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookCopies, books, loans, profiles, user } from "@/db/schema";
import { expireMissedPickups } from "@/lib/server/loans";
import { LIBRARY_TZ } from "@/lib/server/members";

export type AdminLoan = {
  id: string;
  status: "reserved" | "active";
  title: string;
  slug: string;
  copyCode: string;
  memberName: string;
  memberEmail: string;
  /** Nomor HP dari profil anggota; null bila belum diisi. */
  memberPhone: string | null;
  /** Tanggal ambil (terbooking) atau tanggal diambil (dipinjam), "YYYY-MM-DD". */
  startOn: string;
  pickupHour: number | null;
  dueOn: string;
  /** Lama pinjam yang dipilih anggota, dalam hari. */
  days: number;
  /** Terbooking untuk hari ini dan jam ambilnya sudah lewat (anggota belum datang). Batal otomatis setelah hari ini. */
  missedPickup: boolean;
  /** Dipinjam dan sudah lewat jatuh tempo. */
  overdue: boolean;
  /** Anggota sudah mengajukan pengembalian ("YYYY-MM-DD" menurut waktu Jakarta); menunggu pustakawan menerima buku. */
  returnRequestedOn: string | null;
};

/** Pinjaman yang sedang berjalan: terbooking (menunggu diambil) lebih dulu, lalu yang dipinjam. */
export async function getAdminLoans(): Promise<AdminLoan[]> {
  await expireMissedPickups();
  const today = sql`(now() at time zone ${LIBRARY_TZ})::date`;
  const rows = await db
    .select({
      id: loans.id,
      status: loans.status,
      title: books.title,
      slug: books.slug,
      copyCode: bookCopies.code,
      memberName: user.name,
      memberEmail: user.email,
      memberPhone: profiles.phone,
      startOn: loans.startOn,
      pickupHour: loans.pickupHour,
      dueOn: loans.dueOn,
      days: sql<number>`(${loans.dueOn} - ${loans.startOn})::int`,
      missedPickup: sql<boolean>`${loans.status} = 'reserved' and ${loans.startOn} = ${today}
        and ${loans.pickupHour} is not null
        and extract(hour from now() at time zone ${LIBRARY_TZ}) >= ${loans.pickupHour} + 1`,
      overdue: sql<boolean>`${loans.status} = 'active' and ${loans.dueOn} < ${today}`,
      returnRequestedOn: sql<
        string | null
      >`to_char((${loans.returnRequestedAt} at time zone ${LIBRARY_TZ})::date, 'YYYY-MM-DD')`,
    })
    .from(loans)
    .innerJoin(bookCopies, eq(bookCopies.id, loans.copyId))
    .innerJoin(books, eq(books.id, bookCopies.bookId))
    .innerJoin(user, eq(user.id, loans.userId))
    .leftJoin(profiles, eq(profiles.userId, loans.userId))
    .where(inArray(loans.status, ["reserved", "active"]))
    // Yang menunggu tindakan di atas: pengembalian yang diajukan, lalu booking, lalu yang sedang dipinjam.
    .orderBy(
      sql`case when ${loans.returnRequestedAt} is not null then 0 when ${loans.status} = 'reserved' then 1 else 2 end`,
      loans.returnRequestedAt,
      loans.startOn,
      loans.pickupHour,
    );
  return rows as AdminLoan[];
}

/** Booking yang menunggu diambil dan pengembalian yang menunggu diterima (untuk lencana di navigasi admin). */
export async function countPickupsWaiting(): Promise<number> {
  await expireMissedPickups();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(loans)
    .where(or(eq(loans.status, "reserved"), and(eq(loans.status, "active"), isNotNull(loans.returnRequestedAt))));
  return row.n;
}
