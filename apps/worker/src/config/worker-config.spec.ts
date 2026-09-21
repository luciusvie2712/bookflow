import { describe, expect, it } from "vitest";
import { parseWorkerEnvironment } from "./worker-config.js";

describe("worker environment configuration", () => {
  it("fails fast when Redis configuration is absent", () => {
    expect(() => parseWorkerEnvironment({ NODE_ENV: "test" })).toThrow(
      "Invalid worker environment configuration: REDIS_URL",
    );
  });

  it("coerces worker options", () => {
    expect(
      parseWorkerEnvironment({
        NODE_ENV: "test",
        REDIS_URL: "redis://localhost:6379",
        WORKER_QUEUE_ENABLED: "false",
        WORKER_CONCURRENCY: "10",
      }),
    ).toMatchObject({ queueEnabled: false, concurrency: 10 });
  });
});
