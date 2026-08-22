export interface UploadInput {
  data: Uint8Array;
  mime: string;
  fileName: string;
  folder?: string;
}

export interface StoredFile {
  url: string;
}

export class StorageError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "StorageError";
  }
}

export interface StorageProvider {
  upload(input: UploadInput): Promise<StoredFile>;
}
