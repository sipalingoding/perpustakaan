ALTER TABLE "donations" ALTER COLUMN "condition" SET DATA TYPE text;--> statement-breakpoint
-- Skala lama baru/sangat baik/baik jadi baru/baik/kurang baik: "Sangat baik" digabung ke "Baik".
UPDATE "donations" SET "condition" = 'baik' WHERE "condition" = 'sangat';--> statement-breakpoint
DROP TYPE "public"."book_condition";--> statement-breakpoint
CREATE TYPE "public"."book_condition" AS ENUM('baru', 'baik', 'kurang');--> statement-breakpoint
ALTER TABLE "donations" ALTER COLUMN "condition" SET DATA TYPE "public"."book_condition" USING "condition"::"public"."book_condition";