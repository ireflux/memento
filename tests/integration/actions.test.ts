/**
 * Server Actions 集成测试（设计文档 §10 的「Vitest + Neon 分支库」层）。
 *
 * 运行前提：
 *   1. 已 `npm run db:migrate` 应用到目标库；
 *   2. vitest 进程能读到 DATABASE_URL（Neon 的 HTTP 连接串即可）。
 * 未配置时整组跳过 —— 与 E2E 黄金路径同样的约定，避免误连生产主库。
 *
 * 覆盖的是「只有真库才能验」的行为：媒体配额回收、发布状态流转、
 * 回执的写入/修正/删除、以及管理码的锁定语义。
 */
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";

const { cookieJar, clientIp } = vi.hoisted(() => ({
  cookieJar: new Map<string, string>(),
  clientIp: { value: "203.0.113.9" },
}));

vi.mock("server-only", () => ({}));

vi.mock("next/headers", () => ({
  headers: async () => new Headers({ "x-forwarded-for": clientIp.value }),
  cookies: async () => ({
    get: (name: string) =>
      cookieJar.has(name) ? { name, value: cookieJar.get(name) } : undefined,
    set: (name: string, value: string) => {
      cookieJar.set(name, value);
    },
    delete: (name: string) => {
      cookieJar.delete(name);
    },
  }),
}));

import {
  createInvitationAction,
  saveInvitationContentAction,
  setInvitationStatusAction,
  verifyManageCodeAction,
} from "@/actions/invitations";
import {
  deleteRsvpAction,
  submitBlessingAction,
  submitRsvpAction,
  updateRsvpAction,
} from "@/actions/guests";
import { getDb } from "@/lib/db";
import {
  blessings,
  codeAttempts,
  invitations,
  mediaAssets,
  rsvps,
} from "@/lib/db/schema";
import { manageCookieName } from "@/lib/token";

const hasDb = Boolean(process.env.DATABASE_URL);
const describeDb = hasDb ? describe : describe.skip;

const created: string[] = [];
let ipSeq = 0;

/**
 * 每个用例换一个出口 IP。
 * 创建接口按 IP 限流（5 次/小时），共用一个 IP 跑十几个用例会误触限流，
 * 让失败原因与被测行为无关。
 */
function nextClientIp() {
  clientIp.value = `203.0.113.${(ipSeq++ % 250) + 1}`;
}

/** 逻辑外键（无物理 FK），清理必须显式删三张子表 —— 见设计文档 §4.2。 */
async function destroy(slug: string) {
  const db = getDb();
  const rows = await db
    .select({ id: invitations.id })
    .from(invitations)
    .where(eq(invitations.slug, slug))
    .limit(1);
  const row = rows[0];
  if (!row) return;
  await db.delete(mediaAssets).where(eq(mediaAssets.invitationId, row.id));
  await db.delete(rsvps).where(eq(rsvps.invitationId, row.id));
  await db.delete(blessings).where(eq(blessings.invitationId, row.id));
  await db.delete(invitations).where(eq(invitations.id, row.id));
  await db.delete(codeAttempts).where(eq(codeAttempts.slug, slug));
}

async function newDraft(): Promise<{ slug: string; code: string }> {
  nextClientIp();
  const res = await createInvitationAction("wedding-vermilion");
  if (!res.ok || !res.data) {
    throw new Error(`createInvitationAction failed: ${res.message ?? "unknown"}`);
  }
  created.push(res.data.slug);
  return res.data;
}

async function contentWith(imageUrls: string[]) {
  return {
    info: {
      groomName: "沈星回",
      brideName: "顾时夜",
      eventTime: "2026-10-01T18:00:00.000Z",
      venueName: "宴会厅",
      venueAddress: "杭州市西湖区某路 1 号",
    },
    pages: [
      { type: "cover" as const },
      {
        type: "gallery" as const,
        images: imageUrls.map((url) => ({ url })),
      },
      { type: "rsvp-form" as const },
    ],
  };
}

