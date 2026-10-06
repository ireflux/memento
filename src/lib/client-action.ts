"use client";

import type { ActionResult } from "@/lib/action-result";

/**
 * Server Action 的统一异常兜底。
 *
 * Server Action 的业务失败会以 `{ ok: false, message }` 返回，但网络中断、
 * Server Action 序列化失败或服务端抛错会 reject。调用方若不 catch，界面就会
 * 永久停在 pending（例如按钮一直是「提交中…」）。这里统一把异常转成
 * `{ ok: false, message }`，让调用方只需处理一种失败形态。
 */
export const ACTION_FAILED_MESSAGE = "网络异常，请检查网络后重试";

export async function safeAction<T>(
  run: () => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    return await run();
  } catch (e) {
    console.error("[action] unexpected failure", e);
    return { ok: false, message: ACTION_FAILED_MESSAGE };
  }
}
