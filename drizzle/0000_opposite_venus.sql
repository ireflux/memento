CREATE TYPE "public"."attending" AS ENUM('yes', 'no', 'maybe');--> statement-breakpoint
CREATE TYPE "public"."blessing_status" AS ENUM('visible', 'hidden');--> statement-breakpoint
CREATE TYPE "public"."invitation_status" AS ENUM('draft', 'published', 'closed');--> statement-breakpoint
CREATE TYPE "public"."layout_type" AS ENUM('flip', 'long', 'poster');--> statement-breakpoint
CREATE TYPE "public"."scene_type" AS ENUM('wedding', 'birthday');--> statement-breakpoint
CREATE TABLE "blessings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invitation_id" uuid NOT NULL,
	"guest_name" text NOT NULL,
	"content" text NOT NULL,
	"status" "blessing_status" DEFAULT 'visible' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invitations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"scene_type" "scene_type" NOT NULL,
	"template_id" text NOT NULL,
	"layout" "layout_type" NOT NULL,
	"status" "invitation_status" DEFAULT 'draft' NOT NULL,
	"manage_code" text NOT NULL,
	"content" jsonb NOT NULL,
	"view_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"published_at" timestamp with time zone,
	CONSTRAINT "invitations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invitation_id" uuid NOT NULL,
	"url" text NOT NULL,
	"mime" text NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rsvps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invitation_id" uuid NOT NULL,
	"guest_name" text NOT NULL,
	"phone" text,
	"attending" "attending" NOT NULL,
	"party_size" integer DEFAULT 1 NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "blessings" ADD CONSTRAINT "blessings_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rsvps" ADD CONSTRAINT "rsvps_invitation_id_invitations_id_fk" FOREIGN KEY ("invitation_id") REFERENCES "public"."invitations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "blessings_invitation_idx" ON "blessings" USING btree ("invitation_id");--> statement-breakpoint
CREATE INDEX "invitations_template_idx" ON "invitations" USING btree ("template_id");--> statement-breakpoint
CREATE INDEX "media_assets_invitation_idx" ON "media_assets" USING btree ("invitation_id");--> statement-breakpoint
CREATE INDEX "rsvps_invitation_idx" ON "rsvps" USING btree ("invitation_id");