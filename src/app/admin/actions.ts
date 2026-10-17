"use server";

import { and, desc, eq, inArray, isNotNull, notExists, sql } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { bookCopies, books, categories, donations, libraryStatus, loans } from "@/db/schema";
import { formatDay } from "@/lib/dates";
import { fineFor, overdueDays, rupiah } from "@/lib/fine";
import { formatHour } from "@/lib/library";
import { LIBRARY_TZ } from "@/lib/server/members";
import { notify, notifyNewBook } from "@/lib/server/notifications";
import { titleOnly } from "@/lib/books";
import {
  downloadCover,
  normalizeIsbn,
  openLibraryDescription,
  searchForForm,
  type SearchResponse,
} from "@/lib/server/book-sources";
import {
  acceptDonation,
  addCopies,
  DonationStateError,
  uniqueSlug,
  type AcceptedDonation,
  type Tx,
} from "@/lib/server/collection";
import { processCover, type ProcessedCover } from "@/lib/server/covers";
import { deleteFile, fileUrl, newFileKey, putFile } from "@/lib/server/storage";
import { getRole, getViewer } from "@/lib/server/session";

type Fail = { ok: false; error: string; fields?: Record<string, string> };

const NOT_ALLOWED: Fail = {
  ok: false,
  error: "Hanya pustakawan yang bisa mengelola koleksi. Masuk lagi dengan akun pustakawan.",
};

async function isLibrarian() {
  return !!(await getViewer()) && (await getRole()) === "pustakawan";
}

/* ---------------------------------------------------------------- */
/* Pencarian di katalog publik                                       */
/* ---------------------------------------------------------------- */

export async function searchPublicBooks(query: string): Promise<SearchResponse> {
  if (!(await isLibrarian())) return NOT_ALLOWED;
  return searchForForm(query);
}

export async function getSourceSynopsis(workKey: string): Promise<string> {
  if (!(await isLibrarian())) return "";
  try {
    return (await openLibraryDescription(workKey)).slice(0, 2000);
  } catch {
    return "";
  }
}

/* ---------------------------------------------------------------- */
/* Simpan buku                                                       */
/* ---------------------------------------------------------------- */

const HEX = /^#[0-9a-fA-F]{6}$/;

/** Isian angka bulat dari teks, boleh kosong (= belum diketahui, disimpan null). */
const optionalWholeNumber = <T extends z.ZodType<number, number>>(label: string, range: T) =>
  z
    .string()
    .trim()
    .regex(/^\d*$/, `${label} berupa angka.`)
    .transform((v) => (v === "" ? null : Number(v)))
    .pipe(range.nullable());

const bookInput = z.object({
  id: z.uuid().optional(),
  title: z.string().trim().min(1, "Judul wajib diisi.").max(160, "Judul terlalu panjang."),
  author: z.string().trim().min(1, "Penulis wajib diisi.").max(160, "Nama penulis terlalu panjang."),
  category: z.string({ error: "Pilih kategori." }).min(1, "Pilih kategori."),
  form: z.string().trim().min(1, "Isi bentuk buku, misalnya Novel.").max(40),
  year: optionalWholeNumber(
    "Tahun terbit",
    z
      .number()
      .min(1000, "Tahun terbit tidak masuk akal.")
      .refine((y) => y <= new Date().getFullYear() + 1, "Tahun terbit belum terjadi."),
  ),
  pages: optionalWholeNumber(
    "Jumlah halaman",
    z.number().min(1, "Minimal 1 halaman.").max(10000, "Terlalu banyak halaman."),
  ),
  shelf: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{1,4}(-[A-Z0-9]{1,4}){0,2}$/, "Kode rak seperti F-03 atau SJ-12."),
  isbn: z
    .string()
    .trim()
    .transform((v, ctx) => {
      if (!v) return null;
      const isbn = normalizeIsbn(v);
      if (!isbn)
        ctx.addIssue({
          code: "custom",
          message: "ISBN berisi 10 atau 13 angka.",
        });
      return isbn;
    }),
  publisher: z.string().trim().max(120, "Nama penerbit terlalu panjang."),
  language: z.string().trim().min(1, "Isi bahasa buku.").max(40),
  tags: z.string().trim().max(200, "Kata kunci terlalu panjang."),
  synopsis: z.string().trim().max(2000, "Sinopsis maksimal 2000 huruf."),
  copies: z.coerce
    .number({ error: "Jumlah eksemplar berupa angka." })
    .int()
    .min(1, "Minimal 1 eksemplar.")
    .max(50, "Maksimal 50 eksemplar."),
  coverBg: z.string().regex(HEX),
  coverInk: z.string().regex(HEX),
  motif: z.enum(["rain", "moon", "waves", "cup", "ripple", "lantern", "wind", "leaf"]),
  coverMode: z.enum(["keep", "remote", "upload", "none"]),
  coverUrl: z.string().optional(),
});

