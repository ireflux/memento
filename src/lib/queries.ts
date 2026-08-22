import "server-only";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { getDb } from "./db";
import { blessings, invitations, rsvps } from "./db/schema";
import type { BlessingRow, InvitationRow, RsvpRow } from "./db/schema";

export async function getInvitationBySlug(
  slug: string,
): Promise<InvitationRow | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(invitations)
    .where(eq(invitations.slug, slug))
    .limit(1);
  return rows[0] ?? null;
}

export interface PublicBlessing {
  id: string;
  guestName: string;
  content: string;
  createdAt: string;
}

export async function getVisibleBlessings(
  invitationId: string,
): Promise<PublicBlessing[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: blessings.id,
      guestName: blessings.guestName,
      content: blessings.content,
      createdAt: blessings.createdAt,
    })
    .from(blessings)
    .where(
      and(
        eq(blessings.invitationId, invitationId),
        eq(blessings.status, "visible"),
      ),
    )
    .orderBy(desc(blessings.createdAt))
    .limit(200);
  return rows.map((r) => ({
    id: r.id,
    guestName: r.guestName,
    content: r.content,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function getAllBlessings(
  invitationId: string,
): Promise<BlessingRow[]> {
  const db = getDb();
  return db
    .select()
    .from(blessings)
    .where(eq(blessings.invitationId, invitationId))
    .orderBy(desc(blessings.createdAt));
}

export async function getRsvps(invitationId: string): Promise<RsvpRow[]> {
  const db = getDb();
  return db
    .select()
    .from(rsvps)
    .where(eq(rsvps.invitationId, invitationId))
    .orderBy(desc(rsvps.createdAt));
}

export async function incrementViewCount(slug: string): Promise<void> {
  const db = getDb();
  await db
    .update(invitations)
    .set({ viewCount: sql`${invitations.viewCount} + 1` })
    .where(eq(invitations.slug, slug));
}

export async function getTemplateUsageCounts(): Promise<
  Record<string, number>
> {
  try {
    const db = getDb();
    const rows = await db
      .select({ templateId: invitations.templateId, n: count() })
      .from(invitations)
      .groupBy(invitations.templateId);
    return Object.fromEntries(rows.map((r) => [r.templateId, r.n]));
  } catch {
    return {};
  }
}
