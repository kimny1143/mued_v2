CREATE TYPE "public"."webhook_status" AS ENUM('processing', 'processed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."log_type" AS ENUM('lesson', 'practice', 'creation', 'reflection', 'system', 'ear_training', 'structure_analysis');--> statement-breakpoint
CREATE TYPE "public"."target_type" AS ENUM('lesson', 'material', 'ear_exercise', 'form_exercise', 'reservation', 'user_creation');--> statement-breakpoint
CREATE TYPE "public"."interview_depth" AS ENUM('shallow', 'medium', 'deep');--> statement-breakpoint
CREATE TYPE "public"."interview_focus" AS ENUM('harmony', 'melody', 'rhythm', 'mix', 'emotion', 'image', 'structure');--> statement-breakpoint
CREATE TYPE "public"."session_status" AS ENUM('draft', 'interviewing', 'completed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."session_type" AS ENUM('composition', 'practice', 'mix', 'ear_training', 'listening', 'theory', 'other');--> statement-breakpoint
CREATE TYPE "public"."difficulty" AS ENUM('beginner', 'intermediate', 'advanced', 'expert');--> statement-breakpoint
CREATE TYPE "public"."ear_type" AS ENUM('eq', 'balance', 'rhythm', 'pitch', 'dynamics', 'compression', 'reverb', 'distortion', 'modulation');--> statement-breakpoint
CREATE TYPE "public"."instrument" AS ENUM('piano', 'guitar', 'bass', 'drums', 'violin', 'vocal', 'synthesizer', 'orchestral', 'electronic', 'mixed');--> statement-breakpoint
CREATE TYPE "public"."form_problem_type" AS ENUM('section_order', 'section_identification', 'chord_function', 'chord_progression', 'pattern_recognition', 'structure_analysis', 'arrangement_comparison', 'form_type', 'modulation_detection', 'cadence_identification');--> statement-breakpoint
CREATE TYPE "public"."music_era" AS ENUM('baroque', 'classical', 'romantic', 'modern', 'contemporary', 'jazz_early', 'jazz_modern', 'popular', 'electronic');--> statement-breakpoint
CREATE TYPE "public"."section_type" AS ENUM('intro', 'verse', 'pre_chorus', 'chorus', 'bridge', 'instrumental', 'solo', 'breakdown', 'outro', 'interlude', 'coda', 'refrain');--> statement-breakpoint
CREATE TYPE "public"."chat_role" AS ENUM('user', 'assistant', 'system');--> statement-breakpoint
CREATE TYPE "public"."memory_type" AS ENUM('preference', 'pattern', 'feedback', 'knowledge');--> statement-breakpoint
CREATE TYPE "public"."personality_preset" AS ENUM('friendly_mentor', 'professional_coach', 'peer_learner', 'strict_teacher', 'creative_partner');--> statement-breakpoint
CREATE TYPE "public"."response_length" AS ENUM('concise', 'standard', 'detailed');--> statement-breakpoint
CREATE TYPE "public"."acquisition_method" AS ENUM('api_fetch', 'manual_upload', 'ai_generated', 'user_created', 'system_import');--> statement-breakpoint
CREATE TYPE "public"."content_type" AS ENUM('material', 'creation_log', 'generated', 'note_article', 'ai_response');--> statement-breakpoint
CREATE TYPE "public"."license_type" AS ENUM('cc_by', 'cc_by_sa', 'cc_by_nc', 'cc_by_nc_sa', 'proprietary', 'mit', 'apache_2_0', 'all_rights_reserved', 'public_domain');--> statement-breakpoint
CREATE TYPE "public"."muednote_mobile_session_status" AS ENUM('active', 'completed', 'synced');--> statement-breakpoint
CREATE TYPE "public"."muednote_daw_action" AS ENUM('parameter_change', 'track_volume', 'track_pan', 'track_select', 'clip_trigger');--> statement-breakpoint
CREATE TYPE "public"."muednote_daw_type" AS ENUM('ableton', 'protools', 'logic', 'other');--> statement-breakpoint
CREATE TABLE "log_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "log_type" NOT NULL,
	"target_id" uuid,
	"target_type" "target_type",
	"content" text NOT NULL,
	"ai_summary" jsonb,
	"tags" jsonb,
	"difficulty" text,
	"emotion" text,
	"attachments" jsonb,
	"is_public" boolean DEFAULT false NOT NULL,
	"share_with_mentor" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_answers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"question_id" uuid NOT NULL,
	"text" text NOT NULL,
	"ai_insights" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interview_questions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"text" text NOT NULL,
	"focus" "interview_focus" NOT NULL,
	"depth" "interview_depth" NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"generated_by" text DEFAULT 'ai',
	"template_id" text,
	"rag_context" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session_analyses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"analysis_data" jsonb NOT NULL,
	"analysis_version" text DEFAULT 'mvp-1.0' NOT NULL,
	"confidence" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "session_analyses_session_id_unique" UNIQUE("session_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"type" "session_type" NOT NULL,
	"status" "session_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"project_id" uuid,
	"project_name" text,
	"user_short_note" text NOT NULL,
	"daw_meta" jsonb,
	"ai_annotations" jsonb,
	"attachments" jsonb DEFAULT '[]'::jsonb,
	"is_public" boolean DEFAULT false NOT NULL,
	"share_with_mentor" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"completed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "question_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"focus" "interview_focus" NOT NULL,
	"depth" "interview_depth" NOT NULL,
	"template_text" text NOT NULL,
	"variables" jsonb DEFAULT '{}'::jsonb,
	"category" text,
	"language" varchar(10) DEFAULT 'ja' NOT NULL,
	"tags" text[] DEFAULT '{}',
	"priority" integer DEFAULT 50 NOT NULL,
	"usage_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rag_embeddings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source_type" text NOT NULL,
	"source_id" uuid NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ear_exercise_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"user_answer" text NOT NULL,
	"is_correct" boolean NOT NULL,
	"time_spent_seconds" integer,
	"hints_used" integer DEFAULT 0 NOT NULL,
	"audio_play_count" jsonb,
	"confidence" integer,
	"perceived_difficulty" integer,
	"notes" text,
	"device_type" text,
	"audio_device" text,
	"listening_environment" text,
	"attempted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ear_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "ear_type" NOT NULL,
	"audio_a_url" text NOT NULL,
	"audio_b_url" text NOT NULL,
	"reference_url" text,
	"waveform_data_url" text,
	"difference_metadata" jsonb NOT NULL,
	"correct_answer" text NOT NULL,
	"explanation" text,
	"hints" jsonb,
	"difficulty" "difficulty" NOT NULL,
	"tags" jsonb,
	"instrument" "instrument",
	"genre" text,
	"bpm" integer,
	"total_attempts" integer DEFAULT 0 NOT NULL,
	"correct_attempts" integer DEFAULT 0 NOT NULL,
	"average_time_seconds" integer,
	"user_rating" numeric(3, 2),
	"is_public" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ear_training_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"total_exercises_attempted" integer DEFAULT 0 NOT NULL,
	"total_correct" integer DEFAULT 0 NOT NULL,
	"current_streak" integer DEFAULT 0 NOT NULL,
	"longest_streak" integer DEFAULT 0 NOT NULL,
	"skill_levels" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"preferred_difficulty" "difficulty",
	"average_session_minutes" integer,
	"most_practiced_type" "ear_type",
	"weakest_area" "ear_type",
	"achievements" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"last_practice_date" timestamp,
	"next_recommended_exercise_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "ear_training_progress_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "form_exercise_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"exercise_id" uuid NOT NULL,
	"user_answer" jsonb NOT NULL,
	"is_correct" boolean NOT NULL,
	"partial_credit" numeric(3, 2),
	"time_spent_seconds" integer,
	"hints_used" integer DEFAULT 0 NOT NULL,
	"audio_playbacks" integer DEFAULT 0,
	"section_replays" jsonb,
	"tools_used" jsonb,
	"confidence" integer,
	"perceived_difficulty" integer,
	"notes" text,
	"mistake_analysis" jsonb,
	"attempted_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_exercises" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"creator_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"composer" text,
	"piece_title" text,
	"audio_url" text,
	"midi_url" text,
	"score_url" text,
	"music_xml_url" text,
	"waveform_data_url" text,
	"spectrogram_url" text,
	"structure_annotations" jsonb NOT NULL,
	"problem_type" "form_problem_type" NOT NULL,
	"question" text NOT NULL,
	"instructions" text,
	"options" jsonb,
	"correct_answer" jsonb NOT NULL,
	"explanation" text,
	"hints" jsonb,
	"difficulty" "difficulty" NOT NULL,
	"tags" jsonb,
	"genre" text,
	"era" "music_era",
	"instrumental_forces" text,
	"duration" integer,
	"total_attempts" integer DEFAULT 0 NOT NULL,
	"correct_attempts" integer DEFAULT 0 NOT NULL,
	"average_time_seconds" integer,
	"user_rating" numeric(3, 2),
	"ai_analysis" jsonb,
	"is_public" boolean DEFAULT true NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "structure_training_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"total_exercises_attempted" integer DEFAULT 0 NOT NULL,
	"total_correct" integer DEFAULT 0 NOT NULL,
	"average_partial_credit" numeric(3, 2),
	"skill_levels" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"preferred_genres" jsonb DEFAULT '[]'::jsonb,
	"preferred_eras" jsonb DEFAULT '[]'::jsonb,
	"strongest_areas" jsonb DEFAULT '[]'::jsonb,
	"areas_for_improvement" jsonb DEFAULT '[]'::jsonb,
	"average_analysis_time" integer,
	"preferred_tools" jsonb DEFAULT '[]'::jsonb,
	"learning_path" jsonb DEFAULT '[]'::jsonb,
	"certificates_earned" jsonb DEFAULT '[]'::jsonb,
	"milestones" jsonb DEFAULT '[]'::jsonb,
	"last_practice_date" timestamp,
	"next_recommended_exercise_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "structure_training_progress_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "chat_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "chat_role" NOT NULL,
	"content" text NOT NULL,
	"processed_content" text,
	"tags" jsonb DEFAULT '[]'::jsonb,
	"metadata" jsonb,
	"parent_message_id" uuid,
	"is_edited" boolean DEFAULT false NOT NULL,
	"edited_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "chat_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text,
	"summary" jsonb,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_pinned" boolean DEFAULT false NOT NULL,
	"message_count" integer DEFAULT 0 NOT NULL,
	"last_message_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"archived_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "session_tags" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"tag" text NOT NULL,
	"frequency" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_ai_memories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"memory_type" "memory_type" NOT NULL,
	"key" text NOT NULL,
	"value" jsonb NOT NULL,
	"confidence" numeric(3, 2) DEFAULT '0.50' NOT NULL,
	"frequency" integer DEFAULT 1 NOT NULL,
	"last_accessed" timestamp,
	"expires_at" timestamp,
	"is_active" boolean DEFAULT true NOT NULL,
	"source_session_id" uuid,
	"source_message_id" uuid,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_ai_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"personality_preset" "personality_preset" DEFAULT 'friendly_mentor' NOT NULL,
	"response_length" "response_length" DEFAULT 'standard' NOT NULL,
	"formality_level" integer DEFAULT 3 NOT NULL,
	"question_frequency" integer DEFAULT 3 NOT NULL,
	"suggestion_frequency" integer DEFAULT 3 NOT NULL,
	"encouragement_level" integer DEFAULT 3 NOT NULL,
	"custom_preferences" jsonb,
	"total_interactions" integer DEFAULT 0 NOT NULL,
	"last_interaction_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_ai_profiles_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "ai_dialogue_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" uuid NOT NULL,
	"query" text NOT NULL,
	"response" text NOT NULL,
	"model_used" varchar(100) NOT NULL,
	"citations" jsonb,
	"latency_ms" integer,
	"token_cost_jpy" numeric(8, 2),
	"citation_rate" numeric(5, 2),
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"total_tokens" integer,
	"relevance_score" numeric(3, 2),
	"user_feedback" integer,
	"context_window_size" integer,
	"temperature" numeric(3, 2),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plugin_registry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"source" varchar(50) NOT NULL,
	"capabilities" jsonb NOT NULL,
	"config" jsonb,
	"api_endpoint" text,
	"api_key_env_var" varchar(100),
	"enabled" boolean DEFAULT true,
	"version" varchar(20) NOT NULL,
	"last_health_check" timestamp,
	"health_status" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "plugin_registry_name_unique" UNIQUE("name"),
	CONSTRAINT "plugin_registry_source_unique" UNIQUE("source")
);
--> statement-breakpoint
CREATE TABLE "provenance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"content_id" uuid NOT NULL,
	"content_type" "content_type" NOT NULL,
	"source_uri" text,
	"license_type" "license_type",
	"acquisition_method" "acquisition_method",
	"rights_holder" text,
	"permission_flag" boolean DEFAULT false,
	"hash_c2pa" text,
	"hash_sha256" text,
	"retention_years" integer,
	"access_policy" jsonb,
	"external_share_consent" boolean DEFAULT false,
	"acquired_by" uuid,
	"acquired_at" timestamp,
	"last_verified_at" timestamp,
	"verification_status" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rag_metrics_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"date" timestamp NOT NULL,
	"citation_rate" numeric(5, 2),
	"citation_count" integer,
	"unique_sources_count" integer,
	"latency_p50_ms" integer,
	"latency_p95_ms" integer,
	"latency_p99_ms" integer,
	"cost_per_answer" numeric(6, 2),
	"total_cost" numeric(10, 2),
	"total_queries" integer,
	"unique_users" integer,
	"average_tokens_per_query" integer,
	"average_relevance_score" numeric(3, 2),
	"positive_votes_rate" numeric(5, 2),
	"slo_compliance" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "muednote_mobile_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"timestamp_sec" real NOT NULL,
	"text" text NOT NULL,
	"confidence" real,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "muednote_mobile_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"duration_sec" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"device_id" text,
	"session_memo" text,
	"status" "muednote_mobile_session_status" DEFAULT 'completed',
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "muednote_daw_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"session_id" uuid,
	"ts" timestamp with time zone NOT NULL,
	"daw" "muednote_daw_type" DEFAULT 'ableton' NOT NULL,
	"action" "muednote_daw_action" DEFAULT 'parameter_change' NOT NULL,
	"track_id" integer NOT NULL,
	"device_id" integer NOT NULL,
	"param_id" integer NOT NULL,
	"value" real NOT NULL,
	"value_string" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "webhook_events" ADD COLUMN "status" "webhook_status" DEFAULT 'processing' NOT NULL;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD COLUMN "completed_at" timestamp;--> statement-breakpoint
ALTER TABLE "webhook_events" ADD COLUMN "error_message" text;--> statement-breakpoint
ALTER TABLE "muednote_mobile_logs" ADD CONSTRAINT "muednote_mobile_logs_session_id_muednote_mobile_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."muednote_mobile_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_log_entries_user" ON "log_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_log_entries_type" ON "log_entries" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_log_entries_target" ON "log_entries" USING btree ("target_id","target_type");--> statement-breakpoint
CREATE INDEX "idx_log_entries_created_at" ON "log_entries" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_log_entries_user_created" ON "log_entries" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_log_entries_public" ON "log_entries" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "idx_interview_answers_session" ON "interview_answers" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_interview_answers_question" ON "interview_answers" USING btree ("question_id");--> statement-breakpoint
CREATE INDEX "idx_interview_answers_session_question" ON "interview_answers" USING btree ("session_id","question_id");--> statement-breakpoint
CREATE INDEX "idx_interview_questions_session" ON "interview_questions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_interview_questions_session_order" ON "interview_questions" USING btree ("session_id","order");--> statement-breakpoint
CREATE INDEX "idx_interview_questions_focus" ON "interview_questions" USING btree ("focus");--> statement-breakpoint
CREATE INDEX "idx_session_analyses_session" ON "session_analyses" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_user" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_type" ON "sessions" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_sessions_status" ON "sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_sessions_user_created" ON "sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_sessions_user_status" ON "sessions" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "idx_sessions_public" ON "sessions" USING btree ("is_public");--> statement-breakpoint
CREATE INDEX "idx_sessions_project" ON "sessions" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_question_templates_focus_depth" ON "question_templates" USING btree ("focus","depth","priority");--> statement-breakpoint
CREATE INDEX "idx_question_templates_priority" ON "question_templates" USING btree ("priority","created_at");--> statement-breakpoint
CREATE INDEX "idx_question_templates_category" ON "question_templates" USING btree ("category","focus");--> statement-breakpoint
CREATE INDEX "idx_question_templates_analytics" ON "question_templates" USING btree ("usage_count","last_used_at");--> statement-breakpoint
CREATE INDEX "idx_rag_embeddings_source" ON "rag_embeddings" USING btree ("source_type","source_id");--> statement-breakpoint
CREATE INDEX "idx_ear_attempts_user" ON "ear_exercise_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ear_attempts_exercise" ON "ear_exercise_attempts" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "idx_ear_attempts_user_exercise" ON "ear_exercise_attempts" USING btree ("user_id","exercise_id");--> statement-breakpoint
CREATE INDEX "idx_ear_attempts_attempted_at" ON "ear_exercise_attempts" USING btree ("attempted_at");--> statement-breakpoint
CREATE INDEX "idx_ear_attempts_correct" ON "ear_exercise_attempts" USING btree ("is_correct");--> statement-breakpoint
CREATE INDEX "idx_ear_exercises_creator" ON "ear_exercises" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "idx_ear_exercises_type" ON "ear_exercises" USING btree ("type");--> statement-breakpoint
CREATE INDEX "idx_ear_exercises_difficulty" ON "ear_exercises" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "idx_ear_exercises_instrument" ON "ear_exercises" USING btree ("instrument");--> statement-breakpoint
CREATE INDEX "idx_ear_exercises_public_active" ON "ear_exercises" USING btree ("is_public","is_active");--> statement-breakpoint
CREATE INDEX "idx_ear_exercises_created_at" ON "ear_exercises" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ear_progress_user" ON "ear_training_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ear_progress_last_practice" ON "ear_training_progress" USING btree ("last_practice_date");--> statement-breakpoint
CREATE INDEX "idx_form_attempts_user" ON "form_exercise_attempts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_form_attempts_exercise" ON "form_exercise_attempts" USING btree ("exercise_id");--> statement-breakpoint
CREATE INDEX "idx_form_attempts_user_exercise" ON "form_exercise_attempts" USING btree ("user_id","exercise_id");--> statement-breakpoint
CREATE INDEX "idx_form_attempts_attempted_at" ON "form_exercise_attempts" USING btree ("attempted_at");--> statement-breakpoint
CREATE INDEX "idx_form_attempts_correct" ON "form_exercise_attempts" USING btree ("is_correct");--> statement-breakpoint
CREATE INDEX "idx_form_exercises_creator" ON "form_exercises" USING btree ("creator_id");--> statement-breakpoint
CREATE INDEX "idx_form_exercises_problem_type" ON "form_exercises" USING btree ("problem_type");--> statement-breakpoint
CREATE INDEX "idx_form_exercises_difficulty" ON "form_exercises" USING btree ("difficulty");--> statement-breakpoint
CREATE INDEX "idx_form_exercises_era" ON "form_exercises" USING btree ("era");--> statement-breakpoint
CREATE INDEX "idx_form_exercises_genre" ON "form_exercises" USING btree ("genre");--> statement-breakpoint
CREATE INDEX "idx_form_exercises_public_active" ON "form_exercises" USING btree ("is_public","is_active");--> statement-breakpoint
CREATE INDEX "idx_form_exercises_created_at" ON "form_exercises" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_structure_progress_user" ON "structure_training_progress" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_structure_progress_last_practice" ON "structure_training_progress" USING btree ("last_practice_date");--> statement-breakpoint
CREATE INDEX "idx_chat_messages_session" ON "chat_messages" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_chat_messages_user" ON "chat_messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_chat_messages_created" ON "chat_messages" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_chat_messages_session_created" ON "chat_messages" USING btree ("session_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_chat_messages_tags_gin" ON "chat_messages" USING gin ("tags");--> statement-breakpoint
CREATE INDEX "idx_chat_sessions_user" ON "chat_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_chat_sessions_active" ON "chat_sessions" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_chat_sessions_pinned" ON "chat_sessions" USING btree ("is_pinned");--> statement-breakpoint
CREATE INDEX "idx_chat_sessions_last_message" ON "chat_sessions" USING btree ("last_message_at");--> statement-breakpoint
CREATE INDEX "idx_chat_sessions_user_active" ON "chat_sessions" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_session_tags_unique" ON "session_tags" USING btree ("session_id","tag");--> statement-breakpoint
CREATE INDEX "idx_session_tags_tag" ON "session_tags" USING btree ("tag");--> statement-breakpoint
CREATE INDEX "idx_user_ai_memories_user_type" ON "user_ai_memories" USING btree ("user_id","memory_type");--> statement-breakpoint
CREATE INDEX "idx_user_ai_memories_confidence" ON "user_ai_memories" USING btree ("confidence");--> statement-breakpoint
CREATE INDEX "idx_user_ai_memories_active" ON "user_ai_memories" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "idx_user_ai_memories_expires" ON "user_ai_memories" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_ai_memories_user_key" ON "user_ai_memories" USING btree ("user_id","memory_type","key");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_user_ai_profiles_user_unique" ON "user_ai_profiles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ai_dialogue_user" ON "ai_dialogue_log" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ai_dialogue_session" ON "ai_dialogue_log" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_ai_dialogue_created_at" ON "ai_dialogue_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ai_dialogue_citation_rate" ON "ai_dialogue_log" USING btree ("citation_rate");--> statement-breakpoint
CREATE INDEX "idx_plugin_name" ON "plugin_registry" USING btree ("name");--> statement-breakpoint
CREATE INDEX "idx_plugin_enabled" ON "plugin_registry" USING btree ("enabled");--> statement-breakpoint
CREATE INDEX "idx_provenance_content" ON "provenance" USING btree ("content_id","content_type");--> statement-breakpoint
CREATE INDEX "idx_provenance_source" ON "provenance" USING btree ("source_uri");--> statement-breakpoint
CREATE INDEX "idx_provenance_license" ON "provenance" USING btree ("license_type");--> statement-breakpoint
CREATE INDEX "idx_provenance_retention" ON "provenance" USING btree ("retention_years");--> statement-breakpoint
CREATE INDEX "idx_rag_metrics_date" ON "rag_metrics_history" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_rag_metrics_compliance" ON "rag_metrics_history" USING btree ("slo_compliance");--> statement-breakpoint
CREATE INDEX "idx_muednote_mobile_logs_session" ON "muednote_mobile_logs" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_muednote_mobile_logs_session_timestamp" ON "muednote_mobile_logs" USING btree ("session_id","timestamp_sec");--> statement-breakpoint
CREATE INDEX "idx_muednote_mobile_sessions_user" ON "muednote_mobile_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_muednote_mobile_sessions_user_created" ON "muednote_mobile_sessions" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_muednote_daw_logs_user_ts" ON "muednote_daw_logs" USING btree ("user_id","ts");--> statement-breakpoint
CREATE INDEX "idx_muednote_daw_logs_session" ON "muednote_daw_logs" USING btree ("session_id","ts");--> statement-breakpoint
CREATE INDEX "idx_learning_metrics_user_created" ON "learning_metrics" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_lesson_slots_start_status" ON "lesson_slots" USING btree ("start_time","status");--> statement-breakpoint
CREATE INDEX "idx_reservations_mentor_status_payment" ON "reservations" USING btree ("mentor_id","status","payment_status");--> statement-breakpoint
CREATE INDEX "idx_webhook_events_status" ON "webhook_events" USING btree ("status");