describeDb("actions · 媒体配额回收", () => {
  afterAll(async () => {
    await Promise.all(created.map(destroy));
  });

  it("保存内容时注销已移除图片的 media_assets 登记", async () => {
    const { slug } = await newDraft();
    const db = getDb();
    const row = await db
      .select({ id: invitations.id })
      .from(invitations)
      .where(eq(invitations.slug, slug))
      .limit(1);
    const id = row[0]?.id;
    if (!id) throw new Error("invitation not found");

    const keep = `https://img.example.com/${slug}-keep.jpg`;
    const drop = `https://img.example.com/${slug}-drop.jpg`;
    await db.insert(mediaAssets).values([
      { invitationId: id, url: keep, mime: "image/jpeg", sizeBytes: 1 },
      { invitationId: id, url: drop, mime: "image/jpeg", sizeBytes: 1 },
    ]);

    // 只保留 keep，drop 应在下一次保存后从登记表里消失
    const saved = await saveInvitationContentAction(slug, await contentWith([keep]));
    expect(saved.ok).toBe(true);

    const left = await db
      .select({ url: mediaAssets.url })
      .from(mediaAssets)
      .where(eq(mediaAssets.invitationId, id));
    expect(left.map((r) => r.url)).toEqual([keep]);
  });

  it("未移除的图片不会被误删", async () => {
    const { slug } = await newDraft();
    const db = getDb();
    const row = await db
      .select({ id: invitations.id })
      .from(invitations)
      .where(eq(invitations.slug, slug))
      .limit(1);
    const id = row[0]?.id;
    if (!id) throw new Error("invitation not found");

    const a = `https://img.example.com/${slug}-a.jpg`;
    const b = `https://img.example.com/${slug}-b.jpg`;
    await db
      .insert(mediaAssets)
      .values([
        { invitationId: id, url: a, mime: "image/jpeg", sizeBytes: 1 },
        { invitationId: id, url: b, mime: "image/jpeg", sizeBytes: 1 },
      ]);

    // 只改文字、不动图片 → 两条登记都应保留
    const content = await contentWith([a, b]);
    content.info.venueName = "换了名字";
    expect((await saveInvitationContentAction(slug, content)).ok).toBe(true);

    const left = await db
      .select({ url: mediaAssets.url })
      .from(mediaAssets)
      .where(eq(mediaAssets.invitationId, id));
    expect(left.map((r) => r.url).sort()).toEqual([a, b].sort());
  });

  it("拒绝非法内容且不改动已有内容", async () => {
    const { slug } = await newDraft();
    const before = await saveInvitationContentAction(slug, await contentWith([]));
    expect(before.ok).toBe(true);

    const bad = await saveInvitationContentAction(slug, { info: {}, pages: [] });
    expect(bad.ok).toBe(false);
  });
});

describeDb("actions · 管理码会话", () => {
  afterAll(async () => {
    await Promise.all(created.map(destroy));
  });

  it("创建后自动带上管理会话 cookie", async () => {
    const { slug } = await newDraft();
    expect(cookieJar.get(manageCookieName(slug))).toBeTruthy();
  });

  it("slug 不存在与码错误返回同一提示，不给枚举留信号", async () => {
    nextClientIp();
    const missing = await verifyManageCodeAction("zzzzzzzz", "ABCDEF");
    const { slug } = await newDraft();
    const wrong = await verifyManageCodeAction(slug, "ABCDEF");
    expect(missing.ok).toBe(false);
    expect(wrong.ok).toBe(false);
    expect(missing.message).toBe(wrong.message);
  });

  it("连错 5 次后锁定：即使码正确也进不去", async () => {
    const { slug, code } = await newDraft();
    clientIp.value = `198.51.100.${(ipSeq++ % 250) + 1}`;
    for (let i = 0; i < 5; i++) {
      const res = await verifyManageCodeAction(slug, "ABCDEF");
      expect(res.ok).toBe(false);
    }
    const locked = await verifyManageCodeAction(slug, code);
    expect(locked.ok).toBe(false);
    expect(locked.message).toContain("锁定");

    // 换一个 IP 不受影响 —— 锁按 slug+IP 计，主人换个网络仍能进
    clientIp.value = `198.51.101.${(ipSeq++ % 250) + 1}`;
    const fromOtherIp = await verifyManageCodeAction(slug, code);
    expect(fromOtherIp.ok).toBe(true);
  });

  it("无会话时不能改内容", async () => {
    const { slug } = await newDraft();
    const cookie = cookieJar.get(manageCookieName(slug));
    cookieJar.delete(manageCookieName(slug));
    const res = await saveInvitationContentAction(slug, await contentWith([]));
    expect(res.ok).toBe(false);
    if (cookie) cookieJar.set(manageCookieName(slug), cookie);
  });
});

