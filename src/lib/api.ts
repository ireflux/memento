export interface ApiErrorBody {
  error: { code: string; message: string };
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function jsonError(err: unknown): Response {
  if (err instanceof ApiError) {
    return Response.json(
      { error: { code: err.code, message: err.message } } satisfies ApiErrorBody,
      { status: err.status },
    );
  }
  console.error("[api] unexpected error", err);
  return Response.json(
    {
      error: {
        code: "internal_error",
        message: "服务暂时不可用，请稍后再试",
      },
    } satisfies ApiErrorBody,
    { status: 500 },
  );
}

export function okJson<T>(data: T, init?: ResponseInit): Response {
  return Response.json(data, init);
}
