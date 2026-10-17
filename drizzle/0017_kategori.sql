CREATE TABLE "categories" (
	"name" text PRIMARY KEY NOT NULL,
	"cover_bg" text NOT NULL,
	"cover_ink" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "categories_name_length" CHECK (char_length("categories"."name") between 1 and 30)
);
--> statement-breakpoint
-- Enam kategori yang sebelumnya tetap (enum), dengan warna sampul bawaan yang dulu ada di kode.
INSERT INTO "categories" ("name", "cover_bg", "cover_ink", "position") VALUES
	('Fiksi', '#4F6F66', '#F3F1E7', 0),
	('Sains', '#5C7395', '#F6F4EC', 1),
	('Sejarah', '#B9C7B0', '#23332D', 2),
	('Puisi', '#74678F', '#FBF7EF', 3),
	('Anak', '#E3BE9C', '#3A2E26', 4),
	('Lainnya', '#C9D3D9', '#22323A', 5);
--> statement-breakpoint
ALTER TABLE "books" ALTER COLUMN "category" SET DATA TYPE text USING "category"::text;--> statement-breakpoint
ALTER TABLE "donations" ALTER COLUMN "category" SET DATA TYPE text USING "category"::text;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "fav_categories" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "fav_categories" SET DATA TYPE text[] USING "fav_categories"::text[];--> statement-breakpoint
ALTER TABLE "profiles" ALTER COLUMN "fav_categories" SET DEFAULT '{}';--> statement-breakpoint
ALTER TABLE "books" ADD CONSTRAINT "books_category_categories_name_fk" FOREIGN KEY ("category") REFERENCES "public"."categories"("name") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_category_categories_name_fk" FOREIGN KEY ("category") REFERENCES "public"."categories"("name") ON DELETE restrict ON UPDATE cascade;--> statement-breakpoint
DROP TYPE "public"."category";
