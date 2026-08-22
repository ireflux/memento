import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getInvitationBySlug, getVisibleBlessings } from "@/lib/queries";
import { getTemplate } from "@/templates/registry";
import { InvitationShell } from "@/components/blocks/layouts/InvitationShell";
import { FlipLayout } from "@/components/blocks/layouts/FlipLayout";
import { LongLayout } from "@/components/blocks/layouts/StackLayouts";
import { PosterLayout } from "@/components/blocks/layouts/StackLayouts";
import { renderPages } from "@/components/blocks/BlockRenderer";
import { MusicPlayer } from "@/components/blocks/MusicPlayer";
import { ViewTracker } from "@/components/blocks/ViewTracker";

export const dynamic = "force-dynamic";

async function loadInvitation(slug: string) {
  try {
    return await getInvitationBySlug(slug);
  } catch (e) {
    console.error("[invitation] load failed", e);
    return null;
  }
}

export async function generateMetadata({
  params,
}: PageProps<"/i/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const inv = await loadInvitation(slug);
  if (!inv) return { title: "拾光柬" };
  const info = inv.content.info;
  const who =
    "groomName" in info
      ? `${info.groomName} ❤ ${info.brideName}`
      : info.celebrantName;
  const label = inv.sceneType === "wedding" ? "婚礼邀请函" : "生日邀请函";
  return {
    title: `${who}的${label} · 拾光柬`,
    description:
      inv.sceneType === "wedding"
        ? `诚邀您参加 ${who} 的婚礼典礼`
        : `诚邀您参加 ${who} 的生日派对`,
  };
}

export default async function InvitationDisplayPage({
  params,
}: PageProps<"/i/[slug]">) {
  const { slug } = await params;
  const inv = await loadInvitation(slug);
  if (!inv) notFound();

  if (inv.status === "closed") {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-[#f7f4ef] px-6 text-center">
        <div className="text-5xl">🌸</div>
        <h1 className="text-lg tracking-widest text-neutral-700">
          这场活动已结束
        </h1>
        <p className="text-sm text-neutral-500">感谢您的关注与祝福</p>
      </div>
    );
  }

  const template =
    getTemplate(inv.templateId) ??
    getTemplate(inv.sceneType === "wedding" ? "wedding-vermilion" : "birthday-candle")!;
  const content = inv.content;
  const interactive = inv.status === "published";
  const hasBlessingWall = content.pages.some((p) => p.type === "blessing-wall");

  let blessings = [] as Awaited<ReturnType<typeof getVisibleBlessings>>;
  if (hasBlessingWall && slug.length > 0) {
    try {
      blessings = await getVisibleBlessings(inv.id);
    } catch (e) {
      console.error("[invitation] blessings load failed", e);
    }
  }

  const pages = renderPages(content, template.theme, {
    slug,
    interactive,
    editable: false,
    blessings,
  });

  return (
    <InvitationShell theme={template.theme}>
      {inv.status === "draft" ? (
        <div className="fixed inset-x-0 top-0 z-50 bg-black/70 py-1.5 text-center text-xs tracking-[0.3em] text-white backdrop-blur">
          预 览 模 式 · 尚 未 发 布
        </div>
      ) : null}
      <ViewTracker slug={slug} />
      <MusicPlayer trackId={content.info.musicId} />
      {inv.layout === "flip" ? (
        <FlipLayout pages={pages} />
      ) : inv.layout === "long" ? (
        <LongLayout pages={pages} />
      ) : (
        <PosterLayout pages={pages} />
      )}
    </InvitationShell>
  );
}
