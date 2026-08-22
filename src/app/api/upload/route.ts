import { randomBytes } from "node:crypto";
import { hasManageSession } from "@/lib/auth";
import { ApiError, jsonError } from "@/lib/api";
import { LIMITS } from "@/lib/constants";
import { getDb } from "@/lib/db";
import { mediaAssets } from "@/lib/db/schema";
import { getInvitationBySlug } from "@/lib/queries";
import { getStorage } from "@/lib/storage";

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const slug = String(form.get("slug") ?? "");
    if (!/^[A-Za-z0-9]{4,16}$/.test(slug)) {
      throw new ApiError(400, "bad_request", "参数错误");
    }
    if (!(await hasManageSession(slug))) {
      throw new ApiError(403, "forbidden", "请先输入管理码");
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(400, "bad_request", "缺少文件");
    }
    const ext = ALLOWED_MIME[file.type];
    if (!ext) {
      throw new ApiError(415, "unsupported_media", "仅支持 JPG/PNG/WebP 图片");
    }
    if (file.size > LIMITS.maxImageBytes) {
      throw new ApiError(413, "too_large", "图片过大，请压缩后重试");
    }

    const data = new Uint8Array(await file.arrayBuffer());
    const stored = await getStorage().upload({
      data,
      mime: file.type,
      fileName: `${Date.now()}_${randomBytes(4).toString("hex")}.${ext}`,
      folder: `memento/${slug}`,
    });

    const inv = await getInvitationBySlug(slug);
    if (inv) {
      await getDb().insert(mediaAssets).values({
        invitationId: inv.id,
        url: stored.url,
        mime: file.type,
        sizeBytes: data.byteLength,
      });
    }

    return Response.json({ url: stored.url });
  } catch (e) {
    return jsonError(e);
  }
}
