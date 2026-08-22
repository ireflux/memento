import { describe, expect, it } from "vitest";
import {
  blessingInputSchema,
  countImages,
  parseContent,
  rsvpInputSchema,
  safeParseContent,
} from "@/lib/validation/schemas";

const weddingContent = {
  info: {
    groomName: "沈星回",
    brideName: "顾时夜",
    eventTime: new Date("2026-10-01T18:00:00+08:00").toISOString(),
    venueName: "临水轩宴会厅",
    venueAddress: "杭州市西湖区某路 1 号",
  },
  pages: [
    { type: "cover", subtitle: "WE ARE GETTING MARRIED" },
    { type: "countdown" },
    {
      type: "gallery",
      images: [{ url: "https://example.com/a.jpg" }],
    },
    { type: "map" },
    { type: "rsvp-form" },
    { type: "blessing-wall", title: "祝福墙" },
  ],
};

describe("parseContent", () => {
  it("accepts valid wedding content", () => {
    const parsed = parseContent("wedding", weddingContent);
    expect(parsed.info.groomName).toBe("沈星回");
    expect(parsed.pages).toHaveLength(6);
  });

  it("rejects wedding content missing brideName", () => {
    const bad = {
      ...weddingContent,
      info: { ...weddingContent.info, brideName: "" },
    };
    expect(safeParseContent("wedding", bad).success).toBe(false);
  });

  it("rejects scene mismatch (birthday schema on wedding data)", () => {
    expect(safeParseContent("birthday", weddingContent).success).toBe(false);
  });

  it("rejects invalid eventTime", () => {
    const bad = {
      ...weddingContent,
      info: { ...weddingContent.info, eventTime: "not-a-date" },
    };
    expect(safeParseContent("wedding", bad).success).toBe(false);
  });

  it("enforces max pages", () => {
    const manyPages = Array.from({ length: 13 }, () => ({
      type: "text" as const,
      body: "x",
    }));
    const bad = { ...weddingContent, pages: manyPages };
    expect(safeParseContent("wedding", bad).success).toBe(false);
  });

  it("rejects unknown block types", () => {
    const bad = {
      ...weddingContent,
      pages: [...weddingContent.pages, { type: "hacker-block" }],
    };
    expect(safeParseContent("wedding", bad).success).toBe(false);
  });

  it("accepts valid birthday content", () => {
    const parsed = parseContent("birthday", {
      info: {
        celebrantName: "小满",
        eventTime: new Date("2026-09-09T19:00:00+08:00").toISOString(),
        venueName: "蜜桃咖啡馆",
        venueAddress: "",
      },
      pages: [
        { type: "cover" },
        { type: "text", heading: "写给你", body: "生日快乐！" },
      ],
    });
    expect(parsed.info.celebrantName).toBe("小满");
  });
});

describe("rsvpInputSchema", () => {
  it("coerces partySize and trims guestName", () => {
    const parsed = rsvpInputSchema.parse({
      guestName: "  王小明 ",
      attending: "yes",
      partySize: "3",
      phone: "",
    });
    expect(parsed.guestName).toBe("王小明");
    expect(parsed.partySize).toBe(3);
    expect(parsed.phone).toBe("");
  });

  it("rejects over-long names and bad phones", () => {
    expect(
      rsvpInputSchema.safeParse({
        guestName: "x".repeat(21),
        attending: "yes",
      }).success,
    ).toBe(false);
    expect(
      rsvpInputSchema.safeParse({
        guestName: "张三",
        attending: "yes",
        phone: "abc!!",
      }).success,
    ).toBe(false);
  });

  it("rejects invalid attending values", () => {
    expect(
      rsvpInputSchema.safeParse({ guestName: "张三", attending: "sure" })
        .success,
    ).toBe(false);
  });
});

describe("blessingInputSchema", () => {
  it("rejects empty content", () => {
    expect(
      blessingInputSchema.safeParse({ guestName: "李四", content: "  " })
        .success,
    ).toBe(false);
  });
});

describe("countImages", () => {
  it("counts gallery images plus cover hero", () => {
    const content = parseContent("wedding", {
      ...weddingContent,
      pages: [
        {
          type: "cover",
          heroImageUrl: "https://example.com/hero.jpg",
        },
        {
          type: "gallery",
          images: [
            { url: "https://example.com/1.jpg" },
            { url: "https://example.com/2.jpg" },
          ],
        },
      ],
    });
    expect(countImages(content)).toBe(3);
  });
});
