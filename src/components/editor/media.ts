"use client";

export function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function localInputToIso(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString();
}

/** 输出格式统一为 JPEG（兼容性最好），绘制前铺白底，避免透明 PNG 压出黑背景。 */
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const maxEdge = 2000;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    throw new Error("canvas unavailable");
  }
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("compress failed"))),
      "image/jpeg",
      0.85,
    );
  });
}

interface PreparedUpload {
  blob: Blob;
  fileName: string;
  mime: string;
}

/**
 * 决定上传负载：超过阈值或 png/webp 一律压缩为 JPEG；
 * 其余小文件保持原格式。ext 与 MIME 永远取自同一分支，避免名实不符。
 */
async function prepareUpload(file: File): Promise<PreparedUpload> {
  const shouldCompress =
    file.size > 300 * 1024 || /image\/(png|webp)/.test(file.type);
  if (!shouldCompress && file.type === "image/png") {
    return { blob: file, fileName: `${Date.now()}.png`, mime: "image/png" };
  }
  if (!shouldCompress && file.type === "image/webp") {
    // 小体积 webp 保持原样（服务端白名单允许 webp）
    return { blob: file, fileName: `${Date.now()}.webp`, mime: "image/webp" };
  }
  const blob = shouldCompress ? await compressImage(file) : file;
  return { blob, fileName: `${Date.now()}.jpg`, mime: "image/jpeg" };
}

/** 服务端明确拒绝（4xx/5xx 带错误信息），不应重试。 */
class UploadRejectedError extends Error {}

async function postOnce(slug: string, file: File): Promise<string> {
  const prepared = await prepareUpload(file);
  const form = new FormData();
  form.append("slug", slug);
  form.append(
    "file",
    new File([prepared.blob], prepared.fileName, { type: prepared.mime }),
  );
  const res = await fetch("/api/upload", { method: "POST", body: form });
  let body: { url?: string; error?: { message: string } } = {};
  try {
    body = (await res.json()) as typeof body;
  } catch {
    /* 非 JSON 响应（如网关错误页），走下方统一报错 */
  }
  if (!res.ok || !body.url) {
    throw new UploadRejectedError(body.error?.message ?? "上传失败，请稍后重试");
  }
  return body.url;
}

/** 上传单张图片；网络类失败自动重试一次，服务端拒绝不重试（设计文档 §8.3）。 */
export async function uploadImage(slug: string, file: File): Promise<string> {
  try {
    return await postOnce(slug, file);
  } catch (e) {
    if (e instanceof UploadRejectedError) throw e;
    return postOnce(slug, file);
  }
}
