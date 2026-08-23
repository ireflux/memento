"use client";

import { useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

/** 客户端才可知 origin；SSR 阶段返回空串，水合后自动补全，无水合不一致。 */
function useClientOrigin(): string {
  return useSyncExternalStore(
    emptySubscribe,
    () => window.location.origin,
    () => "",
  );
}

/**
 * 计算分享链接。优先使用部署配置的公开域名（NEXT_PUBLIC_SITE_URL，
 * 构建期内联），保证反向代理/非标准端口下链接仍有效；
 * 未配置时回退到当前页面 origin。
 */
export function useShareUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const origin = useClientOrigin();
  return `${base || origin}${path}`;
}
