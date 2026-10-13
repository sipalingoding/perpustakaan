import "server-only";
import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { books, donations, user } from "@/db/schema";
import { LIBRARY_TZ } from "@/lib/server/members";

export type DonationStatus = "diajukan" | "dikirim" | "diterima" | "ditolak";

export type AdminDonation = {
  id: string;
  code: string;
  title: string;
  author: string;
  category: string;
  condition: "baru" | "sangat" | "baik";
  qty: number;
  note: string;
  method: "antar" | "jemput";
  address: string | null;
  /** Tanggal antar/jemput yang dipilih penyumbang, "YYYY-MM-DD". */
  scheduledOn: string;
  /** Jam antar/jemput; null untuk sumbangan lama sebelum ada pilihan jam. */
  scheduledHour: number | null;
  status: DonationStatus;
  donorName: string;
  donorEmail: string;
  /** Tanggal formulir dikirim, "YYYY-MM-DD" menurut kalender perpustakaan. */
  createdOn: string;
  /** Buku di koleksi yang dibuat/ditambah dari sumbangan ini, bila sudah diterima. */
  book: { id: string; slug: string; title: string } | null;
};

/** Semua sumbangan untuk pustakawan, yang perlu ditindaklanjuti lebih dulu. */
export async function getAdminDonations(): Promise<AdminDonation[]> {
  const rows = await db
    .select({
      id: donations.id,
      code: donations.code,
      title: donations.title,
      author: donations.author,
      category: donations.category,
      condition: donations.condition,
      qty: donations.qty,
      note: donations.note,
      method: donations.method,
      address: donations.address,
      scheduledOn: donations.scheduledOn,
      scheduledHour: donations.scheduledHour,
      status: donations.status,
      donorName: user.name,
      donorEmail: user.email,
      bookId: books.id,
      bookSlug: books.slug,
      bookTitle: books.title,
      createdOn: sql<string>`to_char((${donations.createdAt} at time zone ${LIBRARY_TZ})::date, 'YYYY-MM-DD')`,
    })
    .from(donations)
    .innerJoin(user, eq(user.id, donations.userId))
    .leftJoin(books, eq(books.id, donations.bookId))
    .orderBy(
      sql`case ${donations.status} when 'diajukan' then 0 when 'dikirim' then 1 when 'diterima' then 2 else 3 end`,
      donations.scheduledOn,
      donations.scheduledHour,
      desc(donations.createdAt),
    );
  return rows.map(({ bookId, bookSlug, bookTitle, ...r }) => ({
    ...r,
    book: bookId && bookSlug && bookTitle ? { id: bookId, slug: bookSlug, title: bookTitle } : null,
  }));
}

/** Jumlah sumbangan yang menunggu tindakan pustakawan (untuk lencana di navigasi admin). */
export async function countDonationsToReview(): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(donations)
    .where(sql`${donations.status} in ('diajukan', 'dikirim')`);
  return row.n;
}
