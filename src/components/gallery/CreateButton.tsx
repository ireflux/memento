"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInvitationAction } from "@/actions/invitations";

interface Created {
  slug: string;
  code: string;
}

export function CreateButton({ templateId }: { templateId: string }) {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<Created | null>(null);
  const [copied, setCopied] = useState(false);

  const create = async () => {
    if (creating) return;
    setCreating(true);
    setError("");
    try {
      const res = await createInvitationAction(templateId);
      if (res.ok && res.data) {
        setCreated(res.data);
      } else {
        setError(res.message ?? "创建失败，请重试");
      }
    } catch {
      setError("网络异常，请重试");
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => void create()}
        disabled={creating}
        className="w-full rounded-full bg-neutral-900 py-2.5 text-xs tracking-[0.3em] text-white transition-opacity hover:opacity-85 disabled:opacity-60"
      >
        {creating ? "创建中…" : "用这套制作"}
      </button>
      {error ? <p className="mt-1 text-center text-xs text-red-500">{error}</p> : null}

      {created ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-6 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xs rounded-3xl bg-white p-7 text-center shadow-2xl">
            <p className="text-sm text-neutral-600">
              请柬已创建，你的管理码是
            </p>
            <p className="my-5 font-mono text-4xl tracking-[0.35em] text-neutral-900">
              {created.code}
            </p>
            <p className="mb-5 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-700">
              ⚠️ 管理码只显示这一次，请截图保存。
              <br />
              凭它进入编辑器与管理后台，丢失无法找回。
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(created.code).catch(() => {});
                  setCopied(true);
                }}
                className="flex-1 rounded-full border border-neutral-200 py-3 text-sm text-neutral-600"
              >
                {copied ? "已复制 ✓" : "复制"}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/edit/${created.slug}`)}
                className="flex-1 rounded-full bg-[#8f1f1f] py-3 text-sm text-[#fdf3e3]"
              >
                进入编辑器
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
