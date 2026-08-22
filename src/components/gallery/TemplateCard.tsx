import Link from "next/link";
import { Decoration } from "@/components/blocks/decor";
import type { TemplateDef } from "@/templates/types";

export function TemplateCard({
  template,
  usageCount,
  action,
}: {
  template: TemplateDef;
  usageCount: number;
  action: React.ReactNode;
}) {
  const t = template.theme;
  return (
    <div className="group">
      <Link
        href={`/?preview=${template.id}#templates`}
        className="block aspect-[3/4] overflow-hidden rounded-2xl shadow-md shadow-neutral-900/5 transition-transform group-hover:-translate-y-1"
        style={{ background: t.bgGradient, color: t.text }}
        aria-label={`${template.name} 模板预览`}
      >
        <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
          <div style={{ color: t.primary }} className="w-12">
            <Decoration kind={t.decoration} className="w-full" />
          </div>
          <p
            className="text-lg leading-snug"
            style={{ fontFamily: t.fontDisplay }}
          >
            {template.scene === "wedding" ? "沈星回 · 顾时夜" : "小满"}
          </p>
          <div className="h-px w-10 bg-current opacity-30" />
          <p className="text-[10px] tracking-[0.3em] opacity-70">
            {template.layout === "flip"
              ? "翻页请柬"
              : template.layout === "long"
                ? "长图请柬"
                : "海报请柬"}
          </p>
        </div>
      </Link>
      <div className="mt-2.5 px-1">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="font-medium text-neutral-800">{template.name}</h3>
          <span className="text-xs text-neutral-400">
            {usageCount > 0 ? `${usageCount} 人使用` : "新品"}
          </span>
        </div>
        <p className="mt-0.5 truncate text-xs text-neutral-500">
          {template.tagline}
        </p>
        <div className="mt-2.5">{action}</div>
      </div>
    </div>
  );
}
