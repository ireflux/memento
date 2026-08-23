CREATE TABLE "code_attempts" (
	"slug" text PRIMARY KEY NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"locked_until" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "blessings_invitation_created_idx" ON "blessings" USING btree ("invitation_id","created_at");--> statement-breakpoint
CREATE INDEX "rsvps_invitation_created_idx" ON "rsvps" USING btree ("invitation_id","created_at");