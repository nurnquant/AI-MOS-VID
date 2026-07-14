/**
 * AIVS worker: consumes the asset-validation and media-processing queues
 * (ADR-AIVS-002 §5). Job rows in Postgres mirror BullMQ state; final-attempt
 * failures are marked dead and mid-validation assets fall to rejected.
 * `--smoke` retains the ENV-001 environment smoke check.
 */
import { Queue, QueueEvents, Worker, type Job } from "bullmq";
import { pino } from "pino";
import {
  closeAssetServices,
  createAssetServices,
  markJobFinished,
  markJobRunning,
  transitionAsset,
  validateAsset,
  type AssetServices,
} from "@aivs/assets";
import { AssetStatus, JobStatus, TransitionActor } from "@aivs/database";
import {
  JOB_NAMES,
  QUEUES,
  redisConnectionFromEnv,
  type MediaProcessingPayload,
  type NormalizeVideoPayload,
  type ValidateAssetPayload,
} from "@aivs/queue";
import type { TestJobPayload, TestJobResult } from "@aivs/types";
import {
  processGenerateThumbnail,
  processInspectMedia,
  processNormalizeVideo,
} from "./processors/media.ts";

const logger = pino({ level: process.env.LOG_LEVEL ?? "info", name: "aivs-worker" });
const connection = redisConnectionFromEnv();
const services: AssetServices = createAssetServices();

async function jobRecordId(bullJobId: string): Promise<string | undefined> {
  const record = await services.prisma.job.findFirst({
    where: { bullJobId },
    select: { id: true },
  });
  return record?.id;
}

const validationWorker = new Worker<ValidateAssetPayload>(
  QUEUES.assetValidation,
  async (job) => {
    await markJobRunning(services.prisma, job.id!);
    const outcome = await validateAsset(services, job.data.assetId, {
      bullJobRecordId: await jobRecordId(job.id!),
    });
    return outcome;
  },
  { connection },
);

const mediaWorker = new Worker<MediaProcessingPayload>(
  QUEUES.mediaProcessing,
  async (job) => {
    await markJobRunning(services.prisma, job.id!);
    switch (job.name) {
      case JOB_NAMES.inspectMedia:
        return processInspectMedia(services, job.data);
      case JOB_NAMES.normalizeVideo:
        return processNormalizeVideo(services, job.data as NormalizeVideoPayload);
      case JOB_NAMES.generateThumbnail:
        return processGenerateThumbnail(services, job.data);
      default:
        throw new Error(`Unknown media job ${job.name}`);
    }
  },
  { connection },
);

function isFinalAttempt(job: Job): boolean {
  return job.attemptsMade >= (job.opts.attempts ?? 1);
}

for (const worker of [validationWorker, mediaWorker]) {
  worker.on("completed", (job, result) => {
    void markJobFinished(services.prisma, job.id!, {
      status: JobStatus.succeeded,
      result,
    }).catch((err) => logger.error({ err: err.message }, "failed to record job success"));
    logger.info({ queue: worker.name, jobId: job.id, name: job.name }, "job completed");
  });

  worker.on("failed", (job, err) => {
    if (!job) return;
    const dead = isFinalAttempt(job);
    logger.error(
      { queue: worker.name, jobId: job.id, name: job.name, dead, err: err.message },
      "job failed",
    );
    void (async () => {
      await markJobFinished(services.prisma, job.id!, {
        status: dead ? JobStatus.dead : JobStatus.failed,
        error: err.message.slice(0, 2000),
      });
      // Dead validation job: the asset must not stay stuck in `validating`.
      if (dead && job.name === JOB_NAMES.validateAsset) {
        const { assetId } = job.data as ValidateAssetPayload;
        await transitionAsset(services.prisma, assetId, AssetStatus.rejected, {
          actor: TransitionActor.system,
          reason: "processing-failed",
          patch: { rejectionReason: "processing-failed" },
        }).catch(() => {
          // Asset was not mid-validation (e.g. failed before the first
          // transition) — nothing to move.
        });
      }
    })().catch((e) => logger.error({ err: (e as Error).message }, "failure bookkeeping error"));
  });

  worker.on("ready", () => logger.info({ queue: worker.name }, "worker connected and ready"));
}

async function shutdown(signal: string, exitCode = 0) {
  logger.info({ signal }, "shutting down gracefully");
  await validationWorker.close();
  await mediaWorker.close();
  await smokeWorker?.close();
  await closeAssetServices(services);
  process.exit(exitCode);
}

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

// --- ENV-001 environment smoke check (kept: queue wiring canary) ---
const SMOKE_QUEUE = "aivs-test";
let smokeWorker: Worker<TestJobPayload, TestJobResult> | undefined;

if (process.argv.includes("--smoke")) {
  smokeWorker = new Worker<TestJobPayload, TestJobResult>(
    SMOKE_QUEUE,
    async (job) => ({ ok: true, processedAt: new Date().toISOString(), echo: job.data.message }),
    { connection },
  );
  const queue = new Queue<TestJobPayload>(SMOKE_QUEUE, { connection });
  const events = new QueueEvents(SMOKE_QUEUE, { connection });
  try {
    await events.waitUntilReady();
    const job = await queue.add("environment-smoke", {
      kind: "environment-smoke",
      requestedAt: new Date().toISOString(),
      message: "hello from AIVS worker smoke test",
    });
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
