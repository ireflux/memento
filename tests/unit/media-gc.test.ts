import { describe, expect, it } from "vitest";
import { collectImageUrls, unreferencedImageUrls } from "@/lib/media-gc";
import { parseContent } from "@/lib/validation/schemas";

function wedding(pages: unknown[]) {
  return parseContent("wedding", {
    info: {
      groomName: "沈星回",
      brideName: "顾时夜",
      eventTime: new Date("2026-10-01T18:00:00+08:00").toISOString(),
      venueName: "宴会厅",
      venueAddress: "",
    },
    pages,
  });
}

const URL_A = "https://img.example.com/a.jpg";
const URL_B = "https://img.example.com/b.jpg";
const URL_HERO = "https://img.example.com/hero.jpg";

describe("collectImageUrls", () => {
  it("collects gallery images and the cover hero", () => {
    const content = wedding([
      { type: "cover", heroImageUrl: URL_HERO },
      { type: "gallery", images: [{ url: URL_A }, { url: URL_B, caption: "x" }] },
      { type: "text", body: "没有图片" },
    ]);
    expect([...collectImageUrls(content)].sort()).toEqual(
      [URL_A, URL_B, URL_HERO].sort(),
    );
  });

  it("deduplicates the same url used twice", () => {
    const content = wedding([
      { type: "gallery", images: [{ url: URL_A }] },
      { type: "cover", heroImageUrl: URL_A },
    ]);
    expect(collectImageUrls(content).size).toBe(1);
  });

  it("ignores malformed content instead of throwing", () => {
    expect(collectImageUrls({ pages: null } as never).size).toBe(0);
    expect(collectImageUrls(null as never).size).toBe(0);
    expect(collectImageUrls({ pages: [null, 7] } as never).size).toBe(0);
  });
});

describe("unreferencedImageUrls", () => {
  it("reclaims registered urls that the new content dropped", () => {
    const after = wedding([{ type: "gallery", images: [{ url: URL_A }] }]);
    expect(unreferencedImageUrls([URL_A, URL_B], after)).toEqual([URL_B]);
  });

  it("reclaims a removed cover hero", () => {
    const after = wedding([{ type: "cover" }]);
    expect(unreferencedImageUrls([URL_HERO], after)).toEqual([URL_HERO]);
  });

  it("reclaims everything when a whole gallery block is deleted", () => {
    const after = wedding([{ type: "text", body: "换成了文字" }]);
    expect(
      unreferencedImageUrls([URL_A, URL_B, URL_HERO], after).sort(),
    ).toEqual([URL_A, URL_B, URL_HERO].sort());
  });

  it("reclaims orphans that were never part of any saved content", () => {
    // 上传成功但内容一直没落库：这类登记不属于旧内容，只按「是否仍被引用」判定才清得掉
    const after = wedding([{ type: "gallery", images: [{ url: URL_A }] }]);
    expect(unreferencedImageUrls([URL_A, URL_B], after)).toEqual([URL_B]);
  });

  it("keeps every url still referenced", () => {
    const after = wedding([
      { type: "cover", heroImageUrl: URL_HERO },
      { type: "gallery", images: [{ url: URL_A }] },
    ]);
    expect(unreferencedImageUrls([URL_A, URL_HERO], after)).toEqual([]);
  });

  it("keeps a url whose caption was only edited", () => {
    const after = wedding([
      { type: "gallery", images: [{ url: URL_A, caption: "新" }] },
    ]);
    expect(unreferencedImageUrls([URL_A], after)).toEqual([]);
  });

  it("returns nothing when nothing is registered", () => {
    const after = wedding([{ type: "gallery", images: [{ url: URL_A }] }]);
    expect(unreferencedImageUrls([], after)).toEqual([]);
  });
});
