"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  clearManageSessionAction,
  setInvitationStatusAction,
} from "@/actions/invitations";
import { toggleBlessingVisibilityAction } from "@/actions/guests";
import { copyText } from "@/lib/clipboard";
import { useShareUrl } from "@/components/use-share-url";
import { formatDateTimeShort } from "@/lib/format";

interface RsvpItem {
  id: string;
  guestName: string;
  attending: "yes" | "no" | "maybe";
  partySize: number;
  phone: string | null;
  note: string | null;
  createdAt: string;
}

interface BlessingItem {
  id: string;
  guestName: string;
  content: string;
  hidden: boolean;
  createdAt: string;
}

const ATTENDING_BADGE = {
  yes: { text: "出席", cls: "bg-emerald-100 text-emerald-700" },
  no: { text: "缺席", cls: "bg-neutral-100 text-neutral-500" },
  maybe: { text: "待定", cls: "bg-amber-100 text-amber-700" },
} as const;

export function ManageClient({
  slug,
  status,
  viewCount,
  title,
  rsvps,
  blessings,
}: {
  slug: string;
  status: "draft" | "published" | "closed";
  viewCount: number;
  title: string;
  rsvps: RsvpItem[];
  blessings: BlessingItem[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "ok" | "fail">("idle");
  const shareUrl = useShareUrl(`/i/${slug}`);

  const attendingYes = rsvps.filter((r) => r.attending === "yes");
  const totalGuests = attendingYes.reduce(
    (sum, r) => sum + r.partySize,
    0,
  );

  const setStatus = async (next: "published" | "closed") => {
    setBusy(true);
    await setInvitationStatusAction(slug, next);
    setBusy(false);
    router.refresh();
  };

  const copy = async () => {
    const ok = await copyText(shareUrl);
    setCopyState(ok ? "ok" : "fail");
    setTimeout(() => setCopyState("idle"), ok ? 1500 : 3000);
  };

  const logout = async () => {
    await clearManageSessionAction(slug);
    // 硬导航：登出后彻底重置客户端缓存与内存状态
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  };

  return (
    <div className="min-h-dvh bg-[#f4f1ec] pb-24">
      <header className="border-b border-neutral-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
          <Link href="/" className="font-serif text-lg tracking-widest text-[#8f1f1f]">
            拾光柬
          </Link>
          <span className="truncate text-sm text-neutral-500">· {title}</span>
          <Link
            href={`/edit/${slug}`}
            className="ml-auto rounded-full border border-neutral-200 px-3.5 py-1.5 text-xs text-neutral-600 hover:border-neutral-900"
          >
            返回编辑
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-full border border-neutral-200 px-3.5 py-1.5 text-xs text-neutral-500 hover:border-neutral-900"
          >
            退出
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-4 pt-6">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-sm font-medium text-neutral-800">发布状态</span>
            <span
              className={`rounded-full px-3 py-1 text-xs ${
                status === "published"
                  ? "bg-emerald-100 text-emerald-700"
                  : status === "closed"
                    ? "bg-neutral-800 text-white"
                    : "bg-neutral-100 text-neutral-600"
              }`}
            >
              {status === "published"
                ? "已发布"
                : status === "closed"
                  ? "已结束"
                  : "未发布"}
            </span>
          </div>
          <div className="flex gap-2">
            {status !== "published" ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void setStatus("published")}
                className="flex-1 rounded-full bg-[#8f1f1f] py-2.5 text-sm text-[#fdf3e3] disabled:opacity-60"
              >
                发布 / 重新发布
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => void setStatus("closed")}
                className="flex-1 rounded-full border border-red-200 py-2.5 text-sm text-red-500 disabled:opacity-60"
              >
                结束活动
              </button>
            )}
            <button
              type="button"
              onClick={() => void copy()}
              disabled={!shareUrl}
              className="rounded-full bg-neutral-900 px-5 py-2.5 text-sm text-white disabled:opacity-60"
            >
              {copyState === "ok"
                ? "已复制 ✓"
                : copyState === "fail"
                  ? "复制失败"
                  : "复制分享链接"}
            </button>
          </div>
          {copyState === "fail" ? (
            <p className="mt-2 text-xs text-amber-600">
              当前浏览器不支持自动复制，请手动复制：{shareUrl}
            </p>
          ) : null}
        </section>

        <section className="grid grid-cols-4 gap-3">
          <Stat label="浏览" value={viewCount} />
          <Stat label="回执" value={rsvps.length} />
          <Stat label="出席人数" value={totalGuests} highlight />
          <Stat label="留言" value={blessings.filter((b) => !b.hidden).length} />
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
            <h2 className="text-sm font-medium text-neutral-800">
              出席回执（{rsvps.length}）
            </h2>
            <a
              href={`/api/manage/${slug}/export`}
              className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs text-white"
            >
              导出 CSV
            </a>
          </div>
          {rsvps.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-neutral-400">
              还没有收到回执
            </p>
          ) : (
            <ul className="divide-y divide-neutral-50">
              {rsvps.map((r) => {
                const badge = ATTENDING_BADGE[r.attending];
                return (
                  <li key={r.id} className="flex items-start gap-3 px-5 py-3.5">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-neutral-800">
                        {r.guestName}
                        {r.partySize > 0 ? (
                          <span className="ml-1.5 text-xs text-neutral-400">
                            {r.partySize} 人
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-neutral-400">
                        {[r.phone, r.note, formatDateTimeShort(r.createdAt)]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <span className={`rounded-full px-2.5 py-0.5 text-xs ${badge.cls}`}>
                      {badge.text}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="border-b border-neutral-100 px-5 py-4">
            <h2 className="text-sm font-medium text-neutral-800">
              祝福留言（{blessings.length}）
            </h2>
          </div>
          {blessings.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-neutral-400">
              还没有留言
            </p>
          ) : (
            <ul className="divide-y divide-neutral-50">
              {blessings.map((b) => (
                <li key={b.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className={`text-sm ${b.hidden ? "text-neutral-300 line-through" : "text-neutral-700"}`}>
                      {b.content}
                    </p>
                    <p className="mt-0.5 text-xs text-neutral-400">
                      —— {b.guestName} · {formatDateTimeShort(b.createdAt)}
                      {b.hidden ? " · 已隐藏" : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={async () => {
                      setBusy(true);
                      await toggleBlessingVisibilityAction(slug, b.id, !b.hidden);
                      setBusy(false);
                      router.refresh();
                    }}
                    className="flex-none rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-500 hover:border-neutral-900 hover:text-neutral-900"
                  >
                    {b.hidden ? "显示" : "隐藏"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl p-4 text-center shadow-sm ${
        highlight ? "bg-[#8f1f1f]" : "bg-white"
      }`}
    >
      <p
        className={`text-2xl font-semibold tabular-nums ${
          highlight ? "text-[#fdf3e3]" : "text-neutral-900"
        }`}
      >
        {value}
      </p>
      <p
        className={`mt-1 text-xs ${
          highlight ? "text-[#fdf3e3]/70" : "text-neutral-400"
        }`}
      >
        {label}
      </p>
    </div>
  );
}
