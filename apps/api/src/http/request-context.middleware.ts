import { randomUUID } from "node:crypto";
import { Injectable, type NestMiddleware } from "@nestjs/common";
import { JsonLogger } from "../logging/json-logger.js";
import {
  REQUEST_ID_HEADER,
  type RequestWithContext,
  type ResponseWithContext,
} from "./request-context.js";

const validRequestId = /^[A-Za-z0-9._:-]{1,128}$/;

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
  private readonly logger = new JsonLogger();

  public use(
    request: RequestWithContext,
    response: ResponseWithContext,
    next: () => void,
  ): void {
    const suppliedRequestId = request.headers[REQUEST_ID_HEADER];
    const requestId =
      typeof suppliedRequestId === "string" &&
      validRequestId.test(suppliedRequestId)
        ? suppliedRequestId
        : randomUUID();
    const startedAt = performance.now();

    request.requestId = requestId;
    response.setHeader(REQUEST_ID_HEADER, requestId);
    response.once("finish", () => {
      this.logger.log(
        {
          requestId,
          method: request.method,
          path: request.originalUrl ?? request.url,
          statusCode: response.statusCode,
          durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
        },
        "http.request.completed",
      );
    });

    next();
  }
}
