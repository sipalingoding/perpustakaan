ALTER TYPE "public"."notification_kind" ADD VALUE 'buku';--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "notifications" SET DEFAULT '{"due":true,"fav":true}'::jsonb;