import type { ReactNode } from "react";
import type { InvitationContent } from "@/lib/validation/schemas";
import type { PublicBlessing } from "@/lib/queries";
import type { ThemeTokens } from "@/templates/types";
import { BlockRenderer } from "./BlockRenderer";

export function renderPages(
  content: InvitationContent,
  theme: ThemeTokens,
  options: {
    slug?: string;
    interactive?: boolean;
    editable?: boolean;
    blessings?: PublicBlessing[];
  } = {},
): ReactNode[] {
  return content.pages.map((block, i) => (
    <BlockRenderer
      key={`${block.type}-${i}`}
      block={block}
      content={content}
      theme={theme}
      {...options}
    />
  ));
}
