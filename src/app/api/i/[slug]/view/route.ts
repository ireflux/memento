import { incrementViewCount } from "@/lib/queries";
import { jsonError, ApiError } from "@/lib/api";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    if (!/^[A-Za-z0-9]{4,16}$/.test(slug)) {
      throw new ApiError(400, "bad_request", "参数错误");
    }
    await incrementViewCount(slug);
    return new Response(null, { status: 204 });
  } catch (e) {
    return jsonError(e);
  }
}
