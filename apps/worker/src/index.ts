/**
 * AIVS worker foundation.
 * - Connects to Redis (BullMQ)
 * - Processes jobs on the "aivs-test" queue
 * - `--smoke`: enqueues one test job, waits for completion, exits
 * - Structured logs (pino), graceful shutdown on SIGINT/SIGTERM
 */
import { Queue, Worker, QueueEvents } from "bullmq";
import { pino } from "pino";
import type { TestJobPayload, TestJobResult } from "@aivs/types";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info", name: "aivs-worker" });

const QUEUE_NAME = "aivs-test";
const redisUrl = new URL(process.env.REDIS_URL ?? "redis://localhost:6380");
const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6380),
  maxRetriesPerRequest: null,
};

const worker = new Worker<TestJobPayload, TestJobResult>(
  QUEUE_NAME,
  async (job) => {
    logger.info({ jobId: job.id, payload: job.data }, "processing test job");
    return {
      ok: true,
      processedAt: new Date().toISOString(),
      echo: job.data.message,
    };
  },
  { connection },
);

worker.on("completed", (job, result) => {
  logger.info({ jobId: job.id, result }, "job completed");
});
worker.on("failed", (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, "job failed");
});
worker.on("ready", () => {
  logger.info({ queue: QUEUE_NAME, redis: redisUrl.host }, "worker connected and ready");
});

async function shutdown(signal: string, exitCode = 0) {
  logger.info({ signal }, "shutting down gracefully");
  await worker.close();
  process.exit(exitCode);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

if (process.argv.includes("--smoke")) {
  const queue = new Queue<TestJobPayload>(QUEUE_NAME, { connection });
  const events = new QueueEvents(QUEUE_NAME, { connection });
  try {
    await events.waitUntilReady();
    const job = await queue.add("environment-smoke", {
      kind: "environment-smoke",
      requestedAt: new Date().toISOString(),
      message: "hello from AIVS-ENV-001 smoke test",
    });
    logger.info({ jobId: job.id }, "smoke job enqueued");
    const result = await job.waitUntilFinished(events, 15_000);
    logger.info({ result }, "smoke job finished");
    await queue.close();
    await events.close();
    await shutdown("smoke-complete", result.ok ? 0 : 1);
  } catch (err) {
    logger.error({ err: err instanceof Error ? err.message : err }, "smoke test failed");
    await queue.close();
    await events.close();
    await shutdown("smoke-failed", 1);
  }
}