class UserError extends Error {}

async function readCover(
  mode: string,
  url: string | undefined,
  file: FormDataEntryValue | null,
): Promise<ProcessedCover | null> {
  if (mode === "remote") {
    if (!url) throw new UserError("Sampul dari pencarian hilang. Pilih ulang bukunya, atau unggah sampul.");
    try {
      return await processCover(await downloadCover(url));
    } catch {
      throw new UserError("Sampul dari katalog publik gagal diambil. Unggah foto sampulnya secara manual.");
    }
  }
  if (mode === "upload") {
    if (!(file instanceof File) || file.size === 0) throw new UserError("Pilih berkas gambar sampul dulu.");
    try {
      return await processCover(Buffer.from(await file.arrayBuffer()));
    } catch {
      throw new UserError("Berkas sampul tidak bisa dibaca. Pakai gambar JPG, PNG, atau WebP minimal 80 piksel.");
    }
  }
  return null;
}

export async function saveBook(form: FormData): Promise<
  | {
      ok: true;
      id: string;
      slug: string;
      coverImage: string | null | undefined;
    }
  | Fail
> {
  if (!(await isLibrarian())) return NOT_ALLOWED;

  const raw = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string"));
  const parsed = bookInput.safeParse({ ...raw, id: raw.id || undefined });
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const issue of parsed.error.issues) fields[String(issue.path[0])] ??= issue.message;
    return { ok: false, error: "Ada isian yang belum benar.", fields };
  }
  const v = parsed.data;
  const [known] = await db.select({ name: categories.name }).from(categories).where(eq(categories.name, v.category));
  if (!known) {
    return {
      ok: false,
      error: "Ada isian yang belum benar.",
      fields: { category: "Kategori ini baru saja dihapus atau diganti namanya. Muat ulang halaman lalu pilih lagi." },
    };
  }

  // Buku baru diberi id di sini supaya sampulnya bisa diunggah ke bucket sebelum barisnya ada.
  const bookId = v.id ?? crypto.randomUUID();
  let newKey: string | null = null;
  try {
    const cover = await readCover(v.coverMode, v.coverUrl, form.get("coverFile"));
    if (cover) {
      newKey = newFileKey("covers", bookId);
      await putFile(newKey, cover.data, cover.mime);
    }
    const values = {
      title: v.title,
      author: v.author,
      category: v.category,
      form: v.form,
      year: v.year,
      pages: v.pages,
      shelf: v.shelf,
      isbn: v.isbn,
      publisher: v.publisher,
      language: v.language,
      tags: v.tags,
      synopsis: v.synopsis,
      motif: v.motif,
      // Sampul bergambar memberi warna punggung buku di rak dari warna dominannya.
      coverBg: cover?.bg ?? v.coverBg,
      coverInk: cover?.ink ?? v.coverInk,
      ...(newKey ? { coverKey: newKey } : v.coverMode === "none" ? { coverKey: null } : {}),
    };

    const saved = await db.transaction(async (tx) => {
      const id = bookId;
      let slug: string;
      let oldKey: string | null = null;
      if (v.id) {
        const [before] = await tx.select({ key: books.coverKey }).from(books).where(eq(books.id, id)).for("update");
        if (!before) throw new UserError("Buku ini sudah tidak ada. Mungkin baru dihapus.");
        oldKey = before.key;
        const [row] = await tx.update(books).set(values).where(eq(books.id, id)).returning({ slug: books.slug });
        slug = row.slug;
      } else {
        slug = await uniqueSlug(tx, v.title);
        const [{ next }] = await tx
          .select({
            next: sql<number>`coalesce(max(${books.position}), -1)::int + 1`,
          })
          .from(books);
        const [row] = await tx
          .insert(books)
          .values({
            ...values,
            id,
            slug,
            position: next,
            spreads: titleOnly("Cuplikan buku ini belum tersedia di Lembar. Kamu tetap bisa meminjamnya."),
          })
          .returning({ id: books.id });
        if (!row) throw new UserError("Buku gagal disimpan. Coba lagi.");
        await notifyNewBook({ title: v.title, author: v.author, category: v.category, slug }, tx);
      }

      await syncCopies(tx, id, v.shelf, v.copies);

      // Sampul lama dihapus setelah transaksi berhasil, hanya bila diganti atau dilepas.
      const replaced = oldKey && (newKey || v.coverMode === "none") ? oldKey : null;
      return { id, slug, replaced };
    });
    await deleteFile(saved.replaced);

    updateTag("catalog");
    revalidatePath("/admin");
    // undefined = sampul tidak berubah.
    const coverImage = newKey ? fileUrl(newKey) : v.coverMode === "none" ? null : undefined;
    return { ok: true, id: saved.id, slug: saved.slug, coverImage };
  } catch (e) {
    // Buku tidak tersimpan: sampul yang sudah terlanjur diunggah tidak dipakai siapa pun.
    await deleteFile(newKey);
    if (e instanceof UserError) return { ok: false, error: e.message };
    if (isUniqueViolation(e, "books_isbn_unique")) {
      return {
        ok: false,
        error: "Ada isian yang belum benar.",
        fields: { isbn: "ISBN ini sudah dipakai buku lain di katalog." },
      };
    }
    throw e;
  }
}

