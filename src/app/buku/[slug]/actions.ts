"use server";

import { sql } from "drizzle-orm";
import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { expireMissedPickups, pickupSchedule } from "@/lib/server/loans";
import { addDays } from "@/lib/server/members";
import { formatDay } from "@/lib/dates";
import { formatHour } from "@/lib/library";
import { notify } from "@/lib/server/notifications";
import { getViewer } from "@/lib/server/session";
import { closedError } from "@/lib/server/library-status";
import { isInSchedule } from "@/lib/server/slots";

export type BorrowResult = { ok: true } | { ok: false; error: string };

const request = z.object({
  slug: z.string().min(1).max(120),
  pickupOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  pickupHour: z.number().int(),
  days: z.union([z.literal(7), z.literal(14), z.literal(21)]),
});

/** Kode galat Postgres untuk pelanggaran indeks unik (eksemplar sudah dipegang orang lain). */
const isUniqueViolation = (e: unknown) =>
  [e, (e as { cause?: unknown } | null)?.cause].some((x) => (x as { code?: string } | null)?.code === "23505");

/**
 * Booking satu eksemplar yang masih kosong untuk diambil pada tanggal dan jam pilihan. Status awalnya "reserved"
 * (terbooking); pustakawan mengubahnya jadi "active" (dipinjam) saat anggota datang mengambil bukunya. Eksemplar dipilih di dalam INSERT dan dijaga indeks unik, jadi dua anggota yang
 * menekan tombol bersamaan tidak mungkin memegang eksemplar yang sama.
 */
export async function borrowBook(input: z.input<typeof request>): Promise<BorrowResult> {
  const viewer = await getViewer();
  if (!viewer) return { ok: false, error: "Masuk dulu untuk meminjam buku." };
  const parsed = request.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Pilihan peminjaman belum benar." };
  const { slug, pickupOn, pickupHour, days } = parsed.data;

  // Tanggal dan jam hanya boleh salah satu dari yang ditawarkan, dihitung ulang di server (jam Jakarta).
  if (!isInSchedule(await pickupSchedule(), pickupOn, pickupHour)) {
    return { ok: false, error: "Tanggal atau jam itu sudah tidak tersedia. Pilih jadwal lain dalam 7 hari ke depan." };
  }
  const closed = await closedError("booking");
  if (closed) return { ok: false, error: closed };
  const dueOn = addDays(pickupOn, days);
  // Booking orang lain yang tidak diambil sampai akhir harinya melepaskan eksemplarnya lebih dulu.
  await expireMissedPickups();

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const booked = await db.transaction(async (tx) => {
        // Satu anggota satu eksemplar per judul: permintaan bersamaan dari anggota yang sama (dua tab, klik ganda)
        // menunggu giliran di sini, jadi pemeriksaan "belum pinjam buku ini" di bawah tidak bisa lolos dua kali.
        await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`pinjam:${viewer.id}:${slug}`}))`);
        const { rows } = await tx.execute<{ id: string; title: string }>(sql`
          insert into loans (user_id, copy_id, status, start_on, pickup_hour, due_on)
          select ${viewer.id}, c.id, 'reserved', ${pickupOn}::date, ${pickupHour}, ${dueOn}::date
          from book_copies c
          join books b on b.id = c.book_id
          where b.slug = ${slug}
            and not exists (select 1 from loans l where l.copy_id = c.id and l.status in ('reserved', 'active'))
            and not exists (
              select 1 from loans l
              join book_copies c2 on c2.id = l.copy_id
              where c2.book_id = b.id and l.user_id = ${viewer.id} and l.status in ('reserved', 'active')
            )
          order by c.code
          limit 1
          returning id, (select title from books where slug = ${slug}) as title`);
        if (rows.length === 0) return null;
        await notify(
          {
            userId: viewer.id,
            kind: "peminjaman",
            title: "Buku terbooking",
            body: `“${rows[0].title}” terbooking untukmu. Ambil di meja sirkulasi pada ${formatDay(Date.parse(pickupOn))}, pukul ${formatHour(pickupHour)}.`,
            href: `/buku/${slug}`,
          },
          tx,
        );
        return rows[0];
      });
      if (!booked) {
        return { ok: false, error: "Buku ini sudah kamu pinjam atau pesan, atau semua eksemplarnya sedang dipinjam." };
      }
      updateTag("catalog");
      revalidatePath("/jadwal");
      revalidatePath("/profil");
      revalidatePath("/", "layout");
      return { ok: true };
    } catch (e) {
      // Eksemplar yang tadi dipilih keburu diambil orang lain: coba lagi dengan eksemplar berikutnya.
      if (!isUniqueViolation(e)) throw e;
    }
  }
  return { ok: false, error: "Eksemplar terakhir baru saja dipinjam anggota lain. Coba lagi sebentar lagi." };
}
