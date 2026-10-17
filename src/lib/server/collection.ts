import "server-only";
import { and, eq, like, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookCopies, books, categories, donations } from "@/db/schema";
import { FALLBACK_COVER, titleOnly } from "@/lib/books";
import { downloadCover, openLibraryDescription } from "@/lib/server/book-sources";
import { processCover } from "@/lib/server/covers";
import { notify, notifyNewBook } from "@/lib/server/notifications";
import { deleteFile, newFileKey, putFile } from "@/lib/server/storage";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** "Laskar Pelangi: Edisi Baru" -> "laskar-pelangi-edisi-baru" */
export function slugify(title: string) {
  return (
    title
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60)
      .replace(/-+$/, "") || "buku"
  );
}

/** Slug yang belum dipakai buku lain: "judul", lalu "judul-2", "judul-3", … */
export async function uniqueSlug(tx: Tx, title: string) {
  const base = slugify(title);
  const taken = new Set(
    (await tx.select({ slug: books.slug }).from(books).where(like(books.slug, `${base}%`))).map((r) => r.slug),
  );
  let slug = base;
  for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
  return slug;
}

/** Tambah `count` eksemplar dengan kode `<rak>-<nomor>` yang belum terpakai. */
export async function addCopies(tx: Tx, bookId: string, shelf: string, count: number) {
  if (count <= 0) return;
  const used = new Set(
    (await tx.select({ code: bookCopies.code }).from(bookCopies).where(like(bookCopies.code, `${shelf}-%`))).map((r) => r.code),
  );
  const codes: string[] = [];
  for (let n = 1; codes.length < count; n++) if (!used.has(`${shelf}-${n}`)) codes.push(`${shelf}-${n}`);
  await tx.insert(bookCopies).values(codes.map((code) => ({ bookId, code })));
}

/** Rak sementara untuk buku sumbangan yang belum ditata pustakawan. */
export const DONATION_SHELF = "SB";


export class DonationStateError extends Error {}

export type AcceptedDonation = { bookId: string; slug: string; title: string; created: boolean; copies: number };

/**
 * Tandai sumbangan "diterima" dan masukkan bukunya ke koleksi, dalam satu transaksi:
 * - buku yang sama sudah ada (ISBN sama, atau judul dan penulis sama) -> tambah eksemplarnya;
 * - belum ada -> buat buku baru di rak sementara "SB" dengan data dari formulir dan katalog publik.
 * Hanya berlaku dari status "dikirim"; bila statusnya sudah berubah, tidak ada yang diubah (DonationStateError).
 */
export async function acceptDonation(donationId: string): Promise<AcceptedDonation> {
  const [d] = await db.select().from(donations).where(eq(donations.id, donationId));
  if (!d || d.status !== "dikirim") throw new DonationStateError();

  const match = await findSameBook(d.isbn, d.title, d.author);

  // Sampul dan sinopsis diambil di luar transaksi (jaringan lambat tidak boleh menahan kunci database).
  // Gagal mengambil keduanya tidak menggagalkan penerimaan: buku tetap masuk dengan sampul ilustrasi.
  let coverKey: string | null = null;
  // Warna sampul ilustrasi dari kategorinya (sama dengan pratinjau di formulir sumbangan).
  const [tone] = await db
    .select({ bg: categories.coverBg, ink: categories.coverInk })
    .from(categories)
    .where(eq(categories.name, d.category));
  let colors: [string, string] = tone ? [tone.bg, tone.ink] : [FALLBACK_COVER.bg, FALLBACK_COVER.ink];
  let synopsis = "";
  const bookId = match?.id ?? crypto.randomUUID();
  if (!match) {
    if (d.coverUrl) {
      try {
        const cover = await processCover(await downloadCover(d.coverUrl));
        coverKey = newFileKey("covers", bookId);
        await putFile(coverKey, cover.data, cover.mime);
        colors = [cover.bg, cover.ink];
      } catch (e) {
        console.warn(`[sumbangan] Sampul ${d.code} tidak bisa diambil:`, e instanceof Error ? e.message : e);
        coverKey = null;
      }
    }
    if (d.sourceRef) synopsis = (await openLibraryDescription(d.sourceRef).catch(() => "")).slice(0, 2000);
  }

  try {
    return await db.transaction(async (tx) => {
      const [moved] = await tx
        .update(donations)
        .set({ status: "diterima" })
        .where(and(eq(donations.id, d.id), eq(donations.status, "dikirim")))
        .returning({ id: donations.id });
      if (!moved) throw new DonationStateError();

      const thanks = (slug: string) =>
        notify(
          {
            userId: d.userId,
            kind: "sumbangan",
            title: "Sumbangan diterima",
            body: `“${d.title}” (${d.code}) sudah diterima dan masuk koleksi Lembar. Terima kasih sudah menyumbang!`,
            href: `/buku/${slug}`,
          },
          tx,
        );

      if (match) {
        await addCopies(tx, match.id, match.shelf, d.qty);
        await tx.update(donations).set({ bookId: match.id }).where(eq(donations.id, d.id));
        await thanks(match.slug);
        return { bookId: match.id, slug: match.slug, title: match.title, created: false, copies: d.qty };
      }

      const slug = await uniqueSlug(tx, d.title);
      const [{ next }] = await tx.select({ next: sql<number>`coalesce(max(${books.position}), -1)::int + 1` }).from(books);
      await tx.insert(books).values({
        id: bookId,
        slug,
        title: d.title,
        author: d.author,
        category: d.category,
        form: "Buku",
        coverBg: colors[0],
        coverInk: colors[1],
        coverKey,
        pages: d.pages,
        year: d.year,
        shelf: DONATION_SHELF,
        isbn: d.isbn,
        publisher: d.publisher ?? "",
        language: d.language ?? "Indonesia",
        synopsis,
        position: next,
        spreads: titleOnly("Cuplikan buku ini belum tersedia di Lembar. Kamu tetap bisa meminjamnya."),
      });
      await addCopies(tx, bookId, DONATION_SHELF, d.qty);
      // Ditautkan setelah bukunya ada (relasi ke books).
      await tx.update(donations).set({ bookId }).where(eq(donations.id, d.id));
      await thanks(slug);
      // Sumbangan yang jadi judul baru juga kabar buku baru bagi penggemar kategorinya.
      await notifyNewBook({ title: d.title, author: d.author, category: d.category, slug }, tx);
      return { bookId, slug, title: d.title, created: true, copies: d.qty };
    });
  } catch (e) {
    await deleteFile(coverKey);
    throw e;
  }
}

/** Buku yang sama di koleksi: ISBN sama bila ada, kalau tidak judul dan penulis sama (tanpa membedakan huruf besar). */
async function findSameBook(isbn: string | null, title: string, author: string) {
  const pick = { id: books.id, slug: books.slug, title: books.title, shelf: books.shelf };
  if (isbn) {
    const [byIsbn] = await db.select(pick).from(books).where(eq(books.isbn, isbn));
    if (byIsbn) return byIsbn;
  }
  const [byName] = await db
    .select(pick)
    .from(books)
    .where(and(sql`lower(trim(${books.title})) = lower(trim(${title}))`, sql`lower(trim(${books.author})) = lower(trim(${author}))`));
  return byName ?? null;
}
