import "server-only";
import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookCopies, books } from "@/db/schema";
import type { Category, Motif } from "@/lib/books";
import { LIBRARY_TZ } from "@/lib/server/members";
import { fileUrl } from "@/lib/server/storage";

export type AdminBookRow = {
  id: string;
  slug: string;
  title: string;
  author: string;
  category: Category;
  shelf: string;
  coverBg: string;
  coverInk: string;
  coverImage: string | null;
  copies: number;
  /** Eksemplar yang sedang dipesan atau dibawa anggota. */
  out: number;
  /** Pernah dipinjam: riwayatnya disimpan, jadi bukunya tidak bisa dihapus. */
  everLoaned: boolean;
};

/** Semua buku untuk dasbor pustakawan, dengan jumlah eksemplar dan yang sedang di luar rak. */
export async function getAdminBooks(): Promise<AdminBookRow[]> {
  const rows = await db
    .select({
      id: books.id,
      slug: books.slug,
      title: books.title,
      author: books.author,
      category: books.category,
      shelf: books.shelf,
      coverBg: books.coverBg,
      coverInk: books.coverInk,
      coverKey: books.coverKey,
      copies: sql<number>`(select count(*)::int from book_copies c where c.book_id = books.id)`,
      out: sql<number>`(select count(*)::int from loans l join book_copies c on c.id = l.copy_id
        where c.book_id = books.id and (l.status = 'active'
          or (l.status = 'reserved' and l.start_on >= (now() at time zone ${LIBRARY_TZ})::date)))`,
      everLoaned: sql<boolean>`exists (select 1 from loans l join book_copies c on c.id = l.copy_id where c.book_id = books.id)`,
    })
    .from(books)
    .orderBy(asc(books.position), asc(books.title));
  return rows.map(({ coverKey, ...r }) => ({
    ...r,
    category: r.category as Category,
    coverImage: coverKey ? fileUrl(coverKey) : null,
  }));
}

export type BookFormValues = {
  id?: string;
  slug?: string;
  title: string;
  author: string;
  category: Category;
  form: string;
  year: string;
  pages: string;
  shelf: string;
  isbn: string;
  publisher: string;
  language: string;
  tags: string;
  synopsis: string;
  copies: string;
  coverBg: string;
  coverInk: string;
  motif: Motif;
  coverImage: string | null;
  /** Batas bawah jumlah eksemplar: yang pernah dipinjam tidak bisa dihapus. */
  minCopies: number;
};

export const EMPTY_BOOK: BookFormValues = {
  title: "",
  author: "",
  category: "Fiksi",
  form: "Novel",
  year: "",
  pages: "",
  shelf: "",
  isbn: "",
  publisher: "",
  language: "Indonesia",
  tags: "",
  synopsis: "",
  copies: "1",
  coverBg: "#4F6F66",
  coverInk: "#F3F1E7",
  motif: "leaf",
  coverImage: null,
  minCopies: 1,
};

export async function getAdminBook(id: string): Promise<BookFormValues | undefined> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return undefined;
  const [b] = await db.select().from(books).where(eq(books.id, id));
  if (!b) return undefined;
  const [{ copies, used }] = await db
    .select({
      copies: sql<number>`count(*)::int`,
      used: sql<number>`count(*) filter (where exists (select 1 from loans l where l.copy_id = book_copies.id))::int`,
    })
    .from(bookCopies)
    .where(eq(bookCopies.bookId, id));
  return {
    id: b.id,
    slug: b.slug,
    title: b.title,
    author: b.author,
    category: b.category as Category,
    form: b.form,
    year: b.year === null ? "" : String(b.year),
    pages: b.pages === null ? "" : String(b.pages),
    shelf: b.shelf,
    isbn: b.isbn ?? "",
    publisher: b.publisher,
    language: b.language,
    tags: b.tags,
    synopsis: b.synopsis,
    copies: String(copies),
    coverBg: b.coverBg,
    coverInk: b.coverInk,
    motif: b.motif,
    coverImage: b.coverKey ? fileUrl(b.coverKey) : null,
    minCopies: Math.max(used, 1),
  };
}
