ALTER TABLE "blessings" DROP CONSTRAINT "blessings_invitation_id_invitations_id_fk";
--> statement-breakpoint
ALTER TABLE "media_assets" DROP CONSTRAINT "media_assets_invitation_id_invitations_id_fk";
--> statement-breakpoint
ALTER TABLE "rsvps" DROP CONSTRAINT "rsvps_invitation_id_invitations_id_fk";
