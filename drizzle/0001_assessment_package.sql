CREATE TABLE "assessment_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"session_id" text NOT NULL,
	"attempt" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'in_progress' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"device_class" text,
	"input_type" text,
	"viewport" text,
	"effort" integer,
	"confidence" text,
	"flags" jsonb
);
--> statement-breakpoint
CREATE TABLE "item_responses" (
	"session_row_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"item_id" text NOT NULL,
	"module" text NOT NULL,
	"block_id" text NOT NULL,
	"value" jsonb,
	"skipped" boolean DEFAULT false NOT NULL,
	"rt_ms" integer NOT NULL,
	"device_class" text,
	"input_type" text,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "item_responses_session_row_id_position_pk" PRIMARY KEY("session_row_id","position")
);
--> statement-breakpoint
CREATE TABLE "session_scores" (
	"session_row_id" uuid PRIMARY KEY NOT NULL,
	"scores" jsonb NOT NULL,
	"scored_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_trials" (
	"session_row_id" uuid NOT NULL,
	"task_id" text NOT NULL,
	"attempt" integer NOT NULL,
	"trial_index" integer NOT NULL,
	"practice" boolean DEFAULT false NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_trials_session_row_id_task_id_attempt_trial_index_practice_pk" PRIMARY KEY("session_row_id","task_id","attempt","trial_index","practice")
);
--> statement-breakpoint
DROP TABLE "cognitive_responses" CASCADE;--> statement-breakpoint
DROP TABLE "module_completions" CASCADE;--> statement-breakpoint
DROP TABLE "responses" CASCADE;--> statement-breakpoint
ALTER TABLE "assessment_sessions" ADD CONSTRAINT "assessment_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "item_responses" ADD CONSTRAINT "item_responses_session_row_id_assessment_sessions_id_fk" FOREIGN KEY ("session_row_id") REFERENCES "public"."assessment_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_scores" ADD CONSTRAINT "session_scores_session_row_id_assessment_sessions_id_fk" FOREIGN KEY ("session_row_id") REFERENCES "public"."assessment_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_trials" ADD CONSTRAINT "task_trials_session_row_id_assessment_sessions_id_fk" FOREIGN KEY ("session_row_id") REFERENCES "public"."assessment_sessions"("id") ON DELETE cascade ON UPDATE no action;