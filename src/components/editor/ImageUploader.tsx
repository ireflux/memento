"use client";

import { useRef, useState } from "react";
import { uploadImage } from "./media";

export function ImageUploader({
  slug,
  multiple = false,
  onUploaded,
}: {
  slug: string;
  multiple?: boolean;
  onUploaded: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const pick = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setBusy(true);
    setError("");
    const urls: string[] = [];
    const failed: string[] = [];
    // 逐张上传、逐张收集：中途某张失败不能丢掉已成功的 URL，
    // 否则那几张图既没进内容、又在服务端留下登记（既丢数据又白占配额）。
    for (const file of Array.from(files).slice(0, multiple ? 9 : 1)) {
      try {
        urls.push(await uploadImage(slug, file));
      } catch (e) {
        failed.push(
          file.name || "某张图片",
          e instanceof Error ? `：${e.message}` : "",
        );
      }
    }
    if (urls.length > 0) onUploaded(urls);
    if (failed.length > 0) {
      setError(
        `${failed.join("、")}${urls.length > 0 ? `；另有 ${urls.length} 张已上传成功` : ""}`,
      );
    }
    setBusy(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple={multiple}
        hidden
        onChange={(e) => void pick(e.target.files)}
      />
      <button
        type="button"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
        className="w-full rounded-xl border border-dashed border-neutral-300 py-3 text-sm text-neutral-500 transition-colors hover:border-neutral-900 hover:text-neutral-900 disabled:opacity-60"
      >
        {busy ? "上传中…" : multiple ? "+ 上传照片（可多选）" : "+ 上传图片"}
      </button>
      {error ? (
        <p className="mt-1.5 text-xs text-red-500">{error}</p>
      ) : null}
    </div>
  );
}
