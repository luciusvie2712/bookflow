import { z } from "zod";

const booleanStringSchema = z
  .enum(["true", "false"])
  .transform((value) => value === "true");

const corsOriginsSchema = z
  .string()
  .transform((value) =>
    value
      .split(",")
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
  )
  .pipe(z.array(z.string().url()).min(1));

const apiEnvironmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  API_HOST: z.string().min(1).default("0.0.0.0"),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  LOG_LEVEL: z.enum(["debug", "log", "warn", "error", "fatal"]).default("log"),
  DATABASE_URL: z.string().url().startsWith("postgresql://"),
  REDIS_URL: z.string().url().startsWith("redis://"),
  STORAGE_ENDPOINT: z.string().url(),
  STORAGE_REGION: z.string().min(1).default("us-east-1"),
  STORAGE_BUCKET: z.string().min(3),
  STORAGE_ACCESS_KEY_ID: z.string().min(1),
  STORAGE_SECRET_ACCESS_KEY: z.string().min(8),
  STORAGE_FORCE_PATH_STYLE: booleanStringSchema.default(true),
  CORS_ORIGINS: corsOriginsSchema,
  SWAGGER_ENABLED: booleanStringSchema.default(true),
  JWT_ACCESS_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
});

export type ApiConfig = Readonly<{
  nodeEnv: z.infer<typeof apiEnvironmentSchema>["NODE_ENV"];
  host: string;
  port: number;
  logLevel: z.infer<typeof apiEnvironmentSchema>["LOG_LEVEL"];
  databaseUrl: string;
  redisUrl: string;
  storage: Readonly<{
    endpoint: string;
    region: string;
    bucket: string;
    accessKeyId: string;
    secretAccessKey: string;
    forcePathStyle: boolean;
  }>;
  corsOrigins: readonly string[];
  swaggerEnabled: boolean;
  jwt: Readonly<{
    accessSecret: string;
    refreshSecret: string;
  }>;
}>;

export function parseApiEnvironment(source: NodeJS.ProcessEnv): ApiConfig {
  const result = apiEnvironmentSchema.safeParse(source);

  if (!result.success) {
    const fields = result.error.issues
      .map((issue) => issue.path.join(".") || "environment")
      .sort()
      .join(", ");

    throw new Error(`Invalid API environment configuration: ${fields}`);
  }

  const environment = result.data;

  return {
    nodeEnv: environment.NODE_ENV,
    host: environment.API_HOST,
    port: environment.API_PORT,
    logLevel: environment.LOG_LEVEL,
    databaseUrl: environment.DATABASE_URL,
    redisUrl: environment.REDIS_URL,
    storage: {
      endpoint: environment.STORAGE_ENDPOINT,
      region: environment.STORAGE_REGION,
      bucket: environment.STORAGE_BUCKET,
      accessKeyId: environment.STORAGE_ACCESS_KEY_ID,
      secretAccessKey: environment.STORAGE_SECRET_ACCESS_KEY,
      forcePathStyle: environment.STORAGE_FORCE_PATH_STYLE,
    },
    corsOrigins: environment.CORS_ORIGINS,
    swaggerEnabled: environment.SWAGGER_ENABLED,
    jwt: {
      accessSecret: environment.JWT_ACCESS_SECRET,
      refreshSecret: environment.JWT_REFRESH_SECRET,
    },
  };
}
