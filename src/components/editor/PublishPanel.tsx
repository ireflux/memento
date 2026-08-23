"use client";

import { useEffect, useState } from "react";
import { setInvitationStatusAction } from "@/actions/invitations";
import { copyText } from "@/lib/clipboard";
import { useShareUrl } from "@/components/use-share-url";
import { useRouter } from "next/navigation";

const STATUS_TEXT = {
  draft: { label: "未发布", cls: "bg-neutral-100 text-neutral-600" },
  published: { label: "已发布", cls: "bg-emerald-100 text-emerald-700" },
  closed: { label: "已结束", cls: "bg-neutral-800 text-white" },
} as const;

export function PublishPanel({
  slug,
  status,
}: {
  slug: string;
  status: "draft" | "published" | "closed";
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "ok" | "fail">("idle");
  const [qr, setQr] = useState<string | null>(null);
  const [qrError, setQrError] = useState(false);
  const shareUrl = useShareUrl(`/i/${slug}`);

  useEffect(() => {
    if (!shareUrl) return;
    let alive = true;
    import("qrcode")
      .then(({ default: QRCode }) => QRCode.toDataURL(shareUrl, { width: 260, margin: 1 }))
      .then((d) => {
        if (alive) {
          setQr(d);
          setQrError(false);
        }
      })
      .catch(() => {
        if (alive) setQrError(true); // 二维码生成失败时降级为纯链接分享
      });
    return () => {
      alive = false;
    };
  }, [shareUrl]);

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

  const st = STATUS_TEXT[status];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between rounded-2xl bg-neutral-50 px-4 py-3">
        <span className="text-sm text-neutral-600">当前状态</span>
        <span className={`rounded-full px-3 py-1 text-xs ${st.cls}`}>
          {st.label}
        </span>
      </div>

      {status !== "published" ? (
        <button
          type="button"
          disabled={busy}
          onClick={() => void setStatus("published")}
          className="w-full rounded-full bg-[#8f1f1f] py-3 text-sm text-[#fdf3e3] disabled:opacity-60"
        >
          {status === "closed" ? "重新发布" : "发布请柬"}
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => void setStatus("closed")}
          className="w-full rounded-full border border-red-200 py-3 text-sm text-red-500 disabled:opacity-60"
        >
          结束活动（宾客将看到结束页）
        </button>
      )}

      <div>
        <label className="mb-1 block text-xs font-medium text-neutral-500">
          分享链接
        </label>
        <div className="flex gap-2">
          <input
            readOnly
            value={shareUrl}
            placeholder="发布后可复制链接"
            onFocus={(e) => e.target.select()}
            className="min-w-0 flex-1 truncate rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700"
          />
          <button
            type="button"
            onClick={() => void copy()}
            className="rounded-xl bg-neutral-900 px-4 py-2 text-sm text-white"
          >
            {copyState === "ok" ? "✓" : copyState === "fail" ? "复制失败" : "复制"}
          </button>
        </div>
        {copyState === "fail" ? (
          <p className="mt-1.5 text-[11px] text-amber-600">
            当前浏览器不支持自动复制，请长按链接手动复制
          </p>
        ) : null}
        <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-400">
          微信内长按链接转发即可；发布后建议同时保存二维码印在纸质喜帖上。
        </p>
      </div>

      {qr ? (
        <div className="rounded-2xl border border-neutral-100 p-4 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={qr} alt="请柬二维码" className="mx-auto h-40 w-40" />
          <a
            href={qr}
            download={`memento-${slug}-qr.png`}
            className="mt-2 inline-block text-xs text-neutral-500 underline"
          >
            下载二维码
          </a>
        </div>
      ) : null}

      {qrError && shareUrl ? (
        <p className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-center text-xs text-amber-700">
          二维码生成失败，请直接复制上方链接分享
        </p>
      ) : null}

      <a
        href={`/i/${slug}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-xl border border-neutral-200 py-2.5 text-center text-sm text-neutral-600 hover:border-neutral-900"
      >
        手机预览 ↗
      </a>
    </div>
  );
}
