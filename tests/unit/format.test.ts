import { describe, expect, it } from "vitest";
import {
  formatDateTimeMinute,
  formatDateTimeShort,
  formatEventDateZh,
} from "@/lib/format";

const UTC_10AM_SHANGHAI_6PM = "2026-10-01T10:00:00.000Z";
const UTC_4PM_SHANGHAI_MIDNIGHT = "2026-10-01T16:00:00.000Z";

// 断言刻意容忍分隔符差异（不同 ICU 版本可能输出 2026-10-01 / 2026/10/01 / 2026年10月01日），
// 但仍然钉死「日期」与「本地时间」两个真正要验证的部分。
const YMD = /2026[-/年]10[-/月]0?1/;

describe("formatDateTimeMinute", () => {
  it("converts UTC to Asia/Shanghai instead of printing UTC", () => {
    const text = formatDateTimeMinute(UTC_10AM_SHANGHAI_6PM);
    expect(text).toMatch(YMD);
    expect(text).toContain("18:00");
    expect(text).not.toContain("10:00");
  });

  it("renders midnight as 00:00, never 24:00", () => {
    const text = formatDateTimeMinute(UTC_4PM_SHANGHAI_MIDNIGHT);
    expect(text).toMatch(/2026[-/年]10[-/月]0?2/);
    expect(text).toContain("00:00");
    expect(text).not.toContain("24:00");
  });

  it("returns an empty cell for invalid input", () => {
    expect(formatDateTimeMinute("not-a-date")).toBe("");
  });
});

describe("formatDateTimeShort", () => {
  it("uses the same timezone as the export formatter", () => {
    expect(formatDateTimeShort(UTC_10AM_SHANGHAI_6PM)).toContain("18:00");
  });

  it("renders midnight as 00:00, never 24:00", () => {
    expect(formatDateTimeShort(UTC_4PM_SHANGHAI_MIDNIGHT)).toContain("00:00");
  });

  it("returns an empty string for invalid input", () => {
    expect(formatDateTimeShort("nope")).toBe("");
  });
});

describe("formatEventDateZh", () => {
  it("renders a Chinese long-form date with the local time", () => {
    const text = formatEventDateZh(UTC_10AM_SHANGHAI_6PM);
    expect(text).toContain("2026");
    expect(text).toContain("18:00");
    expect(text).toContain("·");
  });

  it("returns an empty string for invalid input", () => {
    expect(formatEventDateZh("nope")).toBe("");
  });
});
