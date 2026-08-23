import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { ImgBedProvider } from "@/lib/storage/imgbed";

const BASE = "https://imgbed.example.com";

function makeProvider() {
  return new ImgBedProvider(BASE, "test-token");
}

function mockFetch(payload: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("ImgBedProvider.upload", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not double the domain when API returns a full URL", async () => {
    const fetchMock = mockFetch([
      { src: `${BASE}/file/memento/demo/1_img.jpg` },
    ]);
    const stored = await makeProvider().upload({
      data: new Uint8Array([1, 2, 3]),
      mime: "image/jpeg",
      fileName: "1_img.jpg",
      folder: "memento/demo",
    });
    expect(stored.url).toBe(`${BASE}/file/memento/demo/1_img.jpg`);
    const requestUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(requestUrl).toContain(`${BASE}/upload?`);
    expect(requestUrl).toContain("returnFormat=full");
  });

  it("joins relative src paths with the base URL", async () => {
    mockFetch([{ src: "/file/memento/demo/2_img.png" }]);
    const stored = await makeProvider().upload({
      data: new Uint8Array([1]),
      mime: "image/png",
      fileName: "2_img.png",
    });
    expect(stored.url).toBe(`${BASE}/file/memento/demo/2_img.png`);
  });

  it("prefers publicUrl when provided", async () => {
    mockFetch([
      { src: "/file/3_img.webp", publicUrl: "https://cdn.example.com/3_img.webp" },
    ]);
    const stored = await makeProvider().upload({
      data: new Uint8Array([1]),
      mime: "image/webp",
      fileName: "3_img.webp",
    });
    expect(stored.url).toBe("https://cdn.example.com/3_img.webp");
  });
});
