export const LIMITS = {
  contentBytes: 256 * 1024,
  maxPages: 12,
  maxImagesPerGallery: 30,
  maxImageBytes: 5 * 1024 * 1024,
  guestNameMax: 20,
  blessingMax: 200,
  rsvpNoteMax: 100,
  manageCodeLength: 6,
  slugLength: 8,
} as const;

export const MANAGE_COOKIE_PREFIX = "mng_";
export const MANAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
