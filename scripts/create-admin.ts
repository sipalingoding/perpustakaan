/**
 * Buat akun pustakawan (admin) untuk masuk ke /admin.
 *
 *   npm run admin:create                                  admin@contoh.id, "Pustakawan Lembar"
 *   npm run admin:create -- pustakawan@perpus.id "Nama"   email dan nama sendiri
 *
 * Kata sandinya diambil dari ADMIN_PASSWORD di .env.local, tidak pernah ditulis di kode atau dicetak.
 * Bila email sudah terdaftar, akun itu dijadikan pustakawan tanpa mengubah kata sandinya.
 */
import { ensureLibrarian } from "@/lib/server/admin-account";

async function main(email: string, name: string, password: string | undefined) {
  if (!password || password.length < 8) {
    console.error("ADMIN_PASSWORD di .env.local belum diisi (minimal 8 karakter).");
    process.exit(1);
  }
  const { created } = await ensureLibrarian(email, name, password);
  console.log(
    created
      ? `Akun pustakawan ${email} dibuat. Kata sandinya ada di ADMIN_PASSWORD, .env.local.`
      : `${email} sudah terdaftar, sekarang menjadi pustakawan. Kata sandinya tidak diubah.`,
  );
  process.exit(0);
}

const [email = "admin@contoh.id", name = "Pustakawan Lembar"] = process.argv.slice(2);
main(email, name, process.env.ADMIN_PASSWORD);
