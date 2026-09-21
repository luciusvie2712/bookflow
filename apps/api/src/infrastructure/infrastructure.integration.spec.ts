import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import { Redis } from "ioredis";
import { Pool } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parseApiEnvironment, type ApiConfig } from "../config/api-config.js";
import { loadApiEnvironmentFiles } from "../config/environment-loader.js";

describe("local infrastructure", () => {
  let config: ApiConfig;
  let database: Pool;
  let redis: Redis;
  let objectStorage: S3Client;

  beforeAll(() => {
    loadApiEnvironmentFiles();
    config = parseApiEnvironment(process.env);
    database = new Pool({
      connectionString: config.databaseUrl,
      connectionTimeoutMillis: 2_000,
    });
    redis = new Redis(config.redisUrl, {
      lazyConnect: true,
      connectTimeout: 2_000,
      commandTimeout: 2_000,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    redis.on("error", () => undefined);
    objectStorage = new S3Client({
      endpoint: config.storage.endpoint,
      region: config.storage.region,
      forcePathStyle: config.storage.forcePathStyle,
      credentials: {
        accessKeyId: config.storage.accessKeyId,
        secretAccessKey: config.storage.secretAccessKey,
      },
    });
  });

  afterAll(async () => {
    redis.disconnect();
    objectStorage.destroy();
    await database.end();
  });

  it("connects to PostgreSQL", async () => {
    const result = await database.query<{ value: number }>("SELECT 1 AS value");

    expect(result.rows[0]?.value).toBe(1);
  });

  it("connects to Redis", async () => {
    await redis.connect();
    await expect(redis.ping()).resolves.toBe("PONG");
  }, 15_000);

  it("writes, reads, and deletes an object in local storage", async () => {
    const key = `health-check/${randomUUID()}.txt`;
    const body = `bookflow-${randomUUID()}`;

    await objectStorage.send(
      new PutObjectCommand({
        Bucket: config.storage.bucket,
        Key: key,
        Body: body,
      }),
    );

    try {
      const response = await objectStorage.send(
        new GetObjectCommand({ Bucket: config.storage.bucket, Key: key }),
      );
      await expect(response.Body?.transformToString()).resolves.toBe(body);
    } finally {
      await objectStorage.send(
        new DeleteObjectCommand({ Bucket: config.storage.bucket, Key: key }),
      );
    }
  }, 15_000);
});
