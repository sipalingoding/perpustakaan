CREATE TYPE "public"."book_condition" AS ENUM('baru', 'sangat', 'baik');--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('Fiksi', 'Sains', 'Sejarah', 'Puisi', 'Anak', 'Lainnya');--> statement-breakpoint
CREATE TYPE "public"."donation_method" AS ENUM('antar', 'jemput');--> statement-breakpoint
CREATE TYPE "public"."donation_status" AS ENUM('diajukan', 'diterima', 'ditolak');--> statement-breakpoint
CREATE TYPE "public"."gender" AS ENUM('perempuan', 'laki-laki');--> statement-breakpoint
CREATE TYPE "public"."loan_status" AS ENUM('reserved', 'active', 'returned', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."motif" AS ENUM('rain', 'moon', 'waves', 'cup', 'ripple', 'lantern', 'wind', 'leaf');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "book_copies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"book_id" uuid NOT NULL,
	"code" text NOT NULL,
	CONSTRAINT "book_copies_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "books" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"category" "category" NOT NULL,
	"form" text NOT NULL,
	"cover_bg" text NOT NULL,
	"cover_ink" text NOT NULL,
	"motif" "motif" DEFAULT 'leaf' NOT NULL,
	"tags" text DEFAULT '' NOT NULL,
	"synopsis" text DEFAULT '' NOT NULL,
	"pages" integer NOT NULL,
	"year" integer NOT NULL,
	"shelf" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"spreads" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "books_slug_unique" UNIQUE("slug"),
	CONSTRAINT "books_category_not_other" CHECK ("books"."category" <> 'Lainnya'),
	CONSTRAINT "books_pages_positive" CHECK ("books"."pages" > 0)
);
--> statement-breakpoint
CREATE TABLE "donations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"code" text NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"category" "category" NOT NULL,
	"condition" "book_condition" NOT NULL,
	"qty" integer DEFAULT 1 NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"method" "donation_method" NOT NULL,
	"address" text,
	"scheduled_on" date NOT NULL,
	"show_name" boolean DEFAULT true NOT NULL,
	"status" "donation_status" DEFAULT 'diajukan' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "donations_code_unique" UNIQUE("code"),
	CONSTRAINT "donations_qty_range" CHECK ("donations"."qty" between 1 and 20),
	CONSTRAINT "donations_note_length" CHECK (char_length("donations"."note") <= 120),
	CONSTRAINT "donations_pickup_address" CHECK ("donations"."method" <> 'jemput' or coalesce(char_length(trim("donations"."address")), 0) > 0)
);
--> statement-breakpoint
CREATE TABLE "loans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"copy_id" uuid NOT NULL,
	"status" "loan_status" NOT NULL,
	"start_on" date NOT NULL,
	"due_on" date NOT NULL,
	"returned_on" date,
	"extensions" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "loans_dates_order" CHECK ("loans"."due_on" > "loans"."start_on"),
	CONSTRAINT "loans_extensions_range" CHECK ("loans"."extensions" between 0 and 1)
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"user_id" text PRIMARY KEY NOT NULL,
	"nickname" text NOT NULL,
	"gender" "gender" DEFAULT 'perempuan' NOT NULL,
	"avatar_look" jsonb,
	"bio" text DEFAULT '' NOT NULL,
	"phone" text,
	"reading_goal" integer DEFAULT 12 NOT NULL,
	"fav_categories" "category"[] DEFAULT '{}' NOT NULL,
	"notifications" jsonb DEFAULT '{"due":true,"fav":true,"recap":false}'::jsonb NOT NULL,
	"reading_book_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_goal_range" CHECK ("profiles"."reading_goal" between 1 and 365)
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "shelf_items" (
	"user_id" text NOT NULL,
	"book_id" uuid NOT NULL,
	"added_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shelf_items_user_id_book_id_pk" PRIMARY KEY("user_id","book_id")
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "book_copies" ADD CONSTRAINT "book_copies_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "donations" ADD CONSTRAINT "donations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loans" ADD CONSTRAINT "loans_copy_id_book_copies_id_fk" FOREIGN KEY ("copy_id") REFERENCES "public"."book_copies"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_reading_book_id_books_id_fk" FOREIGN KEY ("reading_book_id") REFERENCES "public"."books"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shelf_items" ADD CONSTRAINT "shelf_items_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shelf_items" ADD CONSTRAINT "shelf_items_book_id_books_id_fk" FOREIGN KEY ("book_id") REFERENCES "public"."books"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_user_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "book_copies_book_idx" ON "book_copies" USING btree ("book_id");--> statement-breakpoint
CREATE INDEX "books_category_idx" ON "books" USING btree ("category");--> statement-breakpoint
CREATE INDEX "donations_user_idx" ON "donations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "donations_created_idx" ON "donations" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "loans_one_holder_per_copy" ON "loans" USING btree ("copy_id") WHERE "loans"."status" in ('reserved', 'active');--> statement-breakpoint
CREATE INDEX "loans_user_status_idx" ON "loans" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "loans_due_idx" ON "loans" USING btree ("due_on");--> statement-breakpoint
CREATE INDEX "session_user_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");