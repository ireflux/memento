"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { getDb } from "@/lib/db";
import { blessings, invitations, rsvps } from "@/lib/db/schema";
import { hasManageSession } from "@/lib/auth";
import type { ActionResult } from "@/lib/action-result";
import { RATE_LIMITS } from "@/lib/constants";
import { clientIpFromHeader, rateLimit } from "@/lib/rate-limit";
import {
  blessingInputSchema,
  rsvpInputSchema,
} from "@/lib/validation/schemas";
import type { PublicBlessing } from "@/lib/queries";

/** 宾客侧写接口的轻量防刷：按 slug+IP 滑动窗口限流。 */
async function guestRateLimited(scope: string, slug: string): Promise<boolean> {
  const hdrs = await headers();
  const ip = clientIpFromHeader(hdrs.get("x-forwarded-for"));
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

export async function toggleBlessingVisibilityAction(
  slug: string,
  blessingId: string,
  hidden: boolean,
): Promise<ActionResult> {
  if (!(await hasManageSession(slug))) {
    return { ok: false, message: "请先输入管理码" };
  }
  const db = getDb();
  const rows = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(eq(invitations.slug, slug))
    .limit(1);
  if (!rows[0]) return { ok: false, message: "请柬不存在" };

  await db
    .update(blessings)
    .set({
      status: hidden ? "hidden" : "visible",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(blessings.id, blessingId),
        eq(blessings.invitationId, rows[0].id),
      ),
    );
  return { ok: true };
}
