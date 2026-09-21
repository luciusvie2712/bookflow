export const REQUEST_ID_HEADER = "x-request-id";

export interface RequestWithContext {
  readonly method: string;
  readonly url: string;
  readonly originalUrl?: string;
  readonly headers: Readonly<
    Record<string, string | readonly string[] | undefined>
  >;
  requestId?: string;
}

export interface ResponseWithContext {
  readonly statusCode: number;
  setHeader(name: string, value: string): void;
  once(event: "finish", listener: () => void): void;
}
