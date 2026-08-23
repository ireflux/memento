"use client";

import { useState } from "react";
import type { Block, InvitationContent } from "@/lib/validation/schemas";
import { LIMITS } from "@/lib/constants";
import { ImageUploader } from "./ImageUploader";

const BLOCK_LABELS: Record<Block["type"], string> = {
  cover: "封面",
  gallery: "照片墙",
  countdown: "倒计时",
  map: "地点导航",
  story: "故事段落",
  text: "文字段落",
  "rsvp-form": "出席回执",
  "blessing-wall": "祝福墙",
};

const BLOCK_ICONS: Record<Block["type"], string> = {
  cover: "💌",
  gallery: "🖼️",
  countdown: "⏳",
  map: "📍",
  story: "📖",
  text: "✍️",
  "rsvp-form": "📝",
  "blessing-wall": "🎊",
};

export function PagesPanel({
  slug,
  content,
  selected,
  onSelect,
  onChange,
}: {
  slug: string;
  content: InvitationContent;
  selected: number | null;
  onSelect: (i: number | null) => void;
  onChange: (pages: InvitationContent["pages"]) => void;
}) {
  const pages = content.pages;

  const updateBlock = (i: number, patch: Partial<Block>) => {
    const next = pages.map((p, idx) =>
      idx === i ? ({ ...p, ...patch } as Block) : p,
    );
    onChange(next);
  };

  const move = (i: number, delta: -1 | 1) => {
    const j = i + delta;
    if (j < 0 || j >= pages.length) return;
    const next = [...pages];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
    onSelect(j);
  };

  const remove = (i: number) => {
    onChange(pages.filter((_, idx) => idx !== i));
    onSelect(null);
  };

  const add = (type: Block["type"]) => {
    const blank: Record<Block["type"], Block> = {
      cover: { type: "cover" },
      gallery: { type: "gallery", images: [] },
      countdown: { type: "countdown" },
      map: { type: "map" },
      story: { type: "story", body: "在这里写下内容…" },
      text: { type: "text", body: "写点什么…" },
      "rsvp-form": { type: "rsvp-form" },
      "blessing-wall": { type: "blessing-wall" },
    };
    onChange([...pages, blank[type]]);
    onSelect(pages.length);
  };

  return (
    <div className="space-y-3">
      <ul className="space-y-1.5">
        {pages.map((p, i) => (
          <li
            key={`${p.type}-${i}`}
            className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 transition-colors ${
              selected === i
                ? "border-neutral-900 bg-neutral-50"
                : "border-neutral-100 bg-white"
            }`}
          >
            <button
              type="button"
              className="flex min-w-0 flex-1 items-center gap-2 text-left"
              onClick={() => onSelect(selected === i ? null : i)}
            >
              <span>{BLOCK_ICONS[p.type]}</span>
              <span className="truncate text-sm text-neutral-700">
                {BLOCK_LABELS[p.type]}
                {p.type === "gallery" ? `（${p.images.length} 图）` : ""}
              </span>
            </button>
            <button
              type="button"
              aria-label="上移"
              disabled={i === 0}
              onClick={() => move(i, -1)}
              className="px-1 text-neutral-300 disabled:opacity-30 hover:text-neutral-900"
            >
              ↑
            </button>
            <button
              type="button"
              aria-label="下移"
              disabled={i === pages.length - 1}
              onClick={() => move(i, 1)}
              className="px-1 text-neutral-300 disabled:opacity-30 hover:text-neutral-900"
            >
              ↓
            </button>
            <button
              type="button"
              aria-label="删除"
              disabled={p.type === "cover"}
              onClick={() => remove(i)}
              className="px-1 text-neutral-300 disabled:opacity-30 hover:text-red-500"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <AddBlockMenu
        onAdd={add}
        disabled={pages.length >= LIMITS.maxPages}
      />

      {selected != null && pages[selected] ? (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <h4 className="mb-3 text-sm font-medium text-neutral-800">
            编辑「{BLOCK_LABELS[pages[selected].type]}」
          </h4>
          <BlockPropsForm
            slug={slug}
            block={pages[selected]}
            onChange={(patch) => updateBlock(selected, patch)}
          />
        </div>
      ) : null}
    </div>
  );
}

function AddBlockMenu({
  onAdd,
  disabled,
}: {
  onAdd: (t: Block["type"]) => void;
  disabled: boolean;
}) {
  const [open, setOpen] = useState(false);
  const addable: Block["type"][] = [
    "gallery",
    "countdown",
    "story",
    "text",
    "rsvp-form",
    "blessing-wall",
  ];
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="w-full rounded-xl border border-neutral-200 py-2.5 text-sm text-neutral-600 transition-colors hover:border-neutral-900 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {disabled
          ? `已达页数上限（${LIMITS.maxPages} 页）`
          : open
            ? "收起"
            : "+ 添加内容块"}
      </button>
      {open ? (
        <div className="mt-2 grid grid-cols-2 gap-2">
          {addable.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                onAdd(t);
                setOpen(false);
              }}
              className="rounded-xl bg-neutral-50 px-3 py-2.5 text-sm text-neutral-700 hover:bg-neutral-100"
            >
              {BLOCK_ICONS[t]} {BLOCK_LABELS[t]}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function BlockPropsForm({
  slug,
  block,
  onChange,
}: {
  slug: string;
  block: Block;
  onChange: (patch: Partial<Block>) => void;
}) {
  const inputCls =
    "w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm outline-none focus:border-neutral-900";
  const labelCls = "mb-1 block text-xs font-medium text-neutral-500";

  switch (block.type) {
    case "cover":
      return (
        <div className="space-y-3">
          <div>
            <label className={labelCls}>封面副标题</label>
            <input
              className={inputCls}
              value={block.subtitle ?? ""}
              maxLength={40}
              placeholder="WE ARE GETTING MARRIED"
              onChange={(e) =>
                onChange({
                  subtitle: e.target.value || undefined,
                } as Partial<Block>)
              }
            />
          </div>
          <div>
            <label className={labelCls}>封面大图（选填）</label>
            {block.heroImageUrl ? (
              <div className="mb-2 overflow-hidden rounded-xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={block.heroImageUrl} alt="" className="max-h-36 w-full object-cover" />
                <button
                  type="button"
                  className="mt-1 text-xs text-red-500"
                  onClick={() => onChange({ heroImageUrl: undefined } as Partial<Block>)}
                >
                  移除图片
                </button>
              </div>
            ) : (
              <ImageUploader
                slug={slug}
                onUploaded={(urls) =>
                  urls[0] &&
                  onChange({ heroImageUrl: urls[0] } as Partial<Block>)
                }
              />
            )}
          </div>
        </div>
      );
    case "gallery":
      return (
        <div className="space-y-3">
          <ImageUploader
            slug={slug}
            multiple
            onUploaded={(urls) =>
              onChange({
                images: [
                  ...block.images,
                  ...urls.map((url) => ({ url })),
                ],
              } as Partial<Block>)
            }
          />
          {block.images.length > 0 ? (
            <ul className="space-y-1.5">
              {block.images.map((img, i) => (
                <li
                  key={`${img.url}-${i}`}
                  className="flex items-center gap-2 rounded-lg bg-neutral-50 px-2.5 py-1.5"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.url} alt="" className="h-9 w-9 rounded object-cover" />
                  <input
                    className="min-w-0 flex-1 bg-transparent text-xs outline-none"
                    placeholder="配图文字（选填）"
                    maxLength={30}
                    value={img.caption ?? ""}
                    onChange={(e) =>
                      onChange({
                        images: block.images.map((im, idx) =>
                          idx === i
                            ? { url: im.url, caption: e.target.value || undefined }
                            : im,
                        ),
                      } as Partial<Block>)
                    }
                  />
                  <button
                    type="button"
                    aria-label="删除照片"
                    className="text-xs text-neutral-400 hover:text-red-500"
                    onClick={() =>
                      onChange({
                        images: block.images.filter((_, idx) => idx !== i),
                      } as Partial<Block>)
                    }
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      );
    case "countdown":
      return (
        <div>
          <label className={labelCls}>倒计时文案</label>
          <input
            className={inputCls}
            value={block.label ?? ""}
            maxLength={20}
            placeholder="距离婚礼还有"
            onChange={(e) =>
              onChange({ label: e.target.value || undefined } as Partial<Block>)
            }
          />
        </div>
      );
    case "map":
      return (
        <p className="text-xs leading-relaxed text-neutral-500">
          地点信息在「基本信息」中填写，宾客可一键跳转高德 / 腾讯地图导航。
        </p>
      );
    case "story":
    case "text": {
      const isStory = block.type === "story";
      return (
        <div className="space-y-3">
          <div>
            <label className={labelCls}>小标题（选填）</label>
            <input
              className={inputCls}
              value={block.heading ?? ""}
              maxLength={20}
              onChange={(e) =>
                onChange({ heading: e.target.value || undefined } as Partial<Block>)
              }
            />
          </div>
          <div>
            <label className={labelCls}>正文</label>
            <textarea
              className={`${inputCls} min-h-28 leading-relaxed`}
              value={block.body}
              maxLength={isStory ? 600 : 300}
              onChange={(e) => onChange({ body: e.target.value } as Partial<Block>)}
            />
            <p className="mt-1 text-right text-[11px] text-neutral-400">
              {block.body.length}/{isStory ? 600 : 300}
            </p>
          </div>
        </div>
      );
    }
    case "rsvp-form":
      return (
        <div>
          <label className={labelCls}>表单上方提示语</label>
          <input
            className={inputCls}
            value={block.note ?? ""}
            maxLength={40}
            placeholder="诚邀您出席，请告知我们您是否能来"
            onChange={(e) =>
              onChange({ note: e.target.value || undefined } as Partial<Block>)
            }
          />
        </div>
      );
    case "blessing-wall":
      return (
        <div>
          <label className={labelCls}>祝福墙标题</label>
          <input
            className={inputCls}
            value={block.title ?? ""}
            maxLength={20}
            placeholder="祝福墙"
            onChange={(e) =>
              onChange({ title: e.target.value || undefined } as Partial<Block>)
            }
          />
        </div>
      );
    default:
      return null;
  }
}