/** Samakan jumlah eksemplar. Eksemplar yang pernah dipinjam menyimpan riwayat, jadi hanya yang belum pernah keluar yang bisa dihapus. */
async function syncCopies(tx: Tx, bookId: string, shelf: string, wanted: number) {
  const existing = await tx.select({ id: bookCopies.id }).from(bookCopies).where(eq(bookCopies.bookId, bookId));
  const diff = wanted - existing.length;

  if (diff > 0) await addCopies(tx, bookId, shelf, diff);

  if (diff < 0) {
    const removable = await tx
      .select({ id: bookCopies.id })
      .from(bookCopies)
      .where(
        and(
          eq(bookCopies.bookId, bookId),
          notExists(
            tx
              .select({ one: sql`1` })
              .from(loans)
              .where(eq(loans.copyId, bookCopies.id)),
          ),
        ),
      )
      .orderBy(desc(bookCopies.code))
      .limit(-diff);
    if (removable.length < -diff) {
      throw new UserError(
        `Jumlah eksemplar hanya bisa dikurangi sampai ${existing.length - removable.length}. Eksemplar lainnya pernah dipinjam dan riwayatnya perlu disimpan.`,
      );
    }
    await tx.delete(bookCopies).where(
      inArray(
        bookCopies.id,
        removable.map((r) => r.id),
      ),
    );
  }
}

function isUniqueViolation(e: unknown, constraint: string) {
  for (
    let err = e as { code?: string; constraint?: string; cause?: unknown } | undefined;
    err;
    err = err.cause as typeof err
  ) {
    if (err.code === "23505" && err.constraint === constraint) return true;
  }
  return false;
}

/* ---------------------------------------------------------------- */
/* Hapus buku                                                        */
/* ---------------------------------------------------------------- */

export async function deleteBook(id: string): Promise<{ ok: true } | Fail> {
  if (!(await isLibrarian())) return NOT_ALLOWED;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Buku tidak ditemukan." };

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(loans)
    .innerJoin(bookCopies, eq(bookCopies.id, loans.copyId))
    .where(eq(bookCopies.bookId, id));
  if (n > 0) {
    return {
      ok: false,
      error: "Buku ini punya riwayat peminjaman, jadi tidak bisa dihapus. Kurangi eksemplarnya bila perlu.",
    };
  }
  const [removed] = await db.delete(books).where(eq(books.id, id)).returning({ coverKey: books.coverKey });
  await deleteFile(removed?.coverKey);
  updateTag("catalog");
  revalidatePath("/admin");
  return { ok: true };
}

