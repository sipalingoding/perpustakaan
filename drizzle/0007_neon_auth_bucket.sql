-- Pengaman: tabel di bawah ini dihapus. Tolak bila datanya belum dipindah oleh `npm run db:migrate-neon`.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "account" a
    WHERE a."provider_id" = 'credential' AND a."password" IS NOT NULL
      AND (to_regclass('neon_auth.user') IS NULL
        OR NOT EXISTS (SELECT 1 FROM "user" u WHERE u."id" = a."user_id" AND u."id" ~ '^[0-9a-f-]{36}$'))
  ) THEN
    RAISE EXCEPTION 'Masih ada akun yang belum dipindah ke Neon Auth. Jalankan npm run db:migrate-neon dulu.';
  END IF;
  IF EXISTS (SELECT 1 FROM "avatar_photos" a JOIN "profiles" p ON p."user_id" = a."user_id" WHERE p."photo_key" IS NULL)
    OR EXISTS (SELECT 1 FROM "book_covers" c JOIN "books" b ON b."id" = c."book_id" WHERE b."cover_key" IS NULL) THEN
    RAISE EXCEPTION 'Masih ada foto atau sampul yang belum dipindah ke bucket. Jalankan npm run db:migrate-neon dulu.';
  END IF;
END $$;--> statement-breakpoint
DROP TABLE "account" CASCADE;--> statement-breakpoint
DROP TABLE "avatar_photos" CASCADE;--> statement-breakpoint
DROP TABLE "book_covers" CASCADE;--> statement-breakpoint
DROP TABLE "session" CASCADE;--> statement-breakpoint
DROP TABLE "verification" CASCADE;--> statement-breakpoint
ALTER TABLE "books" DROP COLUMN "cover_updated_at";--> statement-breakpoint
ALTER TABLE "profiles" DROP COLUMN "photo_updated_at";