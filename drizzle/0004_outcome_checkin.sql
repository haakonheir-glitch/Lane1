CREATE TABLE "outcome_check_ins" (
	"user_id" uuid NOT NULL,
	"wave" text NOT NULL,
	"lane_id" text,
	"role_id" text,
	"title" text,
	"fulfilment" integer NOT NULL,
	"answered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outcome_check_ins_user_id_wave_pk" PRIMARY KEY("user_id","wave")
);
--> statement-breakpoint
CREATE TABLE "outcome_consents" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"consented_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "outcome_check_ins" ADD CONSTRAINT "outcome_check_ins_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "outcome_consents" ADD CONSTRAINT "outcome_consents_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;