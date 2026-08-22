import { notFound, redirect } from "next/navigation";
import { hasManageSession } from "@/lib/auth";
import { getInvitationBySlug } from "@/lib/queries";
import { EditorClient } from "@/components/editor/EditorClient";

export const dynamic = "force-dynamic";

export default async function EditPage({
  params,
}: PageProps<"/edit/[slug]">) {
  const { slug } = await params;
  if (!(await hasManageSession(slug))) {
    redirect(`/access/${slug}?next=/edit/${slug}`);
  }
  const inv = await getInvitationBySlug(slug);
  if (!inv) notFound();

  return (
    <EditorClient
      slug={slug}
      sceneType={inv.sceneType}
      initialTemplateId={inv.templateId}
      status={inv.status}
      initialContent={inv.content}
    />
  );
}
