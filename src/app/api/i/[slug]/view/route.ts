import { incrementViewCount } from "@/lib/queries";
import { jsonError, ApiError } from "@/lib/api";
import { RATE_LIMITS } from "@/lib/constants";
import { clientIpFromHeader, rateLimit } from "@/lib/rate-limit";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    if (!/^[A-Za-z0-9]{8}$/.test(slug)) {
      throw new ApiError(400, "bad_request", "参数错误");
    }
    const ip = clientIpFromHeader(request.headers.get("x-forwarded-for"));
    // 服务端滑动窗口兜底：客户端 sessionStorage 去重可被绕过
    if (!rateLimit(`view:${slug}:${ip}`, RATE_LIMITS.viewPerMinute, 60_000)) {
      return new Response(null, { status: 204 });
    }
    await incrementViewCount(slug);
    return new Response(null, { status: 204 });
  } catch (e) {
    return jsonError(e);
  }
}
