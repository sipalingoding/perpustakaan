"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { bookCopies, bookReviews, books, loans, profiles } from "@/db/schema";
import { formatDay } from "@/lib/dates";
import { fineFor, overdueDays, rupiah } from "@/lib/fine";
import { EXTENSION_DAYS } from "@/lib/library";
import { sendDueReminders } from "@/lib/server/due-reminders";
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
  // Buku yang jatuh tempo besok langsung diingatkan, tanpa menunggu cron pagi berikutnya.
  if (parsed.data) after(() => sendDueReminders(viewer.id).catch((e) => console.error("Pengingat gagal dikirim", e)));
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

/** Batalkan booking yang belum diambil. Eksemplarnya langsung terbuka lagi untuk anggota lain. */
export async function cancelBooking(loanId: string): Promise<ActionResult> {
  const viewer = await getViewer();
  if (!viewer) return SESSION_ENDED;
  if (!z.uuid().safeParse(loanId).success) return { ok: false, error: "Booking tidak dikenal. Muat ulang halaman." };

  const title = await db.transaction(async (tx) => {
    const [loan] = await tx
      .update(loans)
      .set({ status: "cancelled" })
      .where(and(eq(loans.id, loanId), eq(loans.userId, viewer.id), eq(loans.status, "reserved")))
      .returning({ copyId: loans.copyId });
    if (!loan) return null;
    const [book] = await tx
      .select({ title: books.title, slug: books.slug })
      .from(bookCopies)
      .innerJoin(books, eq(books.id, bookCopies.bookId))
      .where(eq(bookCopies.id, loan.copyId));
    await notify(
      {
        userId: viewer.id,
        kind: "peminjaman",
        title: "Booking dibatalkan",
        body: `Booking “${book.title}” sudah kamu batalkan. Bukunya terbuka lagi untuk anggota lain.`,
        href: `/buku/${book.slug}`,
      },
      tx,
    );
    return book.title;
  });
  if (!title) return { ok: false, error: "Booking ini sudah diambil, dibatalkan, atau kedaluwarsa. Muat ulang halaman." };

  updateTag("catalog");
  revalidatePath("/jadwal");
  revalidatePath("/profil");
  revalidatePath("/admin/peminjaman");
  revalidatePath("/", "layout");
  return { ok: true };
}

export type ExtendResult = { ok: true; dueOn: string } | { ok: false; error: string };

/**
 * Perpanjang pinjaman aktif sekali, 7 hari dari batas kembali yang sekarang. Tidak bisa untuk buku yang sudah
 * terlambat (dendanya harus diselesaikan di meja sirkulasi) atau yang pengembaliannya sudah diajukan.
 */
export async function extendLoan(loanId: string): Promise<ExtendResult> {
  const viewer = await getViewer();
  if (!viewer) return SESSION_ENDED as ExtendResult;
  if (!z.uuid().safeParse(loanId).success) return { ok: false, error: "Pinjaman tidak dikenal. Muat ulang halaman." };

  const today = sql`(now() at time zone ${LIBRARY_TZ})::date`;
  const [loan] = await db
    .select({
      status: loans.status,
      extensions: loans.extensions,
      requested: sql<boolean>`${loans.returnRequestedAt} is not null`,
      late: sql<boolean>`${loans.dueOn} < ${today}`,
    })
    .from(loans)
    .where(and(eq(loans.id, loanId), eq(loans.userId, viewer.id)));
  if (!loan || loan.status !== "active") return { ok: false, error: "Buku ini sudah tidak kamu pinjam. Muat ulang halaman." };
  if (loan.extensions > 0) return { ok: false, error: "Pinjaman ini sudah pernah diperpanjang. Perpanjangan hanya bisa sekali." };
  if (loan.requested) return { ok: false, error: "Pengembalian buku ini sudah diajukan, jadi tidak bisa diperpanjang." };
  if (loan.late) {
    return { ok: false, error: "Buku ini sudah lewat batas kembali, jadi tidak bisa diperpanjang. Kembalikan ke meja sirkulasi." };
  }

  const result = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(loans)
      .set({ dueOn: sql`${loans.dueOn} + ${EXTENSION_DAYS}::int`, extensions: sql`${loans.extensions} + 1` })
      .where(
        and(
          eq(loans.id, loanId),
          eq(loans.userId, viewer.id),
          eq(loans.status, "active"),
          eq(loans.extensions, 0),
          isNull(loans.returnRequestedAt),
          sql`${loans.dueOn} >= ${today}`,
        ),
      )
      .returning({ dueOn: loans.dueOn, copyId: loans.copyId });
    if (!updated) return null;
    const [book] = await tx
      .select({ title: books.title })
      .from(bookCopies)
      .innerJoin(books, eq(books.id, bookCopies.bookId))
      .where(eq(bookCopies.id, updated.copyId));
    await notify(
      {
        userId: viewer.id,
        kind: "peminjaman",
        title: "Pinjaman diperpanjang",
        body: `“${book.title}” diperpanjang ${EXTENSION_DAYS} hari. Kembalikan paling lambat ${formatDay(Date.parse(updated.dueOn))}.`,
        href: "/jadwal",
      },
      tx,
    );
    return updated.dueOn;
  });
  if (!result) return { ok: false, error: "Pinjaman ini baru saja berubah. Muat ulang halaman lalu coba lagi." };

  updateTag("catalog");
  revalidatePath("/jadwal");
  revalidatePath("/profil");
  revalidatePath("/admin/peminjaman");
  return { ok: true, dueOn: result };
}
