import type { InvitationContent } from "@/lib/validation/schemas";

/**
 * 媒体回收（GC）：保存新内容后，把「已登记但新内容不再引用」的图片
 * 从 media_assets 中注销，从而释放每张请柬的上传配额。
 *
 * 为什么需要它：
 * 1. 主人删掉一张照片后若不释放配额，改几轮照片就永久触顶且无法自救；
 * 2. 批量上传中途失败、或上传后内容还没落库时留下的登记也不会回收 ——
 *    若判据取「旧内容里有、新内容里没有」，就只覆盖已保存过的图片，
 *    而配额泄漏恰恰多来自没保存成功的那一批。
 *
 * 判据必须是「新内容是否还引用」，才能同时兜住上面两种情况。
 *
 * 纯函数（只读入参与 content，不碰数据库），便于单测；删除由调用方执行。
 */

/** 收集内容中引用的全部图片 URL（相册图 + 封面大图）。 */
export function collectImageUrls(content: InvitationContent): Set<string> {
  const urls = new Set<string>();
  // content 来自 jsonb，运行时未必可信（历史数据/迁移），防御性跳过异常形状
  if (!content || !Array.isArray(content.pages)) return urls;
  for (const page of content.pages) {
    if (!page || typeof page !== "object") continue;
    if (page.type === "gallery" && Array.isArray(page.images)) {
      for (const img of page.images) {
        if (img && typeof img.url === "string" && img.url) urls.add(img.url);
      }
    }
    if (page.type === "cover" && typeof page.heroImageUrl === "string") {
      if (page.heroImageUrl) urls.add(page.heroImageUrl);
    }
  }
  return urls;
}

/**
 * 需要注销登记的图片 URL：传入该请柬已登记的全部 URL，返回其中
 * 新内容已不再引用的部分（即孤儿登记）。
 *
 * @param registeredUrls 该请柬 media_assets 中已登记的 URL
 * @param content        本次保存的新内容
 */
export function unreferencedImageUrls(
  registeredUrls: string[],
  content: InvitationContent,
): string[] {
  const referenced = collectImageUrls(content);
  return registeredUrls.filter((url) => !referenced.has(url));
}
