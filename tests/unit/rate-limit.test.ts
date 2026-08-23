import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { clientIpFromHeader, rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  // 各用例使用互不重叠的 key，模块级桶无需清理

  it("allows up to limit then blocks within window", () => {
    let now = 1_000_000;
    const key = "k1";
    expect(rateLimit(key, 3, 60_000, now)).toBe(true);
    expect(rateLimit(key, 3, 60_000, now + 1)).toBe(true);
    expect(rateLimit(key, 3, 60_000, now + 2)).toBe(true);
    expect(rateLimit(key, 3, 60_000, now + 3)).toBe(false);

    // 窗口滑过后恢复放行
    now += 61_000;
    expect(rateLimit(key, 3, 60_000, now)).toBe(true);
  });

  it("keys are isolated", () => {
    const now = 5_000_000;
    for (let i = 0; i < 5; i++) {
      expect(rateLimit("a", 5, 60_000, now + i)).toBe(true);
    }
    expect(rateLimit("a", 5, 60_000, now + 99)).toBe(false);
    expect(rateLimit("b", 5, 60_000, now)).toBe(true);
  });
});

describe("clientIpFromHeader", () => {
  it("takes the first entry of x-forwarded-for", () => {
    expect(clientIpFromHeader("1.2.3.4, 10.0.0.1")).toBe("1.2.3.4");
  });

  it("trims whitespace and falls back to unknown", () => {
    expect(clientIpFromHeader("  1.2.3.4 ")).toBe("1.2.3.4");
    expect(clientIpFromHeader(null)).toBe("unknown");
    expect(clientIpFromHeader("")).toBe("unknown");
  });
});
