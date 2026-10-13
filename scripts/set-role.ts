/**
 * Jadikan seorang anggota pustakawan (atau kembalikan jadi anggota biasa).
 *
 *   npm run role -- email@contoh.id pustakawan
 *   npm run role -- email@contoh.id anggota
 *
 * Akunnya harus sudah terdaftar lewat halaman Masuk.
 */
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { profiles, user } from "@/db/schema";

const [email, roleArg = "pustakawan"] = process.argv.slice(2);
const role = roleArg === "anggota" || roleArg === "pustakawan" ? roleArg : null;
if (!email || !role) {
  console.error("Pakai: npm run role -- <email> [pustakawan|anggota]");
  process.exit(1);
}

async function main(email: string, role: "anggota" | "pustakawan") {
  const [account] = await db
    .select({ id: user.id, name: user.name })
    .from(user)
    .where(eq(user.email, email.toLowerCase()));
  if (!account) {
    console.error(`Tidak ada akun dengan email ${email}. Daftar dulu lewat halaman Masuk.`);
    process.exit(1);
  }
  const updated = await db
    .update(profiles)
    .set({ role })
    .where(eq(profiles.userId, account.id))
    .returning({ id: profiles.userId });
  if (updated.length === 0) {
    console.error("Akun ini belum punya profil. Masuk sekali lewat aplikasi, lalu jalankan lagi.");
    process.exit(1);
  }
  console.log(`${account.name} sekarang ${role}.`);
  process.exit(0);
}

main(email, role);
