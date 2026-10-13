import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import type { AvatarLook } from "@/components/Avatar";
import { loans, profiles, user } from "@/db/schema";
import { PERSON } from "@/lib/people";
import { fileUrl } from "@/lib/server/storage";

/** Zona waktu perpustakaan; "hari ini" dan "dua hari lagi" dihitung menurut kalender ini. */
export const LIBRARY_TZ = "Asia/Jakarta";
export const REMINDER_DAYS = 2;

export async function getProfile(userId: string) {
  const [existing] = await db.select().from(profiles).where(eq(profiles.userId, userId));
  if (existing) return existing;

  // Profil dibuat saat daftar. Jika langkah itu gagal, buat di sini supaya akun tidak buntu.
  const [account] = await db.select({ name: user.name }).from(user).where(eq(user.id, userId));
  if (!account) return undefined;
  const [created] = await db
    .insert(profiles)
    .values({ userId, nickname: account.name.trim().split(/\s+/)[0] || account.name })
    .onConflictDoNothing()
    .returning();
  return created ?? (await db.select().from(profiles).where(eq(profiles.userId, userId)))[0];
}

/** Jumlah pinjaman aktif yang jatuh tempo dalam 2 hari atau sudah lewat. */
export async function countDueReminders(userId: string) {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(loans)
    .where(
      and(
        eq(loans.userId, userId),
        eq(loans.status, "active"),
        sql`${loans.dueOn} <= (now() at time zone ${LIBRARY_TZ})::date + ${REMINDER_DAYS}::int`,
      ),
    );
  return row.n;
}

/** Tanggal hari ini menurut kalender perpustakaan, "YYYY-MM-DD". */
export async function libraryToday(): Promise<string> {
  const { rows } = await db.execute<{ today: string }>(
    sql`select to_char((now() at time zone ${LIBRARY_TZ})::date, 'YYYY-MM-DD') as today`,
  );
  return rows[0].today;
}

/** Tambah hari pada tanggal "YYYY-MM-DD" tanpa terpengaruh zona waktu server. */
export function addDays(isoDate: string, days: number) {
  const t = Date.parse(isoDate) + days * 86_400_000;
  return new Date(t).toISOString().slice(0, 10);
}

/** Tampilan avatar anggota: foto unggahan bila dipilih, kalau tidak ilustrasi karakter. */
export function resolveLook(
  userId: string,
  p: Pick<typeof profiles.$inferSelect, "gender" | "avatarLook" | "usePhoto" | "photoKey">,
): AvatarLook {
  const base = p.avatarLook ?? PERSON[p.gender].look;
  return p.usePhoto && p.photoKey ? { ...base, photo: fileUrl(p.photoKey) } : base;
}
