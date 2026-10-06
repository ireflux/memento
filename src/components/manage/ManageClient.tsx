"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  clearManageSessionAction,
  setInvitationStatusAction,
} from "@/actions/invitations";
import { deleteRsvpAction, toggleBlessingVisibilityAction, updateRsvpAction } from "@/actions/guests";
import { safeAction } from "@/lib/client-action";
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

const ATTENDING_OPTIONS: Array<[RsvpItem["attending"], string]> = [
  ["yes", "出席"],
  ["maybe", "待定"],
  ["no", "缺席"],
];

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
  const [statusError, setStatusError] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "ok" | "fail">("idle");
  const shareUrl = useShareUrl(`/i/${slug}`);

  const attendingYes = rsvps.filter((r) => r.attending === "yes");
  const totalGuests = attendingYes.reduce((sum, r) => sum + r.partySize, 0);

  const setStatus = async (next: "published" | "closed") => {
    setBusy(true);
    setStatusError("");
    const res = await safeAction(() => setInvitationStatusAction(slug, next));
    setBusy(false);
    if (!res.ok) {
      setStatusError(res.message ?? "操作失败，请重试");
      return;
    }
    router.refresh();
  };

  const copy = async () => {
    const ok = await copyText(shareUrl);
    setCopyState(ok ? "ok" : "fail");
    setTimeout(() => setCopyState("idle"), ok ? 1500 : 3000);
  };

  const logout = async () => {
    await safeAction(() => clearManageSessionAction(slug));
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
          {statusError ? (
            <p className="mt-2 text-xs text-red-500">{statusError}</p>
          ) : null}
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
              {rsvps.map((r) => (
                <RsvpRow
                  key={r.id}
                  slug={slug}
                  item={r}
                  onChanged={() => router.refresh()}
                />
              ))}
            </ul>
          )}
          {rsvps.length > 0 ? (
            <p className="border-t border-neutral-100 px-5 py-3 text-[11px] leading-relaxed text-neutral-400">
              宾客重复提交或填错人数时，可在此修正或删除 ——「出席人数」只统计出席记录的人数之和。
            </p>
          ) : null}
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
                      await safeAction(() =>
                        toggleBlessingVisibilityAction(slug, b.id, !b.hidden),
                      );
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

/**
 * 单条回执：默认只读，点击「修正」进入行内编辑，或删除整行。
 * 存在意义：宾客可能重复提交或填错人数，而「出席人数合计」是排桌刚需，
 * 没有纠错入口时后台等同于只读。
 */
function RsvpRow({
  slug,
  item,
  onChanged,
}: {
  slug: string;
  item: RsvpItem;
  onChanged: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [attending, setAttending] = useState<RsvpItem["attending"]>(item.attending);
  const [partySize, setPartySize] = useState(item.partySize > 0 ? item.partySize : 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const startEdit = () => {
    // 从当前数据重置编辑态，避免 router.refresh() 后残留旧值
    setAttending(item.attending);
    setPartySize(item.partySize > 0 ? item.partySize : 1);
    setError("");
    setConfirming(false);
    setEditing(true);
  };

  const pickAttending = (value: RsvpItem["attending"]) => {
    setAttending(value);
    // 从「缺席」改回出席时人数输入框是禁用的（值为 0），补一个合理默认值
    if (value !== "no" && partySize < 1) setPartySize(1);
  };

  const save = async () => {
    setBusy(true);
    setError("");
    const res = await safeAction(() =>
      updateRsvpAction(slug, item.id, { attending, partySize }),
    );
    setBusy(false);
    if (!res.ok) {
      setError(res.message ?? "保存失败，请重试");
      return;
    }
    setEditing(false);
    onChanged();
  };

  const remove = async () => {
    setBusy(true);
    setError("");
    const res = await safeAction(() => deleteRsvpAction(slug, item.id));
    setBusy(false);
    if (!res.ok) {
      setError(res.message ?? "删除失败，请重试");
      return;
    }
    setConfirming(false);
    onChanged();
  };

  if (editing) {
    return (
      <li className="space-y-3 px-5 py-3.5">
        <p className="text-sm font-medium text-neutral-800">
          修正回执 · {item.guestName}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-full bg-neutral-100 p-0.5">
            {ATTENDING_OPTIONS.map(([value, text]) => (
              <button
                key={value}
                type="button"
                onClick={() => pickAttending(value)}
                className={`rounded-full px-3 py-1.5 text-xs ${
                  attending === value
                    ? "bg-white text-neutral-900 shadow-sm"
                    : "text-neutral-500"
                }`}
              >
                {text}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-xs text-neutral-500">
            人数
            <input
              type="number"
              min={0}
              max={20}
              value={partySize}
              disabled={attending === "no"}
              onChange={(e) => setPartySize(Number(e.target.value))}
              className="w-16 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-sm text-neutral-800 outline-none focus:border-neutral-900 disabled:opacity-40"
            />
          </label>
        </div>
        {attending === "no" ? (
          <p className="text-[11px] text-neutral-400">
            标记为缺席后人数按 0 计入出席合计。
          </p>
        ) : null}
        {error ? <p className="text-xs text-red-500">{error}</p> : null}
        <div className="flex gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs text-white disabled:opacity-60"
          >
            保存
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setEditing(false)}
            className="rounded-full border border-neutral-200 px-4 py-1.5 text-xs text-neutral-500"
          >
            取消
          </button>
        </div>
      </li>
    );
  }

  const badge = ATTENDING_BADGE[item.attending];

  return (
    <li className="flex items-start gap-3 px-5 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-neutral-800">
          {item.guestName}
          {item.partySize > 0 ? (
            <span className="ml-1.5 text-xs text-neutral-400">
              {item.partySize} 人
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 truncate text-xs text-neutral-400">
          {[item.phone, item.note, formatDateTimeShort(item.createdAt)]
            .filter(Boolean)
            .join(" · ")}
        </p>
        {error ? <p className="mt-1 text-xs text-red-500">{error}</p> : null}
      </div>
      <div className="flex flex-none items-center gap-1.5">
        <span className={`rounded-full px-2.5 py-0.5 text-xs ${badge.cls}`}>
          {badge.text}
        </span>
        {confirming ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove()}
              className="rounded-full bg-red-500 px-3 py-1 text-xs text-white disabled:opacity-60"
            >
              确认删除
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirming(false)}
              className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-500"
            >
              取消
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={startEdit}
              className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-500 hover:border-neutral-900 hover:text-neutral-900"
            >
              修正
            </button>
            <button
              type="button"
              onClick={() => {
                setError("");
                setConfirming(true);
              }}
              className="rounded-full border border-neutral-200 px-3 py-1 text-xs text-neutral-400 hover:border-red-500 hover:text-red-500"
            >
              删除
            </button>
          </>
        )}
      </div>
    </li>
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
