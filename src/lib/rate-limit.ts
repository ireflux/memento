import "server-only";

/**
 * 进程内滑动窗口限流。
 *
 * 适用场景：自用阶段在 Vercel 单实例上防刷；多实例部署时各实例独立计数，
 * 总量上限约为单实例 limit × 实例数，推广前应替换为共享存储（如 Upstash）。
 *
 * @param now 可注入的当前时间戳（毫秒），仅供测试使用
 * @returns true 表示放行，false 表示已超限应拒绝
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): boolean {
  const hits = (buckets.get(key) ?? []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return false;
  }
  hits.push(now);
  buckets.set(key, hits);

  if (buckets.size > 10_000) {
    for (const [k, v] of buckets) {
      if (v.every((t) => now - t >= windowMs)) buckets.delete(k);
    }
  }
  return true;
}

/** 从代理头中提取客户端 IP（Vercel / Nginx 场景），无头信息时返回 "unknown"。 */
export function clientIpFromHeader(forwarded: string | null): string {
  const first = forwarded?.split(",")[0]?.trim();
  return first || "unknown";
}

const buckets = new Map<string, number[]>();
