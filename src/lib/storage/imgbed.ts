import "server-only";
import { StorageError, type StorageProvider, type StoredFile, type UploadInput } from "./types";

export class ImgBedProvider implements StorageProvider {
  constructor(
    private readonly baseUrl: string,
    private readonly token: string,
  ) {}

  async upload({
    data,
    mime,
    fileName,
    folder,
  }: UploadInput): Promise<StoredFile> {
    const params = new URLSearchParams({
      returnFormat: "full",
      serverCompress: "false",
    });
    if (folder) params.set("uploadFolder", folder);

    const form = new FormData();
    form.append(
      "file",
      new Blob([new Uint8Array(data)], { type: mime }),
      fileName,
    );

    let res: Response;
    try {
      res = await fetch(`${this.baseUrl}/upload?${params.toString()}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.token}` },
        body: form,
      });
    } catch (cause) {
      throw new StorageError(`存储服务不可达: ${String(cause)}`);
    }

    if (!res.ok) {
      throw new StorageError(
        `存储服务返回 ${res.status}`,
        res.status,
      );
    }

    const payload = (await res.json()) as Array<{
      src?: string;
      publicUrl?: string;
    }>;
    const first = Array.isArray(payload) ? payload[0] : undefined;
    if (!first) {
      throw new StorageError("存储服务响应格式异常");
    }
    const url =
      first.publicUrl ??
      (first.src ? `${this.baseUrl}${first.src}` : undefined);
    if (!url) {
      throw new StorageError("存储服务未返回文件地址");
    }
    return { url };
  }
}
