import {
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import {
  DEPENDENCY_HEALTH_PROBES,
  type DependencyHealth,
  type DependencyHealthProbes,
  type DependencyName,
} from "../infrastructure/dependency-health.js";

export type Liveness = Readonly<{
  status: "ok";
  timestamp: string;
}>;

export type Readiness = Readonly<{
  status: "ready";
  timestamp: string;
  dependencies: Readonly<Record<DependencyName, DependencyHealth>>;
}>;

@Injectable()
export class HealthService {
  public constructor(
    @Inject(DEPENDENCY_HEALTH_PROBES)
    private readonly probes: DependencyHealthProbes,
  ) {}

  public getLiveness(): Liveness {
    return { status: "ok", timestamp: new Date().toISOString() };
  }

  public async getReadiness(): Promise<Readiness> {
    const [database, redis, objectStorage] = await Promise.all([
      this.runProbe(() => this.probes.checkDatabase()),
      this.runProbe(() => this.probes.checkRedis()),
      this.runProbe(() => this.probes.checkObjectStorage()),
    ]);
    const dependencies = { database, redis, objectStorage } as const;
    const unavailable = Object.entries(dependencies)
      .filter(([, health]) => health.status === "down")
      .map(([name]) => name);

    if (unavailable.length > 0) {
      throw new ServiceUnavailableException({
        code: "DEPENDENCY_UNAVAILABLE",
        message: `Required dependencies unavailable: ${unavailable.join(", ")}`,
        details: { dependencies },
      });
    }

    return {
      status: "ready",
      timestamp: new Date().toISOString(),
      dependencies,
    };
  }

  private async runProbe(
    operation: () => Promise<void>,
  ): Promise<DependencyHealth> {
    const startedAt = performance.now();

    try {
      await operation();
      return {
        status: "up",
        latencyMs: Math.round((performance.now() - startedAt) * 100) / 100,
      };
    } catch (error) {
      return {
        status: "down",
        latencyMs: Math.round((performance.now() - startedAt) * 100) / 100,
        error:
          error instanceof Error ? error.message : "Unknown dependency error",
      };
    }
  }
}
