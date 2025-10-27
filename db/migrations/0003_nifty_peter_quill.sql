CREATE TABLE "learning_metrics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"material_id" uuid NOT NULL,
	"sections_completed" integer DEFAULT 0 NOT NULL,
	"sections_total" integer DEFAULT 0 NOT NULL,
	"achievement_rate" numeric(5, 2) DEFAULT '0' NOT NULL,
	"repetition_count" integer DEFAULT 0 NOT NULL,
	"repetition_index" numeric(5, 2) DEFAULT '0' NOT NULL,
	"target_tempo" integer NOT NULL,
	"achieved_tempo" integer DEFAULT 0 NOT NULL,
	"tempo_achievement" numeric(5, 2) DEFAULT '0' NOT NULL,
	"weak_spots" jsonb,
	"total_practice_time" integer DEFAULT 0 NOT NULL,
	"last_practiced_at" timestamp,
	"instrument" text,
	"session_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "learning_metrics" ADD CONSTRAINT "learning_metrics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "learning_metrics" ADD CONSTRAINT "learning_metrics_material_id_materials_id_fk" FOREIGN KEY ("material_id") REFERENCES "public"."materials"("id") ON DELETE no action ON UPDATE no action;