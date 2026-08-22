"use server";

import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { invitations } from "@/lib/db/schema";
import {
  generateManageCode,
  generateSlug,
  hasManageSession,
  hashCode,
  manageCookieName,
  signManageToken,
  verifyCode,
} from "@/lib/auth";
import { LIMITS, MANAGE_COOKIE_MAX_AGE } from "@/lib/constants";
import { countImages, safeParseContent } from "@/lib/validation/schemas";
import { buildInitialContent, getTemplate } from "@/templates/registry";

export interface ActionResult<T = undefined> {
  ok: boolean;
  message?: string;
  data?: T;
}

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
  const template = getTemplate(templateId);
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
  const db = getDb();
  const rows = await db
    .select({ manageCode: invitations.manageCode })
    .from(invitations)
    .where(eq(invitations.slug, slug))
    .limit(1);
  const stored = rows[0]?.manageCode;
  if (!stored || !verifyCode(code, stored)) {
    return { ok: false, message: "管理码不正确" };
  }
  const store = await cookies();
  store.set(manageCookieName(slug), signManageToken(slug), cookieOptions());
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
  if (serialized.length > LIMITS.contentBytes) {
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
