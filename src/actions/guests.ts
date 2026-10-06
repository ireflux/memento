"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { blessings, invitations, rsvps } from "@/lib/db/schema";
import { getDb } from "@/lib/db";
import { hasManageSession } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import { RATE_LIMITS } from "@/lib/constants";
import { currentClientIp } from "@/lib/client-ip";
import { rateLimit } from "@/lib/rate-limit";
import {
  blessingInputSchema,
  rsvpInputSchema,
  rsvpPatchSchema,
} from "@/lib/validation/schemas";
import { getInvitationIdBySlug } from "@/lib/queries";
import type { PublicBlessing } from "@/lib/queries";

const uuidSchema = z.string().uuid();

/** 宾客侧写接口的轻量防刷：按 slug+IP 滑动窗口限流。 */
async function guestRateLimited(scope: string, slug: string): Promise<boolean> {
  const ip = await currentClientIp();
  return !rateLimit(
    `${scope}:${slug}:${ip}`,
    RATE_LIMITS.guestSubmitPerHour,
    60 * 60 * 1000,
  );
}

export async function submitRsvpAction(
  slug: string,
  input: unknown,
): Promise<ActionResult> {
  if (await guestRateLimited("rsvp", slug)) {
    return { ok: false, message: "提交过于频繁，请稍后再试" };
  }
  const db = getDb();
  const rows = await db
    .select({ id: invitations.id, status: invitations.status })
    .from(invitations)
    .where(eq(invitations.slug, slug))
    .limit(1);
  const inv = rows[0];
  if (!inv || inv.status !== "published") {
    return { ok: false, message: "这份请柬暂未开放回执" };
  }

  const parsed = rsvpInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, message: "请检查填写内容" };
  }
  const d = parsed.data;

  await db.insert(rsvps).values({
    invitationId: inv.id,
    guestName: d.guestName,
    phone: d.phone ? d.phone : null,
    attending: d.attending,
    partySize: d.attending === "no" ? 0 : d.partySize,
    note: d.note ? d.note : null,
  });
  return { ok: true };
}

export async function submitBlessingAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<PublicBlessing>> {
  if (await guestRateLimited("blessing", slug)) {
    return { ok: false, message: "发送过于频繁，请稍后再试" };
  }
  const db = getDb();
  // 与 RSVP 保持一致：仅 published 请柬接受祝福
  const rows = await db
    .select({ id: invitations.id, status: invitations.status })
    .from(invitations)
    .where(eq(invitations.slug, slug))
    .limit(1);
  const inv = rows[0];
  if (!inv) return { ok: false, message: "请柬不存在" };
  if (inv.status !== "published") {
    return { ok: false, message: "这份请柬暂未开放留言" };
  }

  const parsed = blessingInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "请检查填写内容" };

  const inserted = await db
    .insert(blessings)
    .values({
      invitationId: inv.id,
      guestName: parsed.data.guestName,
      content: parsed.data.content,
    })
    .returning({
      id: blessings.id,
      guestName: blessings.guestName,
      content: blessings.content,
      createdAt: blessings.createdAt,
    });

  const row = inserted[0];
  if (!row) {
    return { ok: false, message: "发送失败，请稍后再试" };
  }
  return {
    ok: true,
    data: {
      id: row.id,
      guestName: row.guestName,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
    },
  };
}

/**
 * 主人修正某条回执（出席状态 / 人数）。
 *
 * 为什么需要：宾客重复提交、或填错人数时没有自愈手段，
 * 而「出席人数合计」是排桌刚需 —— 算错了却无法改，后台就成了只读摆设。
 */
export async function updateRsvpAction(
  slug: string,
  rsvpId: string,
  input: unknown,
): Promise<ActionResult> {
  if (!(await hasManageSession(slug))) {
    return { ok: false, message: "请先输入管理码" };
  }
  const id = uuidSchema.safeParse(rsvpId);
  const parsed = rsvpPatchSchema.safeParse(input);
  if (!id.success || !parsed.success) {
    return { ok: false, message: "修改内容有误" };
  }
  const invitationId = await getInvitationIdBySlug(slug);
  if (!invitationId) return { ok: false, message: "请柬不存在" };

  // 与提交路径保持同一套归一化：不出席 → 人数恒为 0；
  // 只改出席状态时保留原人数。
  const patch = parsed.data;
  const set: { attending?: "yes" | "no" | "maybe"; partySize?: number } = {};
  if (patch.attending !== undefined) set.attending = patch.attending;
  if (patch.attending === "no") set.partySize = 0;
  else if (patch.partySize !== undefined) set.partySize = patch.partySize;

  const db = getDb();
  await db
    .update(rsvps)
    .set(set)
    .where(and(eq(rsvps.id, id.data), eq(rsvps.invitationId, invitationId)));
  return { ok: true };
}

/** 主人删除误填 / 重复提交的回执行。 */
export async function deleteRsvpAction(
  slug: string,
  rsvpId: string,
): Promise<ActionResult> {
  if (!(await hasManageSession(slug))) {
    return { ok: false, message: "请先输入管理码" };
  }
  const id = uuidSchema.safeParse(rsvpId);
  if (!id.success) return { ok: false, message: "参数错误" };
  const invitationId = await getInvitationIdBySlug(slug);
  if (!invitationId) return { ok: false, message: "请柬不存在" };

  const db = getDb();
  await db
    .delete(rsvps)
    .where(and(eq(rsvps.id, id.data), eq(rsvps.invitationId, invitationId)));
  return { ok: true };
}

export async function toggleBlessingVisibilityAction(
  slug: string,
  blessingId: string,
  hidden: boolean,
): Promise<ActionResult> {
  if (!(await hasManageSession(slug))) {
    return { ok: false, message: "请先输入管理码" };
  }
  const id = uuidSchema.safeParse(blessingId);
  if (!id.success) return { ok: false, message: "参数错误" };
  const invitationId = await getInvitationIdBySlug(slug);
  if (!invitationId) return { ok: false, message: "请柬不存在" };

  const db = getDb();
  await db
    .update(blessings)
    .set({
      status: hidden ? "hidden" : "visible",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(blessings.id, id.data),
        eq(blessings.invitationId, invitationId),
      ),
    );
  return { ok: true };
}
