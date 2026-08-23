"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { InvitationContent, LayoutType, SceneType } from "@/lib/validation/schemas";
import {
  clearManageSessionAction,
  saveInvitationContentAction,
  setInvitationTemplateAction,
} from "@/actions/invitations";
import { templatesForScene } from "@/templates/registry";
import { InfoForm } from "./InfoForm";
import { PagesPanel } from "./PagesPanel";
import { PublishPanel } from "./PublishPanel";
import { PhonePreview } from "./PhonePreview";

type SaveState = "idle" | "saving" | "saved" | "error";

const SAVE_LABEL: Record<SaveState, string> = {
  idle: "",
  saving: "保存中…",
  saved: "已自动保存 ✓",
  error: "保存失败",
};

export function EditorClient({
  slug,
  sceneType,
  initialTemplateId,
  status,
  initialContent,
}: {
  slug: string;
  sceneType: SceneType;
  initialTemplateId: string;
  status: "draft" | "published" | "closed";
  initialContent: InvitationContent;
}) {
  const [content, setContent] = useState(initialContent);
  const [templateId, setTemplateId] = useState(initialTemplateId);
  const [layout, setLayout] = useState<LayoutType>(
    templatesForScene(sceneType).find((t) => t.id === initialTemplateId)
      ?.layout ?? "flip",
  );
  const [tab, setTab] = useState<"info" | "pages" | "publish">("info");
  const [selectedPage, setSelectedPage] = useState<number | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [saveError, setSaveError] = useState("");
  const [notice, setNotice] = useState("");
  /** 渲染用的未保存标记（与 dirty ref 同步，ref 供事件监听器同步读取） */
  const [unsaved, setUnsaved] = useState(false);

  // 最新内容快照：让在途的防抖保存始终拿到最新值
  const contentRef = useRef(content);
  const dirty = useRef(false);
  /** 本地编辑计数：保存期间发生新编辑时，成功响应不得清掉 dirty 标记 */
  const editCount = useRef(0);
  /** 发出的请求序号：旧请求迟到的响应一律忽略 */
  const reqSeq = useRef(0);
  const savingRef = useRef(false);

  const doSave = useCallback(async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      // 循环直到「快照后无新编辑」的一次保存成功；期间的新编辑会被立即再保存
      for (;;) {
        const snapshot = contentRef.current;
        const editsAtSnapshot = editCount.current;
        const seq = ++reqSeq.current;

        const res = await saveInvitationContentAction(slug, snapshot);
        if (seq !== reqSeq.current) return; // 已有更新的保存接管，本次响应作废

        if (res.ok) {
          if (editCount.current === editsAtSnapshot) {
            dirty.current = false;
            setUnsaved(false);
            setSaveState("saved");
            setSaveError("");
            return;
          }
          continue; // 保存期间用户仍在编辑，再保存一次最新内容
        }
        setSaveState("error");
        setSaveError(res.message ?? "保存失败，请检查网络后重试");
        return;
      }
    } finally {
      savingRef.current = false;
    }
  }, [slug]);

  useEffect(() => {
    if (!dirty.current) return;
    setSaveState("saving");
    const t = setTimeout(() => void doSave(), 1200);
    return () => clearTimeout(t);
  }, [content, doSave]);

  // 有未保存修改时拦截页面关闭/刷新
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (dirty.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []);

  const applyContent = (next: InvitationContent) => {
    editCount.current += 1;
    dirty.current = true;
    setUnsaved(true);
    contentRef.current = next;
    setContent(next);
  };

  const patchInfo = (patch: Partial<InvitationContent["info"]>) => {
    applyContent(
      ({ ...contentRef.current, info: { ...contentRef.current.info, ...patch } }) as InvitationContent,
    );
  };
  const patchPages = (pages: InvitationContent["pages"]) => {
    applyContent({ ...contentRef.current, pages });
  };

  const switchTemplate = async (id: string) => {
    const t = templatesForScene(sceneType).find((x) => x.id === id);
    if (!t || t.id === templateId) return;
    const prevId = templateId;
    const prevLayout = layout;
    setTemplateId(t.id); // 乐观更新
    setLayout(t.layout);
    const res = await setInvitationTemplateAction(slug, id);
    if (!res.ok) {
      setTemplateId(prevId); // 失败回滚，避免 UI 与数据库漂移
      setLayout(prevLayout);
      setNotice(res.message ?? "切换失败，请重试");
      setTimeout(() => setNotice(""), 3000);
    }
  };

  const logout = async () => {
    await clearManageSessionAction(slug);
    // 硬导航：登出后彻底重置客户端缓存与内存状态
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = "/";
  };

  const tabs = [
    ["info", "基本信息"],
    ["pages", "页面"],
    ["publish", "发布"],
  ] as const;

  return (
    <div className="min-h-dvh bg-[#f4f1ec]">
      <header className="sticky top-0 z-40 border-b border-neutral-200/70 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link href="/" className="font-serif text-lg tracking-widest text-[#8f1f1f]">
            拾光柬
          </Link>
          <span className="truncate text-xs text-neutral-400">/ {slug}</span>
          <span className={`ml-auto text-xs ${saveState === "error" ? "text-red-500" : "text-neutral-400"}`}>
            {SAVE_LABEL[saveState]}
          </span>
          {unsaved ? (
            <button
              type="button"
              onClick={() => void doSave()}
              disabled={saveState === "saving"}
              className="rounded-full bg-neutral-900 px-3.5 py-1.5 text-xs text-white disabled:opacity-60"
            >
              立即保存
            </button>
          ) : null}
          <Link
            href={`/manage/${slug}`}
            className="rounded-full border border-neutral-200 px-3.5 py-1.5 text-xs text-neutral-600 hover:border-neutral-900"
          >
            数据后台
          </Link>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-full border border-neutral-200 px-3.5 py-1.5 text-xs text-neutral-500 hover:border-neutral-900"
          >
            退出
          </button>
        </div>
        {saveState === "error" && saveError ? (
          <p className="bg-red-50 px-4 py-1.5 text-center text-xs text-red-600">
            {saveError}
          </p>
        ) : null}
        {notice ? (
          <p className="bg-amber-50 px-4 py-1.5 text-center text-xs text-amber-700">
            {notice}
          </p>
        ) : null}
      </header>

      <div className="mx-auto flex max-w-5xl flex-col gap-8 px-4 py-6 lg:flex-row lg:items-start">
        <aside className="order-first flex flex-col items-center gap-3 lg:sticky lg:top-20">
          <PhonePreview
            slug={slug}
            templateId={templateId}
            content={content}
          />
          <p className="text-[11px] tracking-widest text-neutral-400">
            {layout === "flip" ? "左右滑动或点箭头翻页预览" : "滚动预览"}
          </p>
        </aside>

        <section className="w-full max-w-md space-y-5">
          <nav className="flex rounded-full bg-white p-1 shadow-sm">
            {tabs.map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`flex-1 rounded-full py-2 text-sm transition-colors ${
                  tab === key
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-500"
                }`}
              >
                {label}
              </button>
            ))}
          </nav>

          {tab === "info" ? (
            <>
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h3 className="mb-4 text-sm font-medium text-neutral-800">模板风格</h3>
                <div className="grid grid-cols-3 gap-2">
                  {templatesForScene(sceneType).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => void switchTemplate(t.id)}
                      className={`overflow-hidden rounded-xl border-2 transition-colors ${
                        templateId === t.id
                          ? "border-neutral-900"
                          : "border-transparent"
                      }`}
                    >
                      <span
                        className="block h-14 w-full"
                        style={{ background: t.theme.bgGradient }}
                      />
                      <span className="block bg-white py-1.5 text-xs text-neutral-700">
                        {t.name}
                      </span>
                    </button>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-neutral-400">
                  切换模板不会丢失已填写的内容与照片
                </p>
              </div>
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <InfoForm content={content} onChange={patchInfo} />
              </div>
            </>
          ) : null}

          {tab === "pages" ? (
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <PagesPanel
                slug={slug}
                content={content}
                selected={selectedPage}
                onSelect={setSelectedPage}
                onChange={patchPages}
              />
            </div>
          ) : null}

          {tab === "publish" ? (
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <PublishPanel slug={slug} status={status} />
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
