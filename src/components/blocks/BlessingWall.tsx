"use client";

import { useState } from "react";
import { submitBlessingAction } from "@/actions/guests";
import type { PublicBlessing } from "@/lib/queries";

export function BlessingWall({
  slug,
  title,
  initial,
  interactive = true,
}: {
  slug: string;
  title?: string;
  initial: PublicBlessing[];
  interactive?: boolean;
}) {
  const [items, setItems] = useState<PublicBlessing[]>(initial);
  const [name, setName] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async () => {
    if (!interactive) return;
    if (!name.trim() || !content.trim()) {
      setStatus("error");
      setMessage("请写下您的名字和祝福");
      return;
    }
    setStatus("sending");
    const res = await submitBlessingAction(slug, {
      guestName: name,
      content,
    });
    if (res.ok && res.data) {
      setItems((prev) => [res.data as PublicBlessing, ...prev]);
      setName("");
      setContent("");
      setStatus("idle");
      setMessage("");
    } else {
      setStatus("error");
      setMessage(res.message ?? "发送失败，请稍后再试");
    }
  };

  return (
    <div>
      <h2 className="mb-5 text-center font-display text-2xl tracking-[0.3em] text-[var(--tk-text)]">
        {title ?? "祝 福 墙"}
      </h2>

      {interactive ? (
        <div className="mb-6 space-y-3 rounded-2xl p-4" style={{ background: "var(--tk-surface)" }}>
          <div className="flex gap-2">
            <input
              className="w-28 flex-none rounded-xl border border-[var(--tk-primary-soft)] bg-transparent px-3 py-2 text-sm text-[var(--tk-text)] placeholder:text-[var(--tk-muted)] outline-none focus:border-[var(--tk-primary)]"
              placeholder="您的名字"
              maxLength={20}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <input
              className="min-w-0 flex-1 rounded-xl border border-[var(--tk-primary-soft)] bg-transparent px-3 py-2 text-sm text-[var(--tk-text)] placeholder:text-[var(--tk-muted)] outline-none focus:border-[var(--tk-primary)]"
              placeholder="写下您的祝福…"
              maxLength={200}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void submit();
                }
              }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-[var(--tk-muted)]">
              {status === "error" && message ? message : `${content.length}/200`}
            </span>
            <button
              type="button"
              onClick={() => void submit()}
              disabled={status === "sending"}
              className="rounded-full px-5 py-1.5 text-sm font-medium disabled:opacity-60"
              style={{ background: "var(--tk-button-bg)", color: "var(--tk-button-text)" }}
            >
              {status === "sending" ? "发送中…" : "送出祝福"}
            </button>
          </div>
        </div>
      ) : null}

      <ul className="space-y-3">
        {items.length === 0 && interactive ? (
          <li className="py-6 text-center text-sm text-[var(--tk-muted)]">
            还没有祝福，来做第一个吧
          </li>
        ) : null}
        {!interactive && items.length === 0 ? (
          <li className="py-6 text-center text-sm text-[var(--tk-muted)] opacity-60">
            祝福列表预览（暂无数据）
          </li>
        ) : null}
        {items.map((b) => (
          <li
            key={b.id}
            className="rounded-2xl px-4 py-3"
            style={{ background: "var(--tk-surface)" }}
          >
            <p className="text-sm leading-relaxed text-[var(--tk-text)]">
              {b.content}
            </p>
            <p className="mt-1.5 text-right text-xs text-[var(--tk-muted)]">
              —— {b.guestName}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
