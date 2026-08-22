"use client";

import { Component, type ReactNode } from "react";
import type { Block, InvitationContent } from "@/lib/validation/schemas";
import { formatEventDateZh } from "@/lib/format";
import { Decoration } from "./decor";
import { CoverBlock, GalleryBlock, MapBlock, StoryBlock, TextBlock } from "./presentational";
import { CountdownTimer } from "./CountdownTimer";
import { RsvpForm } from "./RsvpForm";
import { BlessingWall } from "./BlessingWall";
import type { PublicBlessing } from "@/lib/queries";
import type { ThemeTokens } from "@/templates/types";

class BlockErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[block] render failed", error);
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

export function BlockRenderer({
  block,
  content,
  theme,
  slug,
  interactive = true,
  editable = false,
  blessings = [],
}: {
  block: Block;
  content: InvitationContent;
  theme: ThemeTokens;
  slug?: string;
  interactive?: boolean;
  editable?: boolean;
  blessings?: PublicBlessing[];
}) {
  return (
    <BlockErrorBoundary>
      <BlockSwitch
        block={block}
        content={content}
        theme={theme}
        slug={slug}
        interactive={interactive}
        editable={editable}
        blessings={blessings}
      />
    </BlockErrorBoundary>
  );
}

function BlockSwitch({
  block,
  content,
  theme,
  slug,
  interactive,
  editable,
  blessings,
}: {
  block: Block;
  content: InvitationContent;
  theme: ThemeTokens;
  slug?: string;
  interactive: boolean;
  editable: boolean;
  blessings: PublicBlessing[];
}) {
  const info = content.info;

  switch (block.type) {
    case "cover": {
      const names =
        "groomName" in info
          ? [info.groomName, info.brideName]
          : [info.celebrantName];
      return (
        <CoverBlock
          names={names}
          dateText={formatEventDateZh(info.eventTime)}
          subtitle={block.subtitle}
          heroImageUrl={block.heroImageUrl}
          decoration={<Decoration kind={theme.decoration} className="w-full text-[var(--tk-primary)]" />}
        />
      );
    }
    case "countdown":
      return <CountdownTimer target={info.eventTime} label={block.label} />;
    case "gallery":
      return <GalleryBlock images={block.images} editable={editable} />;
    case "map":
      return (
        <MapBlock
          venueName={info.venueName}
          venueAddress={info.venueAddress}
          lat={info.lat}
          lng={info.lng}
        />
      );
    case "story":
      return <StoryBlock heading={block.heading} body={block.body} />;
    case "text":
      return <TextBlock heading={block.heading} body={block.body} />;
    case "rsvp-form":
      return (
        <section
          className="rounded-3xl p-6"
          style={{ background: "var(--tk-surface)" }}
        >
          <h2
            className="mb-5 text-center text-xl tracking-[0.3em] text-[var(--tk-text)]"
            style={{ fontFamily: "var(--tk-font-display)" }}
          >
            敬 请 回 执
          </h2>
          {slug ? (
            <RsvpForm slug={slug} note={block.note} interactive={interactive} />
          ) : null}
        </section>
      );
    case "blessing-wall":
      return (
        <BlessingWall
          slug={slug ?? ""}
          title={block.title}
          initial={blessings}
          interactive={interactive && Boolean(slug)}
        />
      );
    default:
      return null;
  }
}

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
