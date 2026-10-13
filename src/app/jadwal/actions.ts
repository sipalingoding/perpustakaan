"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { bookCopies, bookReviews, books, loans, profiles } from "@/db/schema";
import { fineFor, overdueDays, rupiah } from "@/lib/fine";
import { LIBRARY_TZ } from "@/lib/server/members";
import { notify } from "@/lib/server/notifications";
import { getViewer } from "@/lib/server/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

const SESSION_ENDED: ActionResult = { ok: false, error: "Sesimu sudah berakhir. Masuk lagi, ya." };

export async function setDueReminder(on: boolean): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SESSION_ENDED;
  const parsed = z.boolean().safeParse(on);
  if (!parsed.success) return { ok: false, error: "Isiannya belum benar." };
  await db
    .update(profiles)
    .set({ notifications: sql`jsonb_set(${profiles.notifications}, '{due}', to_jsonb(${parsed.data}::boolean))` })
    .where(eq(profiles.userId, viewer.id));
  return { ok: true };
}

const reviewInput = z
  .object({
    rating: z.number().int().min(1, "Pilih 1 sampai 5 bintang.").max(5, "Pilih 1 sampai 5 bintang."),
    body: z.string().trim().max(1000, "Ulasan paling panjang 1000 huruf."),
  })
  .nullable();

export type ReturnResult =
  | { ok: true; title: string; slug: string; reviewed: boolean; lateDays: number; fine: number }
  | { ok: false; error: string };

/**
 * Ajukan pengembalian buku yang sedang dipinjam, sekaligus menyimpan ulasan dan rating bila diisi (satu transaksi).
 * Status pinjaman belum berubah: buku tetap "dipinjam" dan eksemplarnya belum tersedia untuk anggota lain sampai
 * pustakawan menerima bukunya di meja sirkulasi (approveReturn di admin).
 * Ulasan anggota untuk buku yang sama diperbarui, bukan ditambah, jadi setiap pembaca punya satu ulasan per buku.
 * `lateDays` dan `fine` = perkiraan sampai hari ini; angka akhirnya dihitung saat pustakawan menerima buku.
 */
export async function returnBook(loanId: string, review: z.input<typeof reviewInput>): Promise<ReturnResult> {
  const viewer = await getViewer();
  if (!viewer) return SESSION_ENDED as ReturnResult;
  if (!z.uuid().safeParse(loanId).success) return { ok: false, error: "Pinjaman tidak dikenal. Muat ulang halaman." };
  const parsed = reviewInput.safeParse(review);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Ulasannya belum benar." };

  const today = sql<string>`to_char((now() at time zone ${LIBRARY_TZ})::date, 'YYYY-MM-DD')`;
  const result = await db.transaction(async (tx) => {
    const [loan] = await tx
      .update(loans)
      .set({ returnRequestedAt: new Date() })
      .where(
        and(
          eq(loans.id, loanId),
          eq(loans.userId, viewer.id),
          eq(loans.status, "active"),
          isNull(loans.returnRequestedAt),
        ),
      )
      .returning({ copyId: loans.copyId, dueOn: loans.dueOn, today });
    if (!loan) return null;

    const [book] = await tx
      .select({ id: books.id, title: books.title, slug: books.slug })
      .from(bookCopies)
      .innerJoin(books, eq(books.id, bookCopies.bookId))
      .where(eq(bookCopies.id, loan.copyId));

    if (parsed.data) {
      const { rating, body } = parsed.data;
      await tx
        .insert(bookReviews)
        .values({ bookId: book.id, userId: viewer.id, loanId, rating, body })
        .onConflictDoUpdate({
          target: [bookReviews.bookId, bookReviews.userId],
          set: { rating, body, loanId, updatedAt: new Date() },
        });
    }

    const lateDays = overdueDays(Date.parse(loan.dueOn), Date.parse(loan.today));
    const fine = fineFor(lateDays);
    await notify(
      {
        userId: viewer.id,
        kind: "peminjaman",
        title: "Pengembalian diajukan",
        body:
          `Serahkan “${book.title}” ke meja sirkulasi. Statusnya berubah setelah pustakawan menerima bukunya.` +
          (fine > 0 ? ` Terlambat ${lateDays} hari: denda ${rupiah(fine)} sampai hari ini.` : "") +
          (parsed.data ? " Ulasanmu sudah tampil di halaman buku." : ""),
        href: "/jadwal",
      },
      tx,
    );
    return { title: book.title, slug: book.slug, reviewed: !!parsed.data, lateDays, fine };
  });

  if (!result) {
    return {
      ok: false,
      error: "Pengembalian buku ini sudah diajukan atau bukunya sudah tidak kamu pinjam. Muat ulang halaman.",
    };
  }
  // Rating di katalog dan halaman buku berubah bila ada ulasan; stok baru berubah saat pustakawan menerima buku.
  if (result.reviewed) updateTag("catalog");
  revalidatePath("/admin/peminjaman");
  return { ok: true, ...result };
}
