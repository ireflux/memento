import { describe, expect, it } from "vitest";
import {
  generateManageCode,
  generateSlug,
  hashCode,
  manageCookieName,
  signManageToken,
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
  it("round-trips a valid code", () => {
    const stored = hashCode("K7Q2M9");
    expect(stored).not.toContain("K7Q2M9");
    expect(verifyCode("K7Q2M9", stored)).toBe(true);
  });

  it("rejects wrong code", () => {
    const stored = hashCode("AAAAAA");
    expect(verifyCode("BBBBBB", stored)).toBe(false);
  });

  it("rejects malformed stored value", () => {
    expect(verifyCode("AAAAAA", "garbage")).toBe(false);
    expect(verifyCode("AAAAAA", "")).toBe(false);
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

  it("uses per-slug cookie names", () => {
    expect(manageCookieName("abc12345")).toBe("mng_abc12345");
  });
});
