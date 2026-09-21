import { ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { DependencyHealthProbes } from "../infrastructure/dependency-health.js";
import { HealthService } from "./health.service.js";

function createProbes(): DependencyHealthProbes {
  return {
    checkDatabase: vi.fn().mockResolvedValue(undefined),
    checkRedis: vi.fn().mockResolvedValue(undefined),
    checkObjectStorage: vi.fn().mockResolvedValue(undefined),
  };
}

describe("HealthService", () => {
  it("reports ready when every dependency responds", async () => {
    const service = new HealthService(createProbes());

    await expect(service.getReadiness()).resolves.toMatchObject({
      status: "ready",
      dependencies: {
        database: { status: "up" },
        redis: { status: "up" },
        objectStorage: { status: "up" },
      },
    });
  });

  it("fails readiness when the database is unavailable", async () => {
    const probes = createProbes();
    vi.mocked(probes.checkDatabase).mockRejectedValue(
      new Error("database unavailable"),
    );
    const service = new HealthService(probes);

    await expect(service.getReadiness()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
