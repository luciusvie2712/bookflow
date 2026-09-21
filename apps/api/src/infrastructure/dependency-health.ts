export type DependencyName = "database" | "redis" | "objectStorage";

export type DependencyHealth = Readonly<{
  status: "up" | "down";
  latencyMs: number;
  error?: string;
}>;

export interface DependencyHealthProbes {
  checkDatabase(): Promise<void>;
  checkRedis(): Promise<void>;
  checkObjectStorage(): Promise<void>;
}

export const DEPENDENCY_HEALTH_PROBES = Symbol("DEPENDENCY_HEALTH_PROBES");
