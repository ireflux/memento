import "server-only";

import { headers } from "next/headers";
import { MAX_CLIENT_IP_LENGTH } from "./constants";
import { clientIpFromHeader } from "./rate-limit";

/**
 * 本次请求的客户端 IP（已限长，可安全用作数据库主键的一部分）。
 *
 * 代理头缺失时回退为 "unknown"：此时所有客户端共享同一限流桶，
 * 属于保守退化（宁可误伤也不放过），不会造成绕过。
 */
export async function currentClientIp(): Promise<string> {
  const hdrs = await headers();
  return clientIpFromHeader(hdrs.get("x-forwarded-for")).slice(
    0,
    MAX_CLIENT_IP_LENGTH,
  );
}
