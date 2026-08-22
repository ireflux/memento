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
    try {
      for (const file of Array.from(files).slice(0, multiple ? 9 : 1)) {
        urls.push(await uploadImage(slug, file));
      }
      onUploaded(urls);
    } catch (e) {
      setError(e instanceof Error ? e.message : "上传失败");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
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
