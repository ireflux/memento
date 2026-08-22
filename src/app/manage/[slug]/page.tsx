import { notFound, redirect } from "next/navigation";
import { hasManageSession } from "@/lib/auth";
import { getAllBlessings, getInvitationBySlug, getRsvps } from "@/lib/queries";
import { ManageClient } from "@/components/manage/ManageClient";

export const dynamic = "force-dynamic";

export default async function ManagePage({
  params,
}: PageProps<"/manage/[slug]">) {
  const { slug } = await params;
  if (!(await hasManageSession(slug))) {
    redirect(`/access/${slug}?next=/manage/${slug}`);
  }
  const inv = await getInvitationBySlug(slug);
  if (!inv) notFound();

  const [rsvpRows, blessingRows] = await Promise.all([
    getRsvps(inv.id),
    getAllBlessings(inv.id),
  ]);

  return (
    <ManageClient
      slug={slug}
      status={inv.status}
      viewCount={inv.viewCount}
      title={
        "groomName" in inv.content.info
          ? `${inv.content.info.groomName} ❤ ${inv.content.info.brideName}`
          : inv.content.info.celebrantName
      }
      rsvps={rsvpRows.map((r) => ({
        id: r.id,
        guestName: r.guestName,
        attending: r.attending,
        partySize: r.partySize,
        phone: r.phone,
        note: r.note,
        createdAt: r.createdAt.toISOString(),
      }))}
      blessings={blessingRows.map((b) => ({
        id: b.id,
        guestName: b.guestName,
        content: b.content,
        hidden: b.status === "hidden",
        createdAt: b.createdAt.toISOString(),
      }))}
    />
  );
}
