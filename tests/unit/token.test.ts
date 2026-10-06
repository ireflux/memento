import { describe, expect, it, vi } from "vitest";
import {
  generateManageCode,
  generateSlug,
  hashCode,
  manageCookieName,
  signManageToken,
  slugFromPath,
  verifyCode,
  verifyManageToken,
} from "@/lib/token";

describe("generateSlug", () => {
  it("produces 8-char base62 slugs", () => {
    const slug = generateSlug();
    expect(slug).toMatch(/^[A-Za-z0-9]{8}$/);
    expect(new Set([generateSlug(), generateSlug()]).size).toBe(2);
  });
});

describe("generateManageCode", () => {
  it("produces 6-char codes without confusable characters", () => {
    for (let i = 0; i < 20; i++) {
      expect(generateManageCode()).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
    }
  });
});

describe("hashCode / verifyCode", () => {
  it("round-trips a valid code", async () => {
    const stored = await hashCode("K7Q2M9");
    expect(stored).not.toContain("K7Q2M9");
    await expect(verifyCode("K7Q2M9", stored)).resolves.toBe(true);
  });

  it("rejects wrong code", async () => {
    const stored = await hashCode("AAAAAA");
    await expect(verifyCode("BBBBBB", stored)).resolves.toBe(false);
  });

  it("rejects malformed stored value", async () => {
    await expect(verifyCode("AAAAAA", "garbage")).resolves.toBe(false);
    await expect(verifyCode("AAAAAA", "")).resolves.toBe(false);
    await expect(verifyCode("AAAAAA", ":")).resolves.toBe(false);
    // 非 hex 内容会得到空 buffer，keylen=0 在 scrypt 中报错 → false 而非抛错
    await expect(verifyCode("AAAAAA", "zzzz:zzzz")).resolves.toBe(false);
  });

  it("uses a per-code salt", async () => {
    const [a, b] = await Promise.all([hashCode("AAAAAA"), hashCode("AAAAAA")]);
    expect(a).not.toBe(b);
  });
});

describe("manage token", () => {
  it("signs and verifies for the same slug", () => {
    const token = signManageToken("abc12345");
    expect(verifyManageToken(token, "abc12345")).toBe(true);
  });

  it("rejects other slugs", () => {
    const token = signManageToken("abc12345");
    expect(verifyManageToken(token, "zzzzzzzz")).toBe(false);
  });

  it("rejects tampered payload", () => {
    const token = signManageToken("abc12345");
    const [body, sig] = token.split(".");
    const forged = Buffer.from(
      JSON.stringify({ s: "hacked000", e: Date.now() + 99999 }),
    ).toString("base64url");
    expect(verifyManageToken(`${forged}.${sig}`, "hacked000")).toBe(false);
    expect(verifyManageToken(`${body}.badsig`, "abc12345")).toBe(false);
    expect(verifyManageToken(undefined, "abc12345")).toBe(false);
    expect(verifyManageToken("not-a-token", "abc12345")).toBe(false);
  });

  it("rejects an expired token", () => {
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
      const token = signManageToken("abc12345");
      expect(verifyManageToken(token, "abc12345")).toBe(true);
      // 推进到 7 天有效期之后
      vi.setSystemTime(new Date("2026-01-09T00:00:00Z"));
      expect(verifyManageToken(token, "abc12345")).toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });

  it("uses per-slug cookie names", () => {
    expect(manageCookieName("abc12345")).toBe("mng_abc12345");
  });
});

describe("slugFromPath", () => {
  it("extracts the slug from guarded routes", () => {
    expect(slugFromPath("/edit/abc12345")).toBe("abc12345");
    expect(slugFromPath("/manage/abc12345")).toBe("abc12345");
    expect(slugFromPath("/access/abc12345")).toBe("abc12345");
  });

  it("ignores other routes and wrong-length slugs", () => {
    expect(slugFromPath("/i/abc12345")).toBeNull();
    expect(slugFromPath("/")).toBeNull();
    expect(slugFromPath("/edit/short")).toBeNull();
    expect(slugFromPath("/edit/toolongslug")).toBeNull();
    expect(slugFromPath("/edit/abc-2345")).toBeNull();
  });
});
