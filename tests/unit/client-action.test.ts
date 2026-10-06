import { describe, expect, it, vi } from "vitest";
import { ACTION_FAILED_MESSAGE, safeAction } from "@/lib/client-action";

describe("safeAction", () => {
  it("passes through a successful result", async () => {
    const res = await safeAction(async () => ({ ok: true, data: "x" }));
    expect(res.ok).toBe(true);
    expect(res.data).toBe("x");
  });

  it("passes through a business failure unchanged", async () => {
    const res = await safeAction(async () => ({ ok: false, message: "管理码不正确" }));
    expect(res.ok).toBe(false);
    expect(res.message).toBe("管理码不正确");
  });

  it("converts a rejection into a retryable failure", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    // 服务端抛错 / 网络中断会让 Server Action reject：
    // 不兜住的话按钮会永远停在 pending
    const res = await safeAction(async () => {
      throw new Error("network down");
    });
    expect(res.ok).toBe(false);
    expect(res.message).toBe(ACTION_FAILED_MESSAGE);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});
