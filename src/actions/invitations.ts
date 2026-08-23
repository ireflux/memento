"use server";

import { cookies, headers } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { codeAttempts, invitations } from "@/lib/db/schema";
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
import { clientIpFromHeader, rateLimit } from "@/lib/rate-limit";
import { countImages, safeParseContent } from "@/lib/validation/schemas";
import { createInvitationInputSchema, verifyCodeInputSchema } from "@/lib/validation/schemas";
import { buildInitialContent, getTemplate } from "@/templates/registry";

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

  const hdrs = await headers();
  const ip = clientIpFromHeader(hdrs.get("x-forwarded-for"));
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
        manageCode: hashCode(code),
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
    return { ok: false, message: "请输入正确的管理码格式" };
  }
  // 先做长度受限的输入校验，再进入昂贵的 scrypt 计算
  const { slug: validSlug } = parsed.data;

  const db = getDb();
  const rows = await db
    .select({ id: invitations.id, manageCode: invitations.manageCode })
    .from(invitations)
    .where(eq(invitations.slug, validSlug))
    .limit(1);
  const inv = rows[0];
  if (!inv) return { ok: false, message: "管理码不正确" };

  const attemptRows = await db
    .select({ failedCount: codeAttempts.failedCount, lockedUntil: codeAttempts.lockedUntil })
    .from(codeAttempts)
    .where(eq(codeAttempts.slug, validSlug))
    .limit(1);
  const attempt = attemptRows[0];
  if (attempt?.lockedUntil && attempt.lockedUntil.getTime() > Date.now()) {
    return {
      ok: false,
      message: `错误次数过多，已临时锁定，请 ${RATE_LIMITS.codeLockMinutes} 分钟后再试`,
    };
  }

  if (!verifyCode(parsed.data.code, inv.manageCode)) {
    await recordFailedAttempt(validSlug, attempt?.failedCount ?? 0);
    const left = Math.max(
      0,
      RATE_LIMITS.codeMaxFailedAttempts - (attempt?.failedCount ?? 0) - 1,
    );
    return {
      ok: false,
      message: left > 0 ? `管理码不正确，还可尝试 ${left} 次` : "管理码不正确",
    };
  }

  await db.delete(codeAttempts).where(eq(codeAttempts.slug, validSlug));

  const store = await cookies();
  store.set(manageCookieName(validSlug), signManageToken(validSlug), cookieOptions());
  return { ok: true };
}

async function recordFailedAttempt(slug: string, previousCount: number) {
  const failedCount = previousCount + 1;
  const locked =
    failedCount >= RATE_LIMITS.codeMaxFailedAttempts
      ? new Date(Date.now() + RATE_LIMITS.codeLockMinutes * 60 * 1000)
      : null;
  const db = getDb();
  await db
    .insert(codeAttempts)
    .values({ slug, failedCount, lockedUntil: locked, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: codeAttempts.slug,
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
  if (!rows[0]) return { ok: false, message: "请柬不存在" };

  const template = getTemplate(templateId);
  if (!template || template.scene !== rows[0].sceneType) {
    return { ok: false, message: "模板与场景不匹配" };
  }

  await db
    .update(invitations)
    .set({
      templateId: template.id,
      layout: template.layout,
      updatedAt: new Date(),
    })
    .where(eq(invitations.id, rows[0].id));
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

  await db
    .update(invitations)
    .set({ content: parsed.data, updatedAt: new Date() })
    .where(eq(invitations.id, inv.id));
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
  if (!rows[0]) return { ok: false, message: "请柬不存在" };

  await db
    .update(invitations)
    .set({
      status: next,
      publishedAt:
        next === "published" && !rows[0].publishedAt
          ? new Date()
          : undefined,
      updatedAt: new Date(),
    })
    .where(eq(invitations.id, rows[0].id));
  return { ok: true };
}
