/**
 * Pindahkan akun ke Neon Auth dan berkas ke Neon Object Storage. Aman dijalankan berulang.
 *
 *   npm run db:migrate-neon
 *
 * 1. Akun: setiap akun dengan kata sandi dibuatkan akun Neon Auth (schema neon_auth) dengan hash kata sandi yang
 *    sama, jadi anggota tetap masuk dengan kata sandi lamanya. Id akun di tabel aplikasi diganti ke id Neon Auth;
 *    profil, pinjaman, dan sumbangan ikut berpindah lewat ON UPDATE CASCADE (migrasi 0006).
 * 2. Berkas: foto profil (avatar_photos) dan sampul (book_covers) disalin ke bucket "uploads"; kuncinya disimpan di
 *    profiles.photo_key dan books.cover_key.
 *
 * Jalankan sebelum migrasi 0007, yang menghapus tabel lama.
 */
import { sql } from "drizzle-orm";
import sharp from "sharp";
import { db } from "@/db";
import { newFileKey, putFile } from "@/lib/server/storage";

type LegacyAccount = {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
  created_at: Date;
  updated_at: Date;
  password: string;
};

async function migrateAccounts() {
  const { rows } = await db.execute<LegacyAccount>(sql`
    select u.id, u.name, u.email, u.email_verified, u.created_at, u.updated_at, a.password
    from public."user" u
    join public.account a on a.user_id = u.id and a.provider_id = 'credential' and a.password is not null`);

  let created = 0;
  let rekeyed = 0;
  for (const u of rows) {
    await db.transaction(async (tx) => {
      const email = u.email.toLowerCase();
      const existing = await tx.execute<{ id: string }>(sql`select id::text from neon_auth."user" where lower(email) = ${email}`);
      let neonId = existing.rows[0]?.id;
      if (!neonId) {
        const inserted = await tx.execute<{ id: string }>(sql`
          insert into neon_auth."user" (id, name, email, "emailVerified", "createdAt", "updatedAt", role, banned)
          values (gen_random_uuid(), ${u.name}, ${email}, ${u.email_verified}, ${u.created_at}, ${u.updated_at}, 'user', false)
          returning id::text`);
        neonId = inserted.rows[0].id;
        await tx.execute(sql`
          insert into neon_auth.account (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
          values (gen_random_uuid(), ${neonId}, 'credential', ${neonId}::uuid, ${u.password}, now(), now())`);
        created++;
      }
      if (u.id !== neonId) {
        await tx.execute(sql`update public."user" set id = ${neonId} where id = ${u.id}`);
        rekeyed++;
      }
    });
  }
  console.log(`Akun: ${rows.length} berkata sandi, ${created} dibuat di Neon Auth, ${rekeyed} id diganti.`);
}

async function migrateFiles() {
  const avatars = await db.execute<{ user_id: string; data: Buffer }>(sql`
    select a.user_id, a.data from avatar_photos a join profiles p on p.user_id = a.user_id where p.photo_key is null`);
  for (const a of avatars.rows) {
    // Foto lama bisa PNG atau WebP; di bucket semuanya JPEG agar sesuai kuncinya.
    const jpeg = await sharp(a.data).rotate().resize(320, 320, { fit: "cover" }).jpeg({ quality: 86, mozjpeg: true }).toBuffer();
    const key = newFileKey("avatars", a.user_id);
    await putFile(key, jpeg);
    await db.execute(sql`update profiles set photo_key = ${key} where user_id = ${a.user_id}`);
  }

  const covers = await db.execute<{ book_id: string; data: Buffer; mime: string }>(sql`
    select c.book_id, c.data, c.mime from book_covers c join books b on b.id = c.book_id where b.cover_key is null`);
  for (const c of covers.rows) {
    const key = newFileKey("covers", c.book_id);
    await putFile(key, c.data, c.mime);
    await db.execute(sql`update books set cover_key = ${key} where id = ${c.book_id}`);
  }
  console.log(`Berkas: ${avatars.rows.length} foto profil dan ${covers.rows.length} sampul disalin ke bucket uploads.`);
}

async function main() {
  await migrateAccounts();
  await migrateFiles();
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
