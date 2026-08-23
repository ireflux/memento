"use client";

import { useState } from "react";

/**
 * 带加载失败兜底的图片（设计文档 §8.2）：
 * 加载/解码失败时渲染模板风格占位块，绝不让裂图毁掉整张请柬。
 * className 同时作用于 img 与占位块，保证布局尺寸一致。
 * 以「记录失败的 src」代替布尔标记，src 变化时状态自动失效，无需 effect 重置。
 */
export function SafeImg({
  src,
  alt = "",
  className = "",
  loading,
}: {
  src: string;
  alt?: string;
  className?: string;
  loading?: "lazy" | "eager";
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const failed = failedSrc === src;

  if (failed) {
    return (
      <div
        role="img"
        aria-label={alt || "图片暂不可用"}
        className={`flex items-center justify-center ${className}`}
        style={{ background: "var(--tk-surface)" }}
      >
        <span
          className="text-2xl opacity-40"
          style={{ color: "var(--tk-primary)" }}
        >
          ❀
        </span>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      loading={loading}
      className={className}
      onError={() => setFailedSrc(src)}
    />
  );
}
