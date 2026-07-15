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
  enforceConsent,
  markJobRunning,
  processGenerateThumbnail,
  processInspectMedia,
  processNormalizeVideo,
  retentionSweep,
  scheduleRetentionSweep,
  transitionAsset,
  validateAsset,
  type AssetServices,
} from "@aivs/assets";
import { AssetStatus, JobStatus, TransitionActor } from "@aivs/database";
import {
  JOB_NAMES,
  QUEUES,
  redisConnectionFromEnv,
  type AssembleVideoPayload,
  type ConsentEnforcementPayload,
  type EnforceConsentPayload,
  type GenerateScenePayload,
  type GenerationQueuePayload,
  type MediaProcessingPayload,
  type NormalizeVideoPayload,
  type ValidateAssetPayload,
} from "@aivs/queue";
import {
  checkGeneration,
  markGenerationFailed,
  markSceneFailed,
  processAssembleVideo,
  processGenerateScene,
} from "@aivs/generation";
import type { TestJobPayload, TestJobResult } from "@aivs/types";

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

const enforcementWorker = new Worker<ConsentEnforcementPayload>(
  QUEUES.consentEnforcement,
  async (job) => {
    switch (job.name) {
      case JOB_NAMES.enforceConsent:
        return enforceConsent(services, job.data as EnforceConsentPayload);
      case JOB_NAMES.retentionSweep:
        return retentionSweep(services);
      default:
        throw new Error(`Unknown enforcement job ${job.name}`);
    }
  },
  { connection },
);

const generationWorker = new Worker<GenerationQueuePayload>(
  QUEUES.generation,
  async (job) => {
    switch (job.name) {
      case JOB_NAMES.generateScene: {
        const payload = job.data as GenerateScenePayload;
        const result = await processGenerateScene(services, payload);
        const sceneGen = await services.prisma.sceneGeneration.findUnique({
          where: { id: payload.sceneGenerationId },
          select: { generationId: true },
        });
        if (sceneGen) await checkGeneration(services, sceneGen.generationId);
        return result;
      }
      case JOB_NAMES.assembleVideo:
        return processAssembleVideo(services, job.data as AssembleVideoPayload);
      default:
        throw new Error(`Unknown generation job ${job.name}`);
    }
  },
  { connection },
);

function isFinalAttempt(job: Job): boolean {
  return job.attemptsMade >= (job.opts.attempts ?? 1);
}

generationWorker.on("completed", (job) => {
  logger.info({ queue: generationWorker.name, jobId: job.id, name: job.name }, "job completed");
});
generationWorker.on("failed", (job, err) => {
  if (!job) return;
  const dead = isFinalAttempt(job);
  logger.error(
    { queue: generationWorker.name, jobId: job.id, name: job.name, dead, err: err.message },
    "job failed",
  );
  if (!dead) return;
  void (async () => {
    if (job.name === JOB_NAMES.generateScene) {
      const payload = job.data as GenerateScenePayload;
      await markSceneFailed(services, payload.sceneGenerationId, err.message);
      const sceneGen = await services.prisma.sceneGeneration.findUnique({
        where: { id: payload.sceneGenerationId },
        select: { generationId: true },
      });
      if (sceneGen) await checkGeneration(services, sceneGen.generationId);
    } else if (job.name === JOB_NAMES.assembleVideo) {
      const payload = job.data as AssembleVideoPayload;
      await markGenerationFailed(services, payload.generationId, err.message);
    }
  })().catch((e) => logger.error({ err: (e as Error).message }, "generation bookkeeping error"));
});
generationWorker.on("ready", () =>
  logger.info({ queue: generationWorker.name }, "worker connected and ready"),
);

// Hourly retention sweep (expired consents + 30-day quarantine retention).
if (!process.argv.includes("--smoke")) {
  void scheduleRetentionSweep(services).catch((err) =>
    logger.error({ err: (err as Error).message }, "failed to schedule retention sweep"),
  );
}

enforcementWorker.on("completed", (job, result) => {
  logger.info(
    { queue: enforcementWorker.name, jobId: job.id, name: job.name, result },
    "job completed",
  );
});
enforcementWorker.on("failed", (job, err) => {
  logger.error(
    { queue: enforcementWorker.name, jobId: job?.id, name: job?.name, err: err.message },
    "job failed",
  );
});
enforcementWorker.on("ready", () =>
  logger.info({ queue: enforcementWorker.name }, "worker connected and ready"),
);

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
  await enforcementWorker.close();
  await generationWorker.close();
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