/* ---------------------------------------------------------------- */
/* Sumbangan: diajukan -> dikirim -> diterima                        */
/* ---------------------------------------------------------------- */

const NEXT_STATUS = { diajukan: "dikirim", dikirim: "diterima" } as const;

/**
 * Majukan status sumbangan satu langkah: setujui (diajukan -> dikirim) atau terima buku (dikirim -> diterima).
 * `from` adalah status yang dilihat pustakawan; bila sudah berubah (mis. diproses pustakawan lain), tidak ada yang diubah.
 */
export async function advanceDonation(
  id: string,
  from: keyof typeof NEXT_STATUS,
): Promise<{ ok: true; status: "dikirim" | "diterima"; book?: AcceptedDonation } | Fail> {
  if (!(await isLibrarian())) return NOT_ALLOWED;
  if (!z.uuid().safeParse(id).success || !(from in NEXT_STATUS))
    return { ok: false, error: "Sumbangan tidak ditemukan." };
  const changed: Fail = {
    ok: false,
    error: "Status sumbangan ini sudah berubah. Muat ulang halaman untuk melihat yang terbaru.",
  };

  if (from === "dikirim") {
    // Buku sudah di tangan perpustakaan: langsung masuk koleksi.
    try {
      const book = await acceptDonation(id);
      updateTag("catalog");
      revalidatePath("/admin");
      revalidatePath("/admin/sumbangan");
      revalidatePath("/sumbang");
      return { ok: true, status: "diterima", book };
    } catch (e) {
      if (e instanceof DonationStateError) return changed;
      console.error("[sumbangan] Gagal memasukkan ke koleksi:", e);
      return {
        ok: false,
        error:
          "Buku gagal dimasukkan ke koleksi, jadi status sumbangan tidak berubah. Coba lagi; kalau masih gagal, laporkan kode sumbangan ini.",
      };
    }
  }

  const row = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(donations)
      .set({ status: "dikirim" })
      .where(and(eq(donations.id, id), eq(donations.status, "diajukan")))
      .returning({
        userId: donations.userId,
        title: donations.title,
        code: donations.code,
        method: donations.method,
        scheduledOn: donations.scheduledOn,
        scheduledHour: donations.scheduledHour,
      });
    if (!updated) return null;
    const when = `${formatDay(Date.parse(updated.scheduledOn))}${updated.scheduledHour !== null ? `, pukul ${formatHour(updated.scheduledHour)}` : ""}`;
    await notify(
      {
        userId: updated.userId,
        kind: "sumbangan",
        title: "Sumbangan disetujui",
        body:
          updated.method === "jemput"
            ? `“${updated.title}” (${updated.code}) disetujui. Petugas akan menjemputnya pada ${when}.`
            : `“${updated.title}” (${updated.code}) disetujui. Antar ke meja sirkulasi pada ${when}.`,
        href: "/sumbang",
      },
      tx,
    );
    return updated;
  });
  if (!row) return changed;
  revalidatePath("/admin/sumbangan");
  revalidatePath("/sumbang");
  return { ok: true, status: "dikirim" };
}

/* ---------------------------------------------------------------- */
/* Peminjaman: terbooking -> dipinjam                                */
/* ---------------------------------------------------------------- */

/**
 * Anggota datang dan menerima bukunya: booking jadi pinjaman aktif. Masa pinjam dihitung mulai hari ini dengan
 * lama yang dipilih anggota, jadi datang lebih lambat dari jadwal tidak memotong jatah harinya.
 */
