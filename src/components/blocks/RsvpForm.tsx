"use client";

import { useState } from "react";
import { submitRsvpAction } from "@/actions/guests";

type Attending = "yes" | "maybe" | "no";

const inputCls =
  "w-full rounded-xl border border-[var(--tk-primary-soft)] bg-[var(--tk-surface)] px-4 py-3 text-base text-[var(--tk-text)] placeholder:text-[var(--tk-muted)] outline-none transition-colors focus:border-[var(--tk-primary)]";

const labelCls = "mb-1.5 block text-xs tracking-widest text-[var(--tk-muted)]";

export function RsvpForm({
  slug,
  note,
  interactive = true,
}: {
  slug: string;
  note?: string;
  interactive?: boolean;
}) {
  const [guestName, setGuestName] = useState("");
  const [attending, setAttending] = useState<Attending>("yes");
  const [partySize, setPartySize] = useState(1);
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "done" | "error"
  >("idle");
  const [message, setMessage] = useState("");

  if (!interactive) {
    return (
      <div className="space-y-4 opacity-60">
        <div>
          <span className={labelCls}>您的姓名</span>
          <div className={inputCls}>张三</div>
        </div>
        <p className={labelCls}>表单预览（编辑器中不可交互）</p>
      </div>
    );
  }

  if (status === "done") {
    return (
      <div className="py-8 text-center">
        <div className="mb-3 text-4xl">💌</div>
        <p className="text-lg font-medium">
          {attending === "no"
            ? "已收到您的回复，谢谢告知"
            : "已收到回执，期待与您相见"}
        </p>
      </div>
    );
  }

  const submit = async () => {
    if (!guestName.trim()) {
      setStatus("error");
      setMessage("请填写您的姓名");
      return;
    }
    setStatus("submitting");
    const res = await submitRsvpAction(slug, {
      guestName,
      attending,
      partySize,
      phone,
      note: "",
    });
    if (res.ok) {
      setStatus("done");
    } else {
      setStatus("error");
      setMessage(res.message ?? "提交失败，请稍后再试");
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      {note ? (
        <p className="text-sm text-[var(--tk-muted)]">{note}</p>
      ) : null}
      <div>
        <label className={labelCls} htmlFor={`rsvp-name-${slug}`}>
          您的姓名
        </label>
        <input
          id={`rsvp-name-${slug}`}
          className={inputCls}
          value={guestName}
          onChange={(e) => setGuestName(e.target.value)}
          maxLength={20}
          placeholder="怎么称呼您"
        />
      </div>
      <div>
        <span className={labelCls}>是否出席</span>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              ["yes", "出席 🎉"],
              ["maybe", "待定"],
              ["no", "无法出席"],
            ] as Array<[Attending, string]>
          ).map(([v, text]) => (
            <button
              key={v}
              type="button"
              onClick={() => setAttending(v)}
              className={`rounded-xl border px-2 py-2.5 text-sm transition-colors ${
                attending === v ? "border-transparent" : "border-[var(--tk-primary-soft)]"
              }`}
              style={
                attending === v
                  ? {
                      background: "var(--tk-button-bg)",
                      color: "var(--tk-button-text)",
                    }
                  : { color: "var(--tk-text)" }
              }
            >
              {text}
            </button>
          ))}
        </div>
      </div>
      {attending !== "no" ? (
        <div>
          <label className={labelCls} htmlFor={`rsvp-size-${slug}`}>
            几位同行
          </label>
          <select
            id={`rsvp-size-${slug}`}
            className={inputCls}
            value={partySize}
            onChange={(e) => setPartySize(Number(e.target.value))}
          >
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
              <option key={n} value={n} className="text-black">
                {n} 位
              </option>
            ))}
          </select>
        </div>
      ) : null}
      <div>
        <label className={labelCls} htmlFor={`rsvp-phone-${slug}`}>
          手机号（选填）
        </label>
        <input
          id={`rsvp-phone-${slug}`}
          className={inputCls}
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          inputMode="tel"
          maxLength={20}
          placeholder="方便我们联系您"
        />
      </div>
      {status === "error" && message ? (
        <p className="text-center text-sm text-red-400">{message}</p>
      ) : null}
      <button
        type="submit"
        disabled={status === "submitting"}
        className="w-full rounded-full py-3.5 font-medium tracking-widest shadow-lg transition-opacity disabled:opacity-60"
        style={{
          background: "var(--tk-button-bg)",
          color: "var(--tk-button-text)",
        }}
      >
        {status === "submitting" ? "提交中…" : "提 交 回 执"}
      </button>
    </form>
  );
}
