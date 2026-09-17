import { DOMAIN_EVENT_NAMES } from "@bookflow/domain-contracts";
import { Worker } from "bullmq";
import { Redis } from "ioredis";
import { QUEUE_NAMES } from "./queue-names.js";

async function bootstrap(): Promise<void> {
  if (process.env.WORKER_BOOTSTRAP_QUEUE_ENABLED !== "true") {
    console.log(
      `[bookflow-worker] bootstrap ready (${DOMAIN_EVENT_NAMES.bookingCreated}); set WORKER_BOOTSTRAP_QUEUE_ENABLED=true after Redis is available.`,
    );
    return;
  }

  const connection = new Redis(
    process.env.REDIS_URL ?? "redis://localhost:6379",
    { maxRetriesPerRequest: null },
  );
  const worker = new Worker(
    QUEUE_NAMES.notifications,
    async (job) => {
      console.log(
        `[bookflow-worker] received bootstrap job ${job.id ?? "unknown"}`,
      );
    },
    { connection },
  );

  const shutdown = async (): Promise<void> => {
    await worker.close();
    await connection.quit();
  };

  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
  console.log(`[bookflow-worker] listening on ${QUEUE_NAMES.notifications}`);
}

await bootstrap();
