CREATE TYPE "public"."dial_credit_action" AS ENUM('purchase', 'consume', 'refund');--> statement-breakpoint
CREATE TYPE "public"."dial_mode" AS ENUM('omakase', 'dialogue');--> statement-breakpoint
CREATE TYPE "public"."dial_purchase_status" AS ENUM('pending', 'completed', 'failed', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."dial_purchase_type" AS ENUM('omakase', 'dialogue', 'dialogue_mastering', 'fx_sheet');--> statement-breakpoint
CREATE TYPE "public"."dial_session_status" AS ENUM('uploading', 'previewing', 'mixing', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."dial_sub_tier" AS ENUM('monthly_5', 'studio_15');--> statement-breakpoint
CREATE TYPE "public"."dial_task_status" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."dial_task_type" AS ENUM('preview', 'final_basic', 'final_advanced', 'mastering');--> statement-breakpoint
CREATE TABLE "cognitive_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"wm_score" integer,
	"wm_raw_data" jsonb,
	"ps_score" integer,
	"ps_raw_data" jsonb,
	"vc_score" integer,
	"vc_raw_data" jsonb,
	"pr_score" integer,
	"pr_raw_data" jsonb,
	"att_score" integer,
	"att_raw_data" jsonb,
	"vc_pr_balance" numeric(3, 2),
	"significant_patterns" text[],
	"prompt_params" jsonb,
	"measured_at" timestamp with time zone DEFAULT now(),
	"version" integer DEFAULT 1
);
--> statement-breakpoint
CREATE TABLE "hoo_configurations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"preset_name" text,
	"custom_prompt" text,
	"variables" jsonb DEFAULT '{}'::jsonb,
	"snippets" text[],
	"special_instructions" text[],
	"is_active" boolean DEFAULT true,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "measurement_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"game_type" text NOT NULL,
	"raw_data" jsonb NOT NULL,
	"calculated_score" jsonb,
	"measured_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "dial_credit_ledger" (
	"id" serial PRIMARY KEY NOT NULL,
	"action" "dial_credit_action" NOT NULL,
	"credits" integer NOT NULL,
	"balance_after" integer NOT NULL,
	"task_id" uuid,
	"note" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dial_fx_sheets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"sheet_data" jsonb NOT NULL,
	"stripe_payment_id" text,
	"purchased_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "dial_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"parameter_changes" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dial_purchases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" text,
	"guest_email" text,
	"purchase_type" "dial_purchase_type" NOT NULL,
	"status" "dial_purchase_status" DEFAULT 'pending' NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" text DEFAULT 'usd' NOT NULL,
	"stripe_checkout_session_id" text,
	"stripe_payment_intent_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "dial_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"mode" "dial_mode" NOT NULL,
	"status" "dial_session_status" DEFAULT 'uploading' NOT NULL,
	"musical_style" text NOT NULL,
	"title" text,
	"guest_email" text,
	"guest_token" text,
	"guest_token_expires_at" timestamp,
	"stripe_checkout_session_id" text,
	"payment_status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "dial_sessions_guest_token_unique" UNIQUE("guest_token")
);
--> statement-breakpoint
CREATE TABLE "dial_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"tier" "dial_sub_tier" NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"stripe_subscription_id" text,
	"stripe_customer_id" text,
	"mix_credits_remaining" integer NOT NULL,
	"mix_credits_total" integer NOT NULL,
	"current_period_start" timestamp,
	"current_period_end" timestamp,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dial_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"roex_task_id" text NOT NULL,
	"task_type" "dial_task_type" NOT NULL,
	"status" "dial_task_status" DEFAULT 'pending' NOT NULL,
	"credits_consumed" integer,
	"preview_url" text,
	"final_url" text,
	"fx_settings" jsonb,
	"stems_urls" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "dial_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"original_filename" text NOT NULL,
	"roex_upload_url" text NOT NULL,
	"instrument_group" text NOT NULL,
	"presence_setting" text DEFAULT 'NORMAL' NOT NULL,
	"pan_preference" text DEFAULT 'NO_PREFERENCE' NOT NULL,
	"reverb_preference" text DEFAULT 'NONE' NOT NULL,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "hoo_turns_used" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "trial_started_at" timestamp;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "trial_used" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "trial_turns_used" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "rag_embeddings" ADD COLUMN "embedding" text;--> statement-breakpoint
