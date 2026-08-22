import { z } from "zod";
import { LIMITS } from "@/lib/constants";

const dateTimeString = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "无效的时间格式");

export const sceneTypeEnum = z.enum(["wedding", "birthday"]);
export type SceneType = z.infer<typeof sceneTypeEnum>;

export const layoutEnum = z.enum(["flip", "long", "poster"]);
export type LayoutType = z.infer<typeof layoutEnum>;

export const weddingInfoSchema = z.object({
  groomName: z.string().min(1).max(20),
  brideName: z.string().min(1).max(20),
  eventTime: dateTimeString,
  venueName: z.string().max(50),
  venueAddress: z.string().max(100),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  story: z.string().max(600).optional(),
  musicId: z.string().max(40).optional(),
});

export const birthdayInfoSchema = z.object({
  celebrantName: z.string().min(1).max(20),
  eventTime: dateTimeString,
  venueName: z.string().max(50),
  venueAddress: z.string().max(100),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  wish: z.string().max(600).optional(),
  musicId: z.string().max(40).optional(),
});

export type WeddingInfo = z.infer<typeof weddingInfoSchema>;
export type BirthdayInfo = z.infer<typeof birthdayInfoSchema>;

const galleryImageSchema = z.object({
  url: z.string().url(),
  caption: z.string().max(30).optional(),
});
export type GalleryImage = z.infer<typeof galleryImageSchema>;

export const blockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("cover"),
    heroImageUrl: z.string().url().optional(),
    subtitle: z.string().max(40).optional(),
  }),
  z.object({
    type: z.literal("gallery"),
    images: z.array(galleryImageSchema).max(LIMITS.maxImagesPerGallery),
  }),
  z.object({
    type: z.literal("countdown"),
    label: z.string().max(20).optional(),
  }),
  z.object({ type: z.literal("map") }),
  z.object({
    type: z.literal("story"),
    heading: z.string().max(20).optional(),
    body: z.string().min(1).max(600),
  }),
  z.object({
    type: z.literal("text"),
    heading: z.string().max(20).optional(),
    body: z.string().min(1).max(300),
  }),
  z.object({
    type: z.literal("rsvp-form"),
    note: z.string().max(40).optional(),
  }),
  z.object({
    type: z.literal("blessing-wall"),
    title: z.string().max(20).optional(),
  }),
]);
export type Block = z.infer<typeof blockSchema>;
export type BlockType = Block["type"];

const baseContent = {
  pages: z.array(blockSchema).max(LIMITS.maxPages),
};

export const weddingContentSchema = z.object({
  ...baseContent,
  info: weddingInfoSchema,
});

export const birthdayContentSchema = z.object({
  ...baseContent,
  info: birthdayInfoSchema,
});

export type WeddingContent = z.infer<typeof weddingContentSchema>;
export type BirthdayContent = z.infer<typeof birthdayContentSchema>;

function buildContentSchema(scene: SceneType) {
  return scene === "wedding" ? weddingContentSchema : birthdayContentSchema;
}

export function parseContent(scene: "wedding", data: unknown): WeddingContent;
export function parseContent(scene: "birthday", data: unknown): BirthdayContent;
export function parseContent(scene: SceneType, data: unknown) {
  return buildContentSchema(scene).parse(data);
}

export function safeParseContent(scene: SceneType, data: unknown) {
  return buildContentSchema(scene).safeParse(data);
}

export type InvitationContent = WeddingContent | BirthdayContent;

export const rsvpInputSchema = z.object({
  guestName: z.string().trim().min(1).max(LIMITS.guestNameMax),
  phone: z
    .string()
    .regex(/^[0-9+\-\s]{5,20}$/)
    .optional()
    .or(z.literal("")),
  attending: z.enum(["yes", "no", "maybe"]),
  partySize: z.coerce.number().int().min(1).max(20).default(1),
  note: z.string().trim().max(LIMITS.rsvpNoteMax).optional().or(z.literal("")),
});
export type RsvpInput = z.infer<typeof rsvpInputSchema>;

export const blessingInputSchema = z.object({
  guestName: z.string().trim().min(1).max(LIMITS.guestNameMax),
  content: z.string().trim().min(1).max(LIMITS.blessingMax),
});
export type BlessingInput = z.infer<typeof blessingInputSchema>;

export const createInvitationInputSchema = z.object({
  templateId: z.string().min(1).max(60),
});

export const verifyCodeInputSchema = z.object({
  slug: z.string().min(4).max(16),
  code: z.string().min(4).max(12),
});

export function countImages(content: InvitationContent): number {
  let n = 0;
  for (const page of content.pages) {
    if (page.type === "gallery") n += page.images.length;
    if (page.type === "cover" && page.heroImageUrl) n += 1;
  }
  return n;
}
