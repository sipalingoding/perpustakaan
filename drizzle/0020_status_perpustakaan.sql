CREATE TABLE "library_status" (
	"id" smallint PRIMARY KEY DEFAULT 1 NOT NULL,
	"closed" boolean DEFAULT false NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "library_status_single_row" CHECK ("library_status"."id" = 1),
	CONSTRAINT "library_status_note_length" CHECK (char_length("library_status"."note") <= 120)
);
--> statement-breakpoint
INSERT INTO "library_status" ("id") VALUES (1) ON CONFLICT DO NOTHING;
