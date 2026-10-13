import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { profiles, user } from "@/db/schema";

/**
 * Buat akun pustakawan di Neon Auth (lewat API daftar-nya, jadi kata sandinya di-hash oleh Neon), lalu data anggota
 * dan profil berperan pustakawan dengan id yang sama. Bila email sudah terdaftar, akun itu hanya dijadikan
 * pustakawan; kata sandinya tidak diubah. Dipakai skrip, jadi berjalan di luar Next.js.
 */
export async function ensureLibrarian(email: string, name: string, password: string) {
  const baseUrl = process.env.NEON_AUTH_BASE_URL;
  if (!baseUrl) throw new Error("NEON_AUTH_BASE_URL belum diisi.");
  const normalized = email.trim().toLowerCase();

  const res = await fetch(`${baseUrl}/sign-up/email`, {
    method: "POST",
    // Neon Auth hanya menerima asal yang dipercaya; localhost diizinkan secara bawaan.
    headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
    body: JSON.stringify({ email: normalized, password, name }),
  });
  const body = (await res.json().catch(() => ({}))) as { user?: { id: string }; code?: string };

  let id = body.user?.id;
  const created = res.ok && !!id;
  if (!created) {
    if (!body.code?.startsWith("USER_ALREADY_EXISTS")) throw new Error(`Neon Auth menolak pendaftaran: ${body.code ?? res.status}`);
    const { rows } = await db.execute<{ id: string }>(sql`select id::text from neon_auth."user" where lower(email) = ${normalized}`);
    id = rows[0]?.id;
    if (!id) throw new Error("Akun ada di Neon Auth tapi tidak ditemukan.");
  }

  await db.insert(user).values({ id: id!, name, email: normalized, emailVerified: true }).onConflictDoNothing();
  const [member] = await db.select({ id: user.id }).from(user).where(eq(user.id, id!));
  if (!member) throw new Error(`Email ${normalized} sudah dipakai data anggota dengan id lain. Jalankan migrasi akun dulu.`);
  await db
    .insert(profiles)
    .values({ userId: id!, nickname: name.split(/\s+/)[0], role: "pustakawan" })
    .onConflictDoUpdate({ target: profiles.userId, set: { role: "pustakawan" } });
  return { created };
}
