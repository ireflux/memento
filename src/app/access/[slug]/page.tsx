import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getInvitationBySlug } from "@/lib/queries";
import { hasManageSession } from "@/lib/auth";
import { CodeGateForm } from "@/components/access/CodeGateForm";

export const dynamic = "force-dynamic";

function safeNext(
  raw: string | string[] | undefined,
  fallback: string,
): string {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (!value) return fallback;
  if (!value.startsWith("/") || value.startsWith("//")) return fallback;
  return value;
}

export default async function AccessPage({
  params,
  searchParams,
}: PageProps<"/access/[slug]">) {
  const { slug } = await params;
  const sp = await searchParams;

  const next = safeNext(sp.next, `/edit/${slug}`);
  if (!next.startsWith("/edit/") && !next.startsWith("/manage/")) {
    redirect(`/edit/${slug}`);
  }

  // 已持有有效会话时不再要求重复输码
  if (await hasManageSession(slug)) {
    redirect(next);
  }

  // 查询异常向上抛给 error.tsx；仅「确认无此请柬」才渲染 404
  const inv = await getInvitationBySlug(slug);
  if (!inv) notFound();

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-[#faf7f2] px-6">
      <div className="text-center">
        <h1 className="font-serif text-3xl tracking-[0.3em] text-[#8f1f1f]">
          拾光柬
        </h1>
        <p className="mt-2 text-xs tracking-[0.4em] text-neutral-400">
          MEMENTO
        </p>
      </div>
      <CodeGateForm slug={slug} next={next} />
      <Link href="/" className="text-xs text-neutral-400 underline">
        返回首页
      </Link>
    </div>
  );
}
