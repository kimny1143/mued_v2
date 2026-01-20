CREATE TABLE "hoo_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text,
	"messages" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"model" text DEFAULT 'claude-haiku-4-5-20251001' NOT NULL,
	"provider" text DEFAULT 'claude' NOT NULL,
	"total_input_tokens" integer DEFAULT 0 NOT NULL,
	"total_output_tokens" integer DEFAULT 0 NOT NULL,
	"total_cost_usd" numeric(10, 6) DEFAULT '0' NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"last_message_at" timestamp DEFAULT now() NOT NULL,
	"summary" text,
	"tags" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hoo_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"custom_instructions" text,
	"custom_instructions_enabled" boolean DEFAULT true NOT NULL,
	"auto_memories" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"auto_memory_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hoo_memories_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "subscriptions" ALTER COLUMN "plan" SET DEFAULT 'free';--> statement-breakpoint
ALTER TABLE "subscriptions" ADD COLUMN "hoo_conversations_used" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "hoo_conversations" ADD CONSTRAINT "hoo_conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hoo_memories" ADD CONSTRAINT "hoo_memories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_hoo_conversations_user_id" ON "hoo_conversations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_hoo_conversations_started_at" ON "hoo_conversations" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "idx_hoo_conversations_last_message_at" ON "hoo_conversations" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "idx_hoo_conversations_user_started" ON "hoo_conversations" USING btree ("user_id","started_at");--> statement-breakpoint
CREATE INDEX "idx_hoo_memories_user_id" ON "hoo_memories" USING btree ("user_id");