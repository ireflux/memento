"use server";

import { and, eq } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { blessings, invitations, rsvps } from "@/lib/db/schema";
import { hasManageSession } from "@/lib/auth";
import {
  blessingInputSchema,
  rsvpInputSchema,
} from "@/lib/validation/schemas";
import type { PublicBlessing } from "@/lib/queries";

export interface ActionResult<T = undefined> {
  ok: boolean;
  message?: string;
  data?: T;
}

export async function submitRsvpAction(
  slug: string,
  input: unknown,
): Promise<ActionResult> {
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
    partySize:
      d.attending === "yes" ? d.partySize : d.attending === "maybe" ? d.partySize : 0,
    note: d.note ? d.note : null,
  });
  return { ok: true };
}

export async function submitBlessingAction(
  slug: string,
  input: unknown,
): Promise<ActionResult<PublicBlessing>> {
  const db = getDb();
  const rows = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(eq(invitations.slug, slug))
    .limit(1);
  if (!rows[0]) return { ok: false, message: "请柬不存在" };

  const parsed = blessingInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, message: "请检查填写内容" };

  const inserted = await db
    .insert(blessings)
    .values({
      invitationId: rows[0].id,
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
    .set({ status: hidden ? "hidden" : "visible" })
    .where(
      and(
        eq(blessings.id, blessingId),
        eq(blessings.invitationId, rows[0].id),
      ),
    );
  return { ok: true };
}
