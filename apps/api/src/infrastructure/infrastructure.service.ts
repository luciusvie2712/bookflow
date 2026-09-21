import { HeadBucketCommand, S3Client } from "@aws-sdk/client-s3";
import { Inject, Injectable, type OnApplicationShutdown } from "@nestjs/common";
import { Redis } from "ioredis";
import { Pool } from "pg";
import { API_CONFIG } from "../config/config.module.js";
import type { ApiConfig } from "../config/api-config.js";
import type { DependencyHealthProbes } from "./dependency-health.js";

@Injectable()
export class InfrastructureService
  implements DependencyHealthProbes, OnApplicationShutdown
{
  private readonly database: Pool;
  private readonly redis: Redis;
  private readonly objectStorage: S3Client;

  public constructor(@Inject(API_CONFIG) private readonly config: ApiConfig) {
    this.database = new Pool({
      connectionString: config.databaseUrl,
      connectionTimeoutMillis: 2_000,
      query_timeout: 2_000,
      max: 5,
    });
    this.redis = new Redis(config.redisUrl, {
      lazyConnect: true,
      connectTimeout: 2_000,
      commandTimeout: 2_000,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: () => null,
    });
    this.redis.on("error", () => undefined);
    this.objectStorage = new S3Client({
      endpoint: config.storage.endpoint,
      region: config.storage.region,
      forcePathStyle: config.storage.forcePathStyle,
      credentials: {
        accessKeyId: config.storage.accessKeyId,
        secretAccessKey: config.storage.secretAccessKey,
      },
    });
  }

  public async checkDatabase(): Promise<void> {
    await this.database.query("SELECT 1");
  }

  public async checkRedis(): Promise<void> {
    if (this.redis.status === "wait" || this.redis.status === "end") {
      await this.redis.connect();
    }

    const response = await this.redis.ping();
    if (response !== "PONG") {
      throw new Error("Redis did not return PONG");
    }
  }

  public async checkObjectStorage(): Promise<void> {
    await this.objectStorage.send(
      new HeadBucketCommand({ Bucket: this.config.storage.bucket }),
    );
  }

  public async onApplicationShutdown(): Promise<void> {
    await Promise.allSettled([
      this.database.end(),
      this.closeRedis(),
      Promise.resolve(this.objectStorage.destroy()),
    ]);
  }

  private async closeRedis(): Promise<void> {
    if (this.redis.status === "ready") {
      await this.redis.quit();
      return;
    }

    this.redis.disconnect();
  }
}
