"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { verifyManageCodeAction } from "@/actions/invitations";

export function CodeGateForm({
  slug,
  next,
}: {
  slug: string;
  next: string;
}) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = async () => {
    if (code.trim().length < 4) {
      setError("请输入完整的管理码");
      return;
    }
    const res = await verifyManageCodeAction(slug, code.trim());
    if (!res.ok) {
      setError(res.message ?? "管理码不正确");
      return;
    }
    startTransition(() => {
      router.replace(next);
      router.refresh();
    });
  };

  return (
    <form
      className="w-full max-w-xs space-y-4 rounded-3xl bg-white p-7 shadow-xl shadow-neutral-900/5"
      onSubmit={(e) => {
        e.preventDefault();
        void submit();
      }}
    >
      <p className="text-center text-sm text-neutral-500">
        请输入这张请柬的管理码
      </p>
      <input
        value={code}
        onChange={(e) => {
          setCode(e.target.value.toUpperCase());
          setError("");
        }}
        maxLength={12}
        autoFocus
        autoComplete="off"
        placeholder="管理码"
        className="w-full rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3.5 text-center font-mono text-2xl tracking-[0.45em] outline-none focus:border-[#8f1f1f]"
      />
      {error ? (
        <p className="text-center text-sm text-red-500">{error}</p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-full bg-[#8f1f1f] py-3.5 text-[#fdf3e3] transition-opacity disabled:opacity-60"
      >
        {pending ? "验证中…" : "进入管理"}
      </button>
    </form>
  );
}
