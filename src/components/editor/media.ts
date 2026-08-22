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

export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const maxEdge = 2000;
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas unavailable");
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

export async function uploadImage(
  slug: string,
  file: File,
): Promise<string> {
  let blob: Blob = file;
  let ext = "jpg";
  if (file.size > 300 * 1024 || /image\/(png|webp)/.test(file.type)) {
    blob = await compressImage(file);
    ext = "jpg";
  } else {
    ext = file.type === "image/png" ? "png" : "jpg";
  }
  const form = new FormData();
  form.append("slug", slug);
  form.append(
    "file",
    new File([blob], `${Date.now()}.${ext}`, { type: "image/jpeg" }),
  );
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const body = (await res.json()) as { url?: string; error?: { message: string } };
  if (!res.ok || !body.url) {
    throw new Error(body.error?.message ?? "上传失败");
  }
  return body.url;
}
