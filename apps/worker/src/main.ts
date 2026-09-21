import { DOMAIN_EVENT_NAMES } from "@bookflow/domain-contracts";
import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { loadWorkerEnvironmentFiles } from "./config/environment-loader.js";
import {
  parseWorkerEnvironment,
  type WorkerConfig,
} from "./config/worker-config.js";
import { QUEUE_NAMES } from "./queue-names.js";

type LogLevel = WorkerConfig["logLevel"];

function writeLog(
  level: LogLevel,
  event: string,
  fields: Readonly<Record<string, unknown>> = {},
): void {
  process.stdout.write(
    `${JSON.stringify({ timestamp: new Date().toISOString(), level, event, ...fields })}\n`,
  );
}

async function bootstrap(config: WorkerConfig): Promise<void> {
  if (!config.queueEnabled) {
    writeLog("log", "worker.ready", {
      queueEnabled: false,
      eventContract: DOMAIN_EVENT_NAMES.bookingCreated,
    });
    return;
  }

  const connection = new Redis(config.redisUrl, {
    maxRetriesPerRequest: null,
  });
  const worker = new Worker(
    QUEUE_NAMES.notifications,
    async (job) => {
      writeLog("log", "worker.job.received", {
        queue: QUEUE_NAMES.notifications,
        jobId: job.id ?? "unknown",
      });
    },
    { connection, concurrency: config.concurrency },
  );

  const shutdown = async (): Promise<void> => {
    writeLog("log", "worker.stopping");
    await worker.close();
    await connection.quit();
  };

  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
  writeLog("log", "worker.started", {
    queue: QUEUE_NAMES.notifications,
    concurrency: config.concurrency,
  });
}

loadWorkerEnvironmentFiles();

try {
  await bootstrap(parseWorkerEnvironment(process.env));
} catch (error) {
  writeLog("error", "worker.startup_failed", {
    message: error instanceof Error ? error.message : String(error),
  });
  process.exitCode = 1;
}
