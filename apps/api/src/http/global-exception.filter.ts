import {
  Catch,
  HttpException,
  HttpStatus,
  type ArgumentsHost,
  type ExceptionFilter,
} from "@nestjs/common";
import type { HttpAdapterHost } from "@nestjs/core";
import type { ApiFailure } from "@bookflow/types";
import { JsonLogger } from "../logging/json-logger.js";
import type { RequestWithContext } from "./request-context.js";

type ErrorResponse = Readonly<{
  code?: unknown;
  message?: unknown;
  details?: unknown;
}>;

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new JsonLogger();

  public constructor(private readonly adapterHost: HttpAdapterHost) {}

  public catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<RequestWithContext>();
    const response = http.getResponse<unknown>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;
    const errorResponse = this.toErrorResponse(exceptionResponse);
    const fallbackMessage =
      status === HttpStatus.INTERNAL_SERVER_ERROR
        ? "Internal server error"
        : "Request failed";
    const body: ApiFailure = {
      error: {
        code:
          typeof errorResponse.code === "string"
            ? errorResponse.code
            : this.defaultCode(status),
        message:
          typeof errorResponse.message === "string"
            ? errorResponse.message
            : fallbackMessage,
        ...(this.isDetails(errorResponse.details)
          ? { details: errorResponse.details }
          : {}),
      },
      requestId: request.requestId ?? "unknown",
    };

    if (status >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        exception instanceof Error ? exception : new Error(String(exception)),
        "http.request.failed",
      );
    }

    this.adapterHost.httpAdapter.reply(response, body, status);
  }

  private toErrorResponse(value: unknown): ErrorResponse {
    if (typeof value === "string") {
      return { message: value };
    }

    if (typeof value === "object" && value !== null) {
      return value as ErrorResponse;
    }

    return {};
  }

  private isDetails(
    value: unknown,
  ): value is Readonly<Record<string, unknown>> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  private defaultCode(status: number): string {
    return status === HttpStatus.INTERNAL_SERVER_ERROR
      ? "INTERNAL_SERVER_ERROR"
      : `HTTP_${status}`;
  }
}
