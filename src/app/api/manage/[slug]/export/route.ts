import { hasManageSession } from "@/lib/auth";
import { jsonError, ApiError } from "@/lib/api";
import { getInvitationBySlug, getRsvps } from "@/lib/queries";
import { toCsv } from "@/lib/csv";

const ATTENDING_TEXT: Record<string, string> = {
  yes: "出席",
  no: "不出席",
  maybe: "待定",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    if (!/^[A-Za-z0-9]{8}$/.test(slug)) {
      throw new ApiError(400, "bad_request", "参数错误");
    }
    if (!(await hasManageSession(slug))) {
      throw new ApiError(403, "forbidden", "请先输入管理码");
    }
    const inv = await getInvitationBySlug(slug);
    if (!inv) throw new ApiError(404, "not_found", "请柬不存在");

    const rows = await getRsvps(inv.id);
    const csv = toCsv(
      ["姓名", "是否出席", "人数", "手机号", "备注", "提交时间"],
      rows.map((r) => [
        r.guestName,
        ATTENDING_TEXT[r.attending] ?? r.attending,
        r.partySize,
        r.phone ?? "",
        r.note ?? "",
        r.createdAt.toISOString().replace("T", " ").slice(0, 16),
      ]),
    );

    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rsvps-${slug}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return jsonError(e);
  }
}