export async function approvePickup(id: string): Promise<{ ok: true; dueOn: string } | Fail> {
  if (!(await isLibrarian())) return NOT_ALLOWED;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Peminjaman tidak ditemukan." };
  const today = sql`(now() at time zone ${LIBRARY_TZ})::date`;
  const row = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(loans)
      .set({
        status: "active",
        startOn: sql`${today}`,
        dueOn: sql`${today} + (${loans.dueOn} - ${loans.startOn})`,
      })
      .where(and(eq(loans.id, id), eq(loans.status, "reserved")))
      .returning({ dueOn: loans.dueOn, userId: loans.userId, copyId: loans.copyId });
    if (!updated) return null;
    const [book] = await tx
      .select({ title: books.title })
      .from(bookCopies)
      .innerJoin(books, eq(books.id, bookCopies.bookId))
      .where(eq(bookCopies.id, updated.copyId));
    await notify(
      {
        userId: updated.userId,
        kind: "peminjaman",
        title: "Buku sedang kamu pinjam",
        body: `“${book.title}” sudah kamu ambil. Kembalikan paling lambat ${formatDay(Date.parse(updated.dueOn))}.`,
        href: "/jadwal",
      },
      tx,
    );
    return updated;
  });
  if (!row) {
    return {
      ok: false,
      error: "Booking ini sudah diproses atau dibatalkan. Muat ulang halaman untuk melihat yang terbaru.",
    };
  }
  updateTag("catalog");
  revalidatePath("/admin/peminjaman");
  revalidatePath("/jadwal");
  revalidatePath("/profil");
  revalidatePath("/", "layout");
  return { ok: true, dueOn: row.dueOn };
}

/**
 * Terima buku yang pengembaliannya diajukan anggota: status jadi "returned" dengan tanggal hari ini, eksemplar kembali
 * tersedia, dan anggota diberi notifikasi beserta denda akhirnya bila terlambat (dihitung sampai hari buku diterima).
 */
export async function approveReturn(id: string): Promise<{ ok: true; lateDays: number; fine: number } | Fail> {
  if (!(await isLibrarian())) return NOT_ALLOWED;
  if (!z.uuid().safeParse(id).success) return { ok: false, error: "Peminjaman tidak ditemukan." };
  const today = sql`(now() at time zone ${LIBRARY_TZ})::date`;
  const row = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(loans)
      .set({ status: "returned", returnedOn: sql`${today}` })
      .where(and(eq(loans.id, id), eq(loans.status, "active"), isNotNull(loans.returnRequestedAt)))
      .returning({ dueOn: loans.dueOn, returnedOn: loans.returnedOn, userId: loans.userId, copyId: loans.copyId });
    if (!updated) return null;
    const [book] = await tx
      .select({ title: books.title, slug: books.slug })
      .from(bookCopies)
      .innerJoin(books, eq(books.id, bookCopies.bookId))
      .where(eq(bookCopies.id, updated.copyId));
    const lateDays = overdueDays(Date.parse(updated.dueOn), Date.parse(updated.returnedOn!));
    const fine = fineFor(lateDays);
    await notify(
      {
        userId: updated.userId,
        kind: "peminjaman",
        title: "Pengembalian diterima",
        body:
          `Pustakawan sudah menerima “${book.title}”.` +
          (fine > 0
            ? ` Terlambat ${lateDays} hari, denda ${rupiah(fine)}.`
            : " Terima kasih sudah mengembalikan tepat waktu!"),
        href: `/buku/${book.slug}`,
      },
      tx,
    );
    return { lateDays, fine };
  });
  if (!row) {
    return { ok: false, error: "Pengembalian ini sudah diproses. Muat ulang halaman untuk melihat yang terbaru." };
  }
  updateTag("catalog");
  revalidatePath("/admin/peminjaman");
  revalidatePath("/jadwal");
  revalidatePath("/profil");
  revalidatePath("/", "layout");
  return { ok: true, ...row };
}

/* ---------------------------------------------------------------- */
/* Status buka/tutup                                                 */
/* ---------------------------------------------------------------- */

const statusInput = z.object({
  closed: z.boolean(),
  note: z.string().trim().max(120, "Keterangan paling panjang 120 huruf."),
});

/** Tutup perpustakaan secara manual (status "Tutup" di katalog walau masih jam layanan), atau buka lagi. */
export async function setLibraryClosed(
  closed: boolean,
  note = "",
): Promise<{ ok: true } | Fail> {
  if (!(await isLibrarian())) return NOT_ALLOWED;
  const parsed = statusInput.safeParse({ closed, note });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Isiannya belum benar." };
  const values = { closed: parsed.data.closed, note: parsed.data.closed ? parsed.data.note : "", updatedAt: new Date() };
  await db
    .insert(libraryStatus)
    .values({ id: 1, ...values })
    .onConflictDoUpdate({ target: libraryStatus.id, set: values });
  revalidatePath("/");
  revalidatePath("/admin", "layout");
  return { ok: true };
}
