import {
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import type { InvitationContent } from "@/lib/validation/schemas";

export const sceneTypeEnum = pgEnum("scene_type", ["wedding", "birthday"]);
export const layoutEnum = pgEnum("layout_type", ["flip", "long", "poster"]);
export const invitationStatusEnum = pgEnum("invitation_status", [
  "draft",
  "published",
  "closed",
]);
export const attendingEnum = pgEnum("attending", ["yes", "no", "maybe"]);
export const blessingStatusEnum = pgEnum("blessing_status", [
  "visible",
  "hidden",
]);

export const invitations = pgTable(
  "invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slug: text("slug").notNull().unique(),
    sceneType: sceneTypeEnum("scene_type").notNull(),
    templateId: text("template_id").notNull(),
    layout: layoutEnum("layout").notNull(),
    status: invitationStatusEnum("status").notNull().default("draft"),
    manageCode: text("manage_code").notNull(),
    content: jsonb("content").$type<InvitationContent>().notNull(),
    viewCount: integer("view_count").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
  (t) => [index("invitations_template_idx").on(t.templateId)],
);

export const mediaAssets = pgTable(
  "media_assets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invitationId: uuid("invitation_id").notNull(),
    url: text("url").notNull(),
    mime: text("mime").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("media_assets_invitation_idx").on(t.invitationId)],
);

export const rsvps = pgTable(
  "rsvps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invitationId: uuid("invitation_id").notNull(),
    guestName: text("guest_name").notNull(),
    phone: text("phone"),
    attending: attendingEnum("attending").notNull(),
    partySize: integer("party_size").notNull().default(1),
    note: text("note"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("rsvps_invitation_idx").on(t.invitationId),
    index("rsvps_invitation_created_idx").on(t.invitationId, t.createdAt),
  ],
);

export const blessings = pgTable(
  "blessings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    invitationId: uuid("invitation_id").notNull(),
    guestName: text("guest_name").notNull(),
    content: text("content").notNull(),
    status: blessingStatusEnum("status").notNull().default("visible"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("blessings_invitation_idx").on(t.invitationId),
    index("blessings_invitation_created_idx").on(
      t.invitationId,
      t.createdAt,
    ),
  ],
);

/** 管理码验证失败计数与锁定（防在线爆破）。验证成功后整行删除。 */
export const codeAttempts = pgTable("code_attempts", {
  slug: text("slug").primaryKey(),
  failedCount: integer("failed_count").notNull().default(0),
  lockedUntil: timestamp("locked_until", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type InvitationRow = typeof invitations.$inferSelect;
export type RsvpRow = typeof rsvps.$inferSelect;
export type BlessingRow = typeof blessings.$inferSelect;
