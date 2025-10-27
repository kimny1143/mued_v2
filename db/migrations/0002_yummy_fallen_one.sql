CREATE TABLE "webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" text NOT NULL,
	"type" text NOT NULL,
	"source" text NOT NULL,
	"processed_at" timestamp DEFAULT now() NOT NULL,
	"payload" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "webhook_events_event_id_unique" UNIQUE("event_id")
);
--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "playability_score" numeric(3, 1);--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "learning_value_score" numeric(3, 1);--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "quality_status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "materials" ADD COLUMN "abc_analysis" jsonb;