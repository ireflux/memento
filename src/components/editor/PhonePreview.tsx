"use client";

import type { ReactNode } from "react";
import type { LayoutType, InvitationContent } from "@/lib/validation/schemas";
import { getTemplate } from "@/templates/registry";
import { renderPages } from "@/components/blocks/renderPages";
import { InvitationShell } from "@/components/blocks/layouts/InvitationShell";
import { FlipLayout } from "@/components/blocks/layouts/FlipLayout";
import { LongLayout, PosterLayout } from "@/components/blocks/layouts/StackLayouts";

export function PhonePreview({
  slug,
  templateId,
  content,
  interactive = false,
}: {
  slug: string;
  templateId: string;
  content: InvitationContent;
  interactive?: boolean;
}) {
  const template =
    getTemplate(templateId) ??
    getTemplate("wedding-vermilion")!;

  const pages = renderPages(content, template.theme, {
    slug,
    interactive,
    editable: true,
    blessings: [],
  });

  let body: ReactNode;
  if (template.layout === "flip") {
    body = (
      <InvitationShell theme={template.theme} fill>
        <FlipLayout pages={pages} fill />
      </InvitationShell>
    );
  } else {
    const Layout = template.layout === "long" ? LongLayout : PosterLayout;
    body = (
      <div className="h-full overflow-y-auto">
        <InvitationShell theme={template.theme}>
          <Layout pages={pages} />
        </InvitationShell>
      </div>
    );
  }

  return (
    <div className="relative mx-auto w-[300px] rounded-[2.4rem] border-[10px] border-neutral-900 bg-black shadow-2xl">
      <div className="absolute left-1/2 top-2 z-20 h-5 w-24 -translate-x-1/2 rounded-full bg-neutral-900" />
      <div className="h-[600px] overflow-hidden rounded-[1.7rem] bg-white">
        {body}
      </div>
    </div>
  );
}

export function layoutLabel(layout: LayoutType): string {
  return layout === "flip"
    ? "翻页"
    : layout === "long"
      ? "长图"
      : "海报";
}
