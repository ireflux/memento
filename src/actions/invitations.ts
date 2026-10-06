"use server";

import { cookies } from "next/headers";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { codeAttempts, invitations, mediaAssets } from "@/lib/db/schema";
import { currentClientIp } from "@/lib/client-ip";
import {
  generateManageCode,
  generateSlug,
  hasManageSession,
  hashCode,
  manageCookieName,
  signManageToken,
  verifyCode,
} from "@/lib/auth";
import { LIMITS, MANAGE_COOKIE_MAX_AGE, RATE_LIMITS } from "@/lib/constants";
import type { ActionResult } from "@/lib/action-result";
import { rateLimit } from "@/lib/rate-limit";
import { unreferencedImageUrls } from "@/lib/media-gc";
import {
  countImages,
  createInvitationInputSchema,
  safeParseContent,
  verifyCodeInputSchema,
} from "@/lib/validation/schemas";
import { buildInitialContent, getTemplate } from "@/templates/registry";

/**
 * slug 不存在与码错误返回同一句话。
 * （slug 本来就会随分享链接公开，因此这不是关键防线，但差异化的错误文案
 *  没有理由保留 —— 它只会让探测脚本的判定逻辑更简单。）
 */
const WRONG_CODE_MESSAGE = "管理码不正确";

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MANAGE_COOKIE_MAX_AGE,
  };
}

function isUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: string }).code === "23505"
  );
}

export async function createInvitationAction(
  templateId: string,
): Promise<ActionResult<{ slug: string; code: string }>> {
  const parsed = createInvitationInputSchema.safeParse({ templateId });
  if (!parsed.success) return { ok: false, message: "模板不存在" };

  const ip = await currentClientIp();
  if (
    !rateLimit(
      `create:${ip}`,
      RATE_LIMITS.createPerHourPerIp,
      60 * 60 * 1000,
    )
  ) {
    return { ok: false, message: "操作过于频繁，请一小时后再试" };
  }

  const template = getTemplate(parsed.data.templateId);
  if (!template) return { ok: false, message: "模板不存在" };

  const db = getDb();
  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = generateSlug();
    const code = generateManageCode();
    try {
      await db.insert(invitations).values({
        slug,
        sceneType: template.scene,
        templateId: template.id,
        layout: template.layout,
        status: "draft",
        manageCode: await hashCode(code),
        content: buildInitialContent(template),
      });
      const store = await cookies();
      store.set(manageCookieName(slug), signManageToken(slug), cookieOptions());
      return { ok: true, data: { slug, code } };
    } catch (e) {
      if (isUniqueViolation(e)) continue;
      throw e;
    }
  }
  return { ok: false, message: "创建失败，请重试" };
}

export async function verifyManageCodeAction(
  slug: string,
  code: string,
): Promise<ActionResult> {
  const parsed = verifyCodeInputSchema.safeParse({ slug, code });
  if (!parsed.success) {
    return { ok: false, message: WRONG_CODE_MESSAGE };
  }
  // 先做长度受限的输入校验，再进入昂贵的 scrypt 计算
  const { slug: validSlug } = parsed.data;
  const ip = await currentClientIp();

  // 单 IP 的验证总量兜底：防止对多个 slug 并行爆破（进程内近似，单实例足够）。
  // 阈值刻意宽松：国内移动网络大量用户共享出口 IP，宁可放过也不误伤真人。
  if (
    !rateLimit(
      `code:${ip}`,
      RATE_LIMITS.codeVerifyPerHourPerIp,
      60 * 60 * 1000,
    )
  ) {
    return {
      ok: false,
      message: `验证次数过多，请 ${RATE_LIMITS.codeLockMinutes} 分钟后再试`,
    };
  }

  const db = getDb();
  const rows = await db
    .select({ manageCode: invitations.manageCode })
    .from(invitations)
    .where(eq(invitations.slug, validSlug))
    .limit(1);
  const storedCode = rows[0]?.manageCode;
  if (storedCode === undefined) {
    return { ok: false, message: WRONG_CODE_MESSAGE };
  }

  const attemptRows = await db
    .select({
      failedCount: codeAttempts.failedCount,
      lockedUntil: codeAttempts.lockedUntil,
    })
    .from(codeAttempts)
    .where(
      and(
        eq(codeAttempts.slug, validSlug),
        eq(codeAttempts.ip, ip),
      ),
    )
    .limit(1);
  const attempt = attemptRows[0];
  if (attempt?.lockedUntil && attempt.lockedUntil.getTime() > Date.now()) {
    return {
      ok: false,
      message: `错误次数过多，已临时锁定，请 ${RATE_LIMITS.codeLockMinutes} 分钟后再试`,
    };
  }

  if (!(await verifyCode(parsed.data.code, storedCode))) {
    await recordFailedAttempt(validSlug, ip, attempt?.failedCount ?? 0);
    return { ok: false, message: WRONG_CODE_MESSAGE };
  }

  await db
    .delete(codeAttempts)
    .where(and(eq(codeAttempts.slug, validSlug), eq(codeAttempts.ip, ip)));

  const store = await cookies();
  store.set(manageCookieName(validSlug), signManageToken(validSlug), cookieOptions());
  return { ok: true };
}

