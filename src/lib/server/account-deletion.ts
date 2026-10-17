import "server-only";
import { verifyPassword } from "@better-auth/utils/password";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { loans, profiles, user } from "@/db/schema";
import { holdsCopy } from "@/lib/server/loans";
import { deleteFile } from "@/lib/server/storage";

export type DeleteAccountResult = { ok: true } | { ok: false; error: string };

/**
 * Hapus akun anggota beserta semua datanya, setelah kata sandinya dicocokkan.
 *
 * Endpoint delete-user Neon Auth tidak diaktifkan (membalas 404), jadi kata sandi dicocokkan langsung ke hash di
 * neon_auth.account (scrypt Better Auth, sama dengan yang dipakai Neon), lalu baris neon_auth."user" dihapus; sesi
 * dan akun login ikut terhapus lewat cascade. Data aplikasi (profil, pinjaman, sumbangan, ulasan, notifikasi,
 * pendaftaran agenda) ikut terhapus lewat cascade dari tabel user. Keduanya dalam satu transaksi.
 */
export async function deleteMemberAccount(userId: string, password: string): Promise<DeleteAccountResult> {
  const [profile] = await db
    .select({ role: profiles.role, photoKey: profiles.photoKey })
    .from(profiles)
    .where(eq(profiles.userId, userId));
  if (profile?.role === "pustakawan") {
    return { ok: false, error: "Akun pustakawan tidak bisa dihapus dari sini. Minta pustakawan lain mencabut perannya dulu." };
  }

  const [open] = await db
    .select({ id: loans.id })
    .from(loans)
    .where(and(eq(loans.userId, userId), holdsCopy))
    .limit(1);
  if (open) {
    return { ok: false, error: "Masih ada buku yang kamu pinjam atau booking. Kembalikan atau batalkan dulu, lalu coba lagi." };
  }

  const { rows } = await db.execute<{ password: string | null }>(
    sql`select password from neon_auth.account where "userId"::text = ${userId} and "providerId" = 'credential'`,
  );
  const hash = rows[0]?.password;
  if (!hash || !(await verifyPassword(hash, password).catch(() => false))) {
    return { ok: false, error: "Kata sandinya belum cocok. Periksa lagi, ya." };
  }

  await db.transaction(async (tx) => {
    await tx.delete(user).where(eq(user.id, userId));
    await tx.execute(sql`delete from neon_auth."user" where id::text = ${userId}`);
  });
  await deleteFile(profile?.photoKey);
  return { ok: true };
}
