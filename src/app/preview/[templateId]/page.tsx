import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { buildDemoContent, TEMPLATES } from "@/templates/registry";
import { getTemplate } from "@/templates/registry";
import { InvitationShell } from "@/components/blocks/layouts/InvitationShell";
import { FlipLayout } from "@/components/blocks/layouts/FlipLayout";
import { LongLayout, PosterLayout } from "@/components/blocks/layouts/StackLayouts";
import { renderPages } from "@/components/blocks/renderPages";

/** 纯静态预览（无数据库访问），随构建预渲染全部模板 */
export function generateStaticParams() {
  return TEMPLATES.map((t) => ({ templateId: t.id }));
}

export async function generateMetadata({
  params,
}: PageProps<"/preview/[templateId]">): Promise<Metadata> {
  const { templateId } = await params;
  const template = getTemplate(templateId);
  return {
    title: template
      ? `${template.name} · 模板预览 · 拾光柬`
      : "模板预览 · 拾光柬",
    robots: { index: false },
  };
}

export default async function TemplatePreviewPage({
  params,
}: PageProps<"/preview/[templateId]">) {
  const { templateId } = await params;
  const template = getTemplate(templateId);
  if (!template) notFound();

  const content = buildDemoContent(template);
  const pages = renderPages(content, template.theme, {
    interactive: false,
    editable: false,
    blessings: [],
  });

  return (
    <div>
      <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-between bg-neutral-900/85 px-4 py-2 text-xs text-white backdrop-blur">
        <span className="tracking-[0.3em]">模板预览 · {template.name}</span>
        <Link
          href="/#templates"
          className="rounded-full bg-white px-4 py-1.5 font-medium text-neutral-900"
        >
          用这套制作 →
        </Link>
      </div>
      <InvitationShell theme={template.theme} className="pt-9">
        {template.layout === "flip" ? (
          <FlipLayout pages={pages} />
        ) : template.layout === "long" ? (
          <LongLayout pages={pages} />
        ) : (
          <PosterLayout pages={pages} />
        )}
      </InvitationShell>
    </div>
  );
}