async function recordFailedAttempt(
  slug: string,
  ip: string,
  previousCount: number,
) {
  const failedCount = previousCount + 1;
  const locked =
    failedCount >= RATE_LIMITS.codeMaxFailedAttempts
      ? new Date(Date.now() + RATE_LIMITS.codeLockMinutes * 60 * 1000)
      : null;
  const db = getDb();
  await db
    .insert(codeAttempts)
    .values({ slug, ip, failedCount, lockedUntil: locked, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: [codeAttempts.slug, codeAttempts.ip],
      set: { failedCount, lockedUntil: locked, updatedAt: new Date() },
    });
}

export async function clearManageSessionAction(
  slug: string,
): Promise<ActionResult> {
  const store = await cookies();
  store.delete(manageCookieName(slug));
  return { ok: true };
}

export async function setInvitationTemplateAction(
  slug: string,
  templateId: string,
): Promise<ActionResult> {
  if (!(await hasManageSession(slug))) {
    return { ok: false, message: "请先输入管理码" };
  }
  const db = getDb();
  const rows = await db
    .select({ id: invitations.id, sceneType: invitations.sceneType })
    .from(invitations)
    .where(eq(invitations.slug, slug))
    .limit(1);
  const inv = rows[0];
  if (!inv) return { ok: false, message: "请柬不存在" };

  const template = getTemplate(templateId);
  if (!template || template.scene !== inv.sceneType) {
    return { ok: false, message: "模板与场景不匹配" };
  }

  await db
    .update(invitations)
    .set({
      templateId: template.id,
      layout: template.layout,
      updatedAt: new Date(),
    })
    .where(eq(invitations.id, inv.id));
  return { ok: true };
}

export async function saveInvitationContentAction(
  slug: string,
  content: unknown,
): Promise<ActionResult> {
  if (!(await hasManageSession(slug))) {
    return { ok: false, message: "请先输入管理码" };
  }
  const db = getDb();
  const rows = await db
    .select({ id: invitations.id, sceneType: invitations.sceneType })
    .from(invitations)
    .where(eq(invitations.slug, slug))
    .limit(1);
  const inv = rows[0];
  if (!inv) return { ok: false, message: "请柬不存在" };

  const parsed = safeParseContent(inv.sceneType, content);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return {
      ok: false,
      message: `内容有误：${first ? `${first.path.join(".")} ${first.message}` : "格式不正确"}`,
    };
  }

  const serialized = JSON.stringify(parsed.data);
  if (Buffer.byteLength(serialized, "utf8") > LIMITS.contentBytes) {
    return { ok: false, message: "内容过大，请减少文字或照片" };
  }
  if (countImages(parsed.data) > LIMITS.maxImagesPerGallery) {
    return { ok: false, message: `照片总数不能超过 ${LIMITS.maxImagesPerGallery} 张` };
  }

  // 回收配额：新内容已不再引用的图片，其 media_assets 登记一并注销。
  // 判据是「已登记 vs 新内容是否引用」，因此顺带清掉上传后未落库留下的孤儿登记；
  // 否则配额只增不减，主人多换几轮照片就永久触顶。
  const registered = await db
    .select({ url: mediaAssets.url })
    .from(mediaAssets)
    .where(eq(mediaAssets.invitationId, inv.id));
  const stale = unreferencedImageUrls(
    registered.map((r) => r.url),
    parsed.data,
  );

  await db
    .update(invitations)
    .set({ content: parsed.data, updatedAt: new Date() })
    .where(eq(invitations.id, inv.id));

  if (stale.length > 0) {
    try {
      await db
        .delete(mediaAssets)
        .where(
          and(
            eq(mediaAssets.invitationId, inv.id),
            inArray(mediaAssets.url, stale),
          ),
        );
    } catch (e) {
      // 释放配额失败不应回滚内容保存：仅记日志，下次保存会重试
      console.error(
        "[content] media release failed",
        stale.length,
        e,
      );
    }
  }
  return { ok: true };
}

export async function setInvitationStatusAction(
  slug: string,
  next: "published" | "closed",
): Promise<ActionResult> {
  if (!(await hasManageSession(slug))) {
    return { ok: false, message: "请先输入管理码" };
  }
  const db = getDb();
  const rows = await db
    .select({ id: invitations.id, publishedAt: invitations.publishedAt })
    .from(invitations)
    .where(eq(invitations.slug, slug))
    .limit(1);
  const inv = rows[0];
  if (!inv) return { ok: false, message: "请柬不存在" };

  await db
    .update(invitations)
    .set({
      status: next,
      publishedAt:
        next === "published" && !inv.publishedAt ? new Date() : undefined,
      updatedAt: new Date(),
    })
    .where(eq(invitations.id, inv.id));
  return { ok: true };
}
