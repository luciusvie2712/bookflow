import type { ApiErrorBody } from "@bookflow/types";

export class ApiError extends Error {
  public constructor(
    public readonly status: number,
    public readonly requestId: string | undefined,
    public readonly body: ApiErrorBody,
  ) {
    super(body.message);
    this.name = "ApiError";
  }
}