describeDb("actions · 发布与宾客互动", () => {
  afterAll(async () => {
    await Promise.all(created.map(destroy));
  });

  it("草稿不接受回执与留言，发布后接受", async () => {
    const { slug } = await newDraft();
    expect((await submitRsvpAction(slug, { guestName: "王小明", attending: "yes" })).ok).toBe(false);
    expect((await submitBlessingAction(slug, { guestName: "李雷", content: "新婚快乐" })).ok).toBe(false);

    expect((await setInvitationStatusAction(slug, "published")).ok).toBe(true);
    expect((await submitRsvpAction(slug, { guestName: "王小明", attending: "yes" })).ok).toBe(true);
    expect((await submitBlessingAction(slug, { guestName: "李雷", content: "新婚快乐" })).ok).toBe(true);
  });

  it("不出席时人数归零", async () => {
    const { slug } = await newDraft();
    await setInvitationStatusAction(slug, "published");
    await submitRsvpAction(slug, {
      guestName: "缺席的人",
      attending: "no",
      partySize: 5,
    });
    const db = getDb();
    const row = await db
      .select({ id: invitations.id })
      .from(invitations)
      .where(eq(invitations.slug, slug))
      .limit(1);
    const id = row[0]?.id;
    if (!id) throw new Error("invitation not found");
    const rows = await db
      .select({ partySize: rsvps.partySize })
      .from(rsvps)
      .where(eq(rsvps.invitationId, id));
    expect(rows[0]?.partySize).toBe(0);
  });

  it("主人可修正人数，标为缺席后人数归零", async () => {
    const { slug } = await newDraft();
    await setInvitationStatusAction(slug, "published");
    await submitRsvpAction(slug, { guestName: "填错的人", attending: "yes", partySize: 1 });
    const db = getDb();
    const row = await db
      .select({ id: invitations.id })
      .from(invitations)
      .where(eq(invitations.slug, slug))
      .limit(1);
    const id = row[0]?.id;
    if (!id) throw new Error("invitation not found");
    const inserted = await db
      .select({ id: rsvps.id })
      .from(rsvps)
      .where(eq(rsvps.invitationId, id));
    const rsvpId = inserted[0]?.id;
    if (!rsvpId) throw new Error("rsvp not found");

    expect((await updateRsvpAction(slug, rsvpId, { partySize: 6 })).ok).toBe(true);
    let current = await db
      .select({ partySize: rsvps.partySize, attending: rsvps.attending })
      .from(rsvps)
      .where(eq(rsvps.id, rsvpId));
    expect(current[0]).toMatchObject({ partySize: 6, attending: "yes" });

    expect((await updateRsvpAction(slug, rsvpId, { attending: "no" })).ok).toBe(true);
    current = await db
      .select({ partySize: rsvps.partySize, attending: rsvps.attending })
      .from(rsvps)
      .where(eq(rsvps.id, rsvpId));
    expect(current[0]).toMatchObject({ partySize: 0, attending: "no" });
  });

  it("重复提交可由主人删除，出席人数随之回落", async () => {
    const { slug } = await newDraft();
    await setInvitationStatusAction(slug, "published");
    await submitRsvpAction(slug, { guestName: "重复提交", attending: "yes", partySize: 2 });
    await submitRsvpAction(slug, { guestName: "重复提交", attending: "yes", partySize: 2 });
    const db = getDb();
    const row = await db
      .select({ id: invitations.id })
      .from(invitations)
      .where(eq(invitations.slug, slug))
      .limit(1);
    const id = row[0]?.id;
    if (!id) throw new Error("invitation not found");
    const all = await db
      .select({ id: rsvps.id })
      .from(rsvps)
      .where(eq(rsvps.invitationId, id));
    expect(all.length).toBe(2);

    const target = all[0]?.id;
    if (!target) throw new Error("rsvp not found");
    expect((await deleteRsvpAction(slug, target)).ok).toBe(true);

    const left = await db
      .select({ id: rsvps.id })
      .from(rsvps)
      .where(eq(rsvps.invitationId, id));
    expect(left.length).toBe(1);
  });

  it("撤回发布后宾客端回到不可互动状态", async () => {
    const { slug } = await newDraft();
    await setInvitationStatusAction(slug, "published");
    expect((await setInvitationStatusAction(slug, "closed")).ok).toBe(true);
    expect((await submitRsvpAction(slug, { guestName: "晚到的人", attending: "yes" })).ok).toBe(false);
  });

  it("无管理会话时不能修正或删除回执", async () => {
    const { slug } = await newDraft();
    await setInvitationStatusAction(slug, "published");
    await submitRsvpAction(slug, { guestName: "王小明", attending: "yes" });
    const db = getDb();
    const row = await db
      .select({ id: invitations.id })
      .from(invitations)
      .where(eq(invitations.slug, slug))
      .limit(1);
    const id = row[0]?.id;
    if (!id) throw new Error("invitation not found");
    const inserted = await db
      .select({ id: rsvps.id })
      .from(rsvps)
      .where(eq(rsvps.invitationId, id));
    const rsvpId = inserted[0]?.id;
    if (!rsvpId) throw new Error("rsvp not found");

    const cookie = cookieJar.get(manageCookieName(slug));
    cookieJar.delete(manageCookieName(slug));
    expect((await updateRsvpAction(slug, rsvpId, { partySize: 9 })).ok).toBe(false);
    expect((await deleteRsvpAction(slug, rsvpId)).ok).toBe(false);
    if (cookie) cookieJar.set(manageCookieName(slug), cookie);

    const left = await db
      .select({ id: rsvps.id })
      .from(rsvps)
      .where(eq(rsvps.invitationId, id));
    expect(left.length).toBe(1);
  });
});
