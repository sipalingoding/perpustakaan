ALTER TABLE "books" DROP CONSTRAINT "books_category_not_other";--> statement-breakpoint
ALTER TABLE "books" DROP CONSTRAINT "books_pages_positive";--> statement-breakpoint
ALTER TABLE "books" ALTER COLUMN "pages" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ALTER COLUMN "year" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "isbn" text;--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "publisher" text;--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "year" integer;--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "pages" integer;--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "language" text;--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "cover_url" text;--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "source_ref" text;--> statement-breakpoint
ALTER TABLE "donations" ADD COLUMN "book_id" uuid;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_pages_positive" CHECK ("books"."pages" is null or "books"."pages" > 0);