CREATE TYPE "public"."agenda_kind" AS ENUM('tanpa-gadget', 'basa-basi', 'kkn', 'ngopi');--> statement-breakpoint
ALTER TYPE "public"."notification_kind" ADD VALUE 'agenda';--> statement-breakpoint
CREATE TABLE "agenda_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "agenda_kind" NOT NULL,
	"date" date NOT NULL,
	"start_time" time NOT NULL,
	"end_time" time NOT NULL,
	"place" text NOT NULL,
	"capacity" integer,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agenda_events_time_order" CHECK ("agenda_events"."end_time" > "agenda_events"."start_time"),
	CONSTRAINT "agenda_events_capacity_range" CHECK ("agenda_events"."capacity" is null or "agenda_events"."capacity" between 1 and 500),
	CONSTRAINT "agenda_events_note_length" CHECK (char_length("agenda_events"."note") <= 280)
);
--> statement-breakpoint
CREATE TABLE "agenda_photos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "agenda_kind" NOT NULL,
	"file_key" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"caption" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agenda_photos_caption_length" CHECK (char_length("agenda_photos"."caption") <= 140)
);
--> statement-breakpoint
CREATE TABLE "agenda_registrations" (
	"event_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agenda_registrations_event_id_user_id_pk" PRIMARY KEY("event_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "agenda_registrations" ADD CONSTRAINT "agenda_registrations_event_id_agenda_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."agenda_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agenda_registrations" ADD CONSTRAINT "agenda_registrations_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE cascade;--> statement-breakpoint
CREATE INDEX "agenda_events_date_idx" ON "agenda_events" USING btree ("date");--> statement-breakpoint
CREATE INDEX "agenda_photos_kind_idx" ON "agenda_photos" USING btree ("kind","created_at");--> statement-breakpoint
CREATE INDEX "agenda_registrations_user_idx" ON "agenda_registrations" USING btree ("user_id");