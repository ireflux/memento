import { randomBytes } from "node:crypto";
import { count, eq } from "drizzle-orm";
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

/** 通过文件头（magic bytes）识别真实图片类型，不信任客户端声明的 Content-Type。 */
function detectImageMime(b: Uint8Array): string | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (
    b[0] === 0x89 &&
    b[1] === 0x50 &&
    b[2] === 0x4e &&
    b[3] === 0x47 &&
    b[4] === 0x0d &&
    b[5] === 0x0a &&
    b[6] === 0x1a &&
    b[7] === 0x0a
  ) {
    return "image/png";
  }
  if (
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const slug = String(form.get("slug") ?? "");
    if (!/^[A-Za-z0-9]{8}$/.test(slug)) {
      throw new ApiError(400, "bad_request", "参数错误");
    }
    if (!(await hasManageSession(slug))) {
      throw new ApiError(403, "forbidden", "请先输入管理码");
    }

    const file = form.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(400, "bad_request", "缺少文件");
    }
    const declaredMime = file.type;
    const ext = ALLOWED_MIME[declaredMime];
    if (!ext) {
      throw new ApiError(415, "unsupported_media", "仅支持 JPG/PNG/WebP 图片");
    }
    if (file.size > LIMITS.maxImageBytes) {
      throw new ApiError(413, "too_large", "图片过大，请压缩后重试");
    }

    const data = new Uint8Array(await file.arrayBuffer());
    const detected = detectImageMime(data);
    if (!detected || detected !== declaredMime) {
      throw new ApiError(415, "unsupported_media", "图片内容与格式不符");
    }

    // 在产生外部副作用（上传到 ImgBed）之前完成全部校验：
    // 请柬必须真实存在，且登记的媒体数量未超配额
    const inv = await getInvitationBySlug(slug);
    if (!inv) {
      throw new ApiError(404, "not_found", "请柬不存在");
    }
    const [{ n }] = await getDb()
      .select({ n: count() })
      .from(mediaAssets)
      .where(eq(mediaAssets.invitationId, inv.id));
    if (n >= LIMITS.maxMediaAssetsPerInvitation) {
      throw new ApiError(
        429,
        "quota_exceeded",
        `该请柬上传的图片数已达上限（${LIMITS.maxMediaAssetsPerInvitation} 张），请先删除不再使用的照片`,
      );
    }

    const stored = await getStorage().upload({
      data,
      mime: declaredMime,
      fileName: `${Date.now()}_${randomBytes(4).toString("hex")}.${ext}`,
      folder: `memento/${slug}`,
    });

    try {
      await getDb().insert(mediaAssets).values({
        invitationId: inv.id,
        url: stored.url,
        mime: declaredMime,
        sizeBytes: data.byteLength,
      });
    } catch (e) {
      // 登记失败时存储侧已产生孤儿文件：记录日志供后续清理任务处理
      console.error("[upload] media_assets insert failed", stored.url, e);
    }

    return Response.json({ url: stored.url });
  } catch (e) {
    return jsonError(e);
  }
}
