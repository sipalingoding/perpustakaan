CREATE TYPE "public"."role" AS ENUM('anggota', 'pustakawan');--> statement-breakpoint
CREATE TABLE "book_covers" (
	"book_id" uuid PRIMARY KEY NOT NULL,
	"mime" text NOT NULL,
	"data" "bytea" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "isbn" text;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "publisher" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "language" text DEFAULT 'Indonesia' NOT NULL;--> statement-breakpoint
ALTER TABLE "books" ADD COLUMN "cover_updated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "role" "role" DEFAULT 'anggota' NOT NULL;--> statement-breakpoint
ALTER TABLE "book_covers" ADD CONSTRAINT "book_covers_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "books_isbn_unique" ON "books" USING btree ("isbn");