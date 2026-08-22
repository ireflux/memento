"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { InvitationContent, LayoutType, SceneType } from "@/lib/validation/schemas";
import { saveInvitationContentAction, setInvitationTemplateAction } from "@/actions/invitations";
import { templatesForScene } from "@/templates/registry";
import { InfoForm } from "./InfoForm";
import { PagesPanel } from "./PagesPanel";
import { PublishPanel } from "./PublishPanel";
import { PhonePreview } from "./PhonePreview";

type SaveState = "idle" | "saving" | "saved" | "error";

const SAVE_TEXT: Record<SaveState, string> = {
  idle: "",
  saving: "保存中…",
  saved: "已自动保存 ✓",
  error: "保存失败，请检查内容",
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
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current) return;
    setSaveState("saving");
    const t = setTimeout(async () => {
      const res = await saveInvitationContentAction(slug, content);
      if (res.ok) {
        setSaveState("saved");
        dirty.current = false;
      } else {
        setSaveState("error");
      }
    }, 1200);
    return () => clearTimeout(t);
  }, [content, slug]);

  const patchInfo = (patch: Partial<InvitationContent["info"]>) => {
    dirty.current = true;
    setContent(
      (c) =>
        ({ ...c, info: { ...c.info, ...patch } }) as InvitationContent,
    );
  };
  const patchPages = (pages: InvitationContent["pages"]) => {
    dirty.current = true;
    setContent((c) => ({ ...c, pages }));
  };

  const switchTemplate = async (id: string) => {
    const t = templatesForScene(sceneType).find((x) => x.id === id);
    if (!t || t.id === templateId) return;
    setTemplateId(t.id);
    setLayout(t.layout);
    await setInvitationTemplateAction(slug, id);
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
          <span className="ml-auto text-xs text-neutral-400">
            {SAVE_TEXT[saveState]}
          </span>
          <Link
            href={`/manage/${slug}`}
            className="rounded-full border border-neutral-200 px-3.5 py-1.5 text-xs text-neutral-600 hover:border-neutral-900"
          >
            数据后台
          </Link>
        </div>
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
