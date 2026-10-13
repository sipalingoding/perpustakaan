import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/db";
import { bookCopies, books, loans } from "@/db/schema";
import { titleOnly, type Book, type Category } from "@/lib/books";
import { formatShort } from "@/lib/dates";
import { holdsCopy } from "@/lib/server/loans";
import { fileUrl } from "@/lib/server/storage";

/** Buku sebagaimana dilihat tamu: stok dihitung dari pinjaman yang sedang memegang eksemplar. */
type PublicBook = {
  id: string;
  nextDue: string | null;
  /** Eksemplar yang sudah diambil anggota (status active); sisanya yang dipegang hanya dibooking. */
  borrowed: number;
  book: Omit<Book, "status" | "due">;
};

const NO_EXCERPT = titleOnly("Cuplikan buku ini belum tersedia di Lembar. Kamu tetap bisa meminjamnya.");

/** 2026-10-12 -> "12 Okt" */
const shortDate = (isoDate: string) => formatShort(Date.parse(isoDate));

/**
 * Seluruh katalog dengan stok dan rating. Sama untuk semua pengunjung, jadi di-cache; tag "catalog"
 * dihapus setiap kali ada pinjaman, pengembalian (beserta ulasannya), atau buku baru.
 */
async function loadCatalog(): Promise<PublicBook[]> {
  "use cache";
  cacheTag("catalog");
  cacheLife("minutes");

  const rows = await db
    .select({
      book: books,
      total: sql<number>`count(${bookCopies.id})::int`,
      held: sql<number>`count(${loans.id})::int`,
      borrowed: sql<number>`count(${loans.id}) filter (where ${loans.status} = 'active')::int`,
      nextDue: sql<string | null>`min(${loans.dueOn})`,
      // Pinjaman yang benar-benar diambil (sedang dipinjam atau sudah kembali); booking yang batal tidak dihitung.
      timesBorrowed: sql<number>`(select count(*)::int from loans l join book_copies c on c.id = l.copy_id
        where c.book_id = books.id and l.status in ('active', 'returned'))`,
      ratingAvg: sql<number>`(select coalesce(round(avg(r.rating), 1), 0)::float from book_reviews r where r.book_id = books.id)`,
      ratingCount: sql<number>`(select count(*)::int from book_reviews r where r.book_id = books.id)`,
    })
    .from(books)
    .leftJoin(bookCopies, eq(bookCopies.bookId, books.id))
    .leftJoin(loans, and(eq(loans.copyId, bookCopies.id), holdsCopy))
    .groupBy(books.id)
    .orderBy(asc(books.position), asc(books.title));

  return rows.map(({ book: b, total, held, borrowed, nextDue, timesBorrowed, ratingAvg, ratingCount }) => ({
    id: b.id,
    nextDue,
    borrowed,
    book: {
      slug: b.slug,
      timesBorrowed,
      rating: { avg: ratingAvg, count: ratingCount },
      title: b.title,
      author: b.author,
      category: b.category as Category,
      form: b.form,
      cover: { bg: b.coverBg, ink: b.coverInk },
      motif: b.motif,
      tags: b.tags,
      synopsis: b.synopsis,
      pages: b.pages,
      year: b.year,
      shelf: b.shelf,
      copies: { total, available: total - held },
      // Buku tanpa cuplikan (mis. ditambahkan lewat SQL) tetap bisa dibuka: pembaca butuh minimal satu halaman.
      spreads: b.spreads.length > 0 ? b.spreads : NO_EXCERPT,
      isbn: b.isbn,
      publisher: b.publisher,
      language: b.language,
      coverImage: b.coverKey ? fileUrl(b.coverKey) : null,
    },
  }));
}

type MyLoan = { status: "active" | "reserved"; dueOn: string; startOn: string };

/** Buku yang sedang dipinjam atau dibooking anggota ini (id buku -> pinjamannya). Tidak di-cache: per anggota. */
async function loadMyLoans(userId: string) {
  const rows = await db
    .select({ bookId: bookCopies.bookId, status: loans.status, dueOn: loans.dueOn, startOn: loans.startOn })
    .from(loans)
    .innerJoin(bookCopies, eq(bookCopies.id, loans.copyId))
    .where(and(eq(loans.userId, userId), holdsCopy));
  return new Map(rows.map((r) => [r.bookId, r as MyLoan]));
}

function toBook({ book, nextDue, borrowed }: PublicBook, mine?: MyLoan): Book {
  if (mine?.status === "active") return { ...book, status: "saya", due: shortDate(mine.dueOn) };
  // `due` untuk booking milik sendiri = tanggal ambil.
  if (mine?.status === "reserved")
    return { ...book, status: "terbooking", bookedByMe: true, due: shortDate(mine.startOn) };
  if (book.copies.available > 0) return { ...book, status: "tersedia" };
  // Semua eksemplar dipegang, tapi belum ada yang diambil: masih dibooking.
  if (borrowed === 0) return { ...book, status: "terbooking" };
  return { ...book, status: "dipinjam", due: nextDue ? shortDate(nextDue) : undefined };
}

// Katalog tidak membatalkan booking basi (bagian ini juga dipakai saat prarender, yang tidak boleh menulis);
// `holdsCopy` sudah tidak menghitung booking yang lewat harinya, jadi ketersediaannya tetap benar.

/** Seluruh katalog. Berikan userId agar buku yang sedang dipinjam anggota itu ditandai "saya". */
export async function getBooks(userId?: string): Promise<Book[]> {
  const [catalog, dues] = await Promise.all([loadCatalog(), userId ? loadMyLoans(userId) : undefined]);
  return catalog.map((entry) => toBook(entry, dues?.get(entry.id)));
}

export async function getBook(slug: string, userId?: string): Promise<Book | undefined> {
  const [catalog, dues] = await Promise.all([loadCatalog(), userId ? loadMyLoans(userId) : undefined]);
  const entry = catalog.find((b) => b.book.slug === slug);
  return entry ? toBook(entry, dues?.get(entry.id)) : undefined;
}

export async function getBookSlugs(): Promise<string[]> {
  return (await loadCatalog()).map((b) => b.book.slug);
}
