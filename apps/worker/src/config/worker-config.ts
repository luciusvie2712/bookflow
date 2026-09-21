import { z } from "zod";

const booleanStringSchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const workerEnvironmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  LOG_LEVEL: z.enum(["debug", "log", "warn", "error", "fatal"]).default("log"),
  REDIS_URL: z.string().url().startsWith("redis://"),
  WORKER_QUEUE_ENABLED: booleanStringSchema.default(true),
  WORKER_CONCURRENCY: z.coerce.number().int().min(1).max(100).default(5),
});

export type WorkerConfig = Readonly<{
  nodeEnv: z.infer<typeof workerEnvironmentSchema>["NODE_ENV"];
  logLevel: z.infer<typeof workerEnvironmentSchema>["LOG_LEVEL"];
  redisUrl: string;
  queueEnabled: boolean;
  concurrency: number;
}>;

export function parseWorkerEnvironment(
  source: NodeJS.ProcessEnv,
): WorkerConfig {
  const result = workerEnvironmentSchema.safeParse(source);

  if (!result.success) {
    const fields = result.error.issues
      .map((issue) => issue.path.join(".") || "environment")
      .sort()
      .join(", ");
    throw new Error(`Invalid worker environment configuration: ${fields}`);
  }

  return {
    nodeEnv: result.data.NODE_ENV,
    logLevel: result.data.LOG_LEVEL,
    redisUrl: result.data.REDIS_URL,
    queueEnabled: result.data.WORKER_QUEUE_ENABLED,
    concurrency: result.data.WORKER_CONCURRENCY,
  };
}
