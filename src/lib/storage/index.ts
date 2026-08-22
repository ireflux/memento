import "server-only";
import { ImgBedProvider } from "./imgbed";
import type { StorageProvider } from "./types";

let cached: StorageProvider | null = null;

export function getStorage(): StorageProvider {
  if (cached) return cached;
  const baseUrl = process.env.IMGBED_BASE_URL;
  const token = process.env.IMGBED_TOKEN;
  if (!baseUrl || !token) {
    throw new Error(
      "IMGBED_BASE_URL / IMGBED_TOKEN are not configured. Fill them in .env.local.",
    );
  }
  cached = new ImgBedProvider(baseUrl.replace(/\/$/, ""), token);
  return cached;
}

export type { StorageProvider, StoredFile } from "./types";
export { StorageError } from "./types";
