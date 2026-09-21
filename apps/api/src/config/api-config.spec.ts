import { describe, expect, it } from "vitest";
import { parseApiEnvironment } from "./api-config.js";

const validEnvironment: NodeJS.ProcessEnv = {
  NODE_ENV: "test",
  DATABASE_URL: "postgresql://bookflow:password@localhost:5432/bookflow",
  REDIS_URL: "redis://localhost:6379",
  STORAGE_ENDPOINT: "http://localhost:9000",
  STORAGE_BUCKET: "bookflow-test",
  STORAGE_ACCESS_KEY_ID: "test-access-key",
  STORAGE_SECRET_ACCESS_KEY: "test-secret-key",
  CORS_ORIGINS: "http://localhost:3000",
  JWT_ACCESS_SECRET: "a".repeat(32),
  JWT_REFRESH_SECRET: "r".repeat(32),
};

describe("API environment configuration", () => {
  it("fails fast when a required server secret is missing", () => {
    const missingSecret = {
      ...validEnvironment,
      JWT_ACCESS_SECRET: undefined,
    };

    expect(() => parseApiEnvironment(missingSecret)).toThrow(
      "Invalid API environment configuration: JWT_ACCESS_SECRET",
    );
  });

  it("parses public server settings without exposing raw environment keys", () => {
    const config = parseApiEnvironment(validEnvironment);

    expect(config).toMatchObject({
      nodeEnv: "test",
      port: 4000,
      corsOrigins: ["http://localhost:3000"],
    });
    expect(config.jwt.accessSecret).toHaveLength(32);
  });
});