ALTER TABLE "rag_embeddings" ADD COLUMN "embedding_model" text;--> statement-breakpoint
ALTER TABLE "rag_embeddings" ADD COLUMN "embedding_hash" text;--> statement-breakpoint
ALTER TABLE "rag_embeddings" ADD COLUMN "token_count" integer;--> statement-breakpoint
ALTER TABLE "rag_embeddings" ADD COLUMN "updated_at" timestamp DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "dial_credit_ledger" ADD CONSTRAINT "dial_credit_ledger_task_id_dial_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."dial_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dial_fx_sheets" ADD CONSTRAINT "dial_fx_sheets_task_id_dial_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."dial_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dial_fx_sheets" ADD CONSTRAINT "dial_fx_sheets_session_id_dial_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."dial_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dial_messages" ADD CONSTRAINT "dial_messages_session_id_dial_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."dial_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dial_purchases" ADD CONSTRAINT "dial_purchases_session_id_dial_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."dial_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dial_purchases" ADD CONSTRAINT "dial_purchases_user_id_users_clerk_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("clerk_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dial_sessions" ADD CONSTRAINT "dial_sessions_user_id_users_clerk_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("clerk_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dial_subscriptions" ADD CONSTRAINT "dial_subscriptions_user_id_users_clerk_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("clerk_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dial_tasks" ADD CONSTRAINT "dial_tasks_session_id_dial_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."dial_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "dial_tracks" ADD CONSTRAINT "dial_tracks_session_id_dial_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."dial_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_cognitive_profiles_user_id" ON "cognitive_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_hoo_configurations_user_id" ON "hoo_configurations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_measurement_history_user_id" ON "measurement_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_measurement_history_game_type" ON "measurement_history" USING btree ("game_type");--> statement-breakpoint
CREATE INDEX "idx_dial_credit_ledger_action" ON "dial_credit_ledger" USING btree ("action");--> statement-breakpoint
CREATE INDEX "idx_dial_credit_ledger_created_at" ON "dial_credit_ledger" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_dial_fx_sheets_session_id" ON "dial_fx_sheets" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_dial_fx_sheets_task_id" ON "dial_fx_sheets" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "idx_dial_messages_session_id" ON "dial_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_dial_messages_created_at" ON "dial_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_dial_purchases_session_id" ON "dial_purchases" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_dial_purchases_user_id" ON "dial_purchases" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_dial_purchases_status" ON "dial_purchases" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_dial_sessions_user_id" ON "dial_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_dial_sessions_status" ON "dial_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_dial_sessions_user_status" ON "dial_sessions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_dial_sessions_guest_token" ON "dial_sessions" USING btree ("guest_token");--> statement-breakpoint
CREATE INDEX "idx_dial_subscriptions_user_id" ON "dial_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_dial_subscriptions_status" ON "dial_subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_dial_subscriptions_stripe_sub_id" ON "dial_subscriptions" USING btree ("stripe_subscription_id");--> statement-breakpoint
CREATE INDEX "idx_dial_tasks_session_id" ON "dial_tasks" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_dial_tasks_roex_task_id" ON "dial_tasks" USING btree ("roex_task_id");--> statement-breakpoint
CREATE INDEX "idx_dial_tasks_status" ON "dial_tasks" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_dial_tracks_session_id" ON "dial_tracks" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_rag_embeddings_hash" ON "rag_embeddings" USING btree ("embedding_hash");