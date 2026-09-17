import type { ApiFailure, ApiSuccess } from "@bookflow/types";
import { ApiError } from "./errors.js";

export type RequestOptions = Readonly<{
  headers?: Readonly<Record<string, string>>;
  signal?: AbortSignal;
}>;

export type BookFlowApiClientOptions = Readonly<{
  baseUrl: string;
  fetchImplementation?: typeof fetch;
  getAccessToken?: () => string | undefined | Promise<string | undefined>;
}>;

export class BookFlowApiClient {
  readonly #baseUrl: string;
  readonly #fetch: typeof fetch;
  readonly #getAccessToken:
    (() => string | undefined | Promise<string | undefined>) | undefined;

  public constructor(options: BookFlowApiClientOptions) {
    this.#baseUrl = options.baseUrl.replace(/\/$/, "");
    this.#fetch = options.fetchImplementation ?? fetch;
    this.#getAccessToken = options.getAccessToken;
  }

  public async get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return this.request<T>("GET", path, undefined, options);
  }

  public async post<TResponse, TBody>(
    path: string,
    body: TBody,
    options: RequestOptions = {},
  ): Promise<TResponse> {
    return this.request<TResponse>("POST", path, body, options);
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body: unknown,
    options: RequestOptions,
  ): Promise<T> {
    const accessToken = await this.#getAccessToken?.();
    const headers = new Headers(options.headers);
    headers.set("accept", "application/json");

    if (body !== undefined) {
      headers.set("content-type", "application/json");
    }

    if (accessToken !== undefined) {
      headers.set("authorization", `Bearer ${accessToken}`);
    }

    const requestInit: RequestInit = {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      ...(options.signal === undefined ? {} : { signal: options.signal }),
    };
    const response = await this.#fetch(`${this.#baseUrl}${path}`, requestInit);
    const payload: unknown = await response.json();

    if (!response.ok) {
      const failure = payload as ApiFailure;
      throw new ApiError(response.status, failure.requestId, failure.error);
    }

    return (payload as ApiSuccess<T>).data;
  }
}
