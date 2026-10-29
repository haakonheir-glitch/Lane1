CREATE TABLE "career_resonance" (
	"user_id" uuid NOT NULL,
	"lane_id" text NOT NULL,
	"matching_version" text NOT NULL,
	"rank" integer NOT NULL,
	"response" text NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "career_resonance_user_id_lane_id_matching_version_pk" PRIMARY KEY("user_id","lane_id","matching_version")
);
--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "current_satisfaction" integer;--> statement-breakpoint
ALTER TABLE "profiles" ADD COLUMN "previous_jobs" jsonb;--> statement-breakpoint
ALTER TABLE "career_resonance" ADD CONSTRAINT "career_resonance_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;