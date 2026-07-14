/**
 * Queue topology (ADR-AIVS-002 §5): named BullMQ queues, retry/backoff
 * policy, deterministic job IDs for enqueue dedupe. Job-row persistence
 * lives in @aivs/assets — this package stays Redis-only.
 */
import { Queue, type ConnectionOptions, type DefaultJobOptions, type JobsOptions } from "bullmq";

export const QUEUES = {
  assetValidation: "asset-validation",
  mediaProcessing: "media-processing",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

export const JOB_NAMES = {
  validateAsset: "validate-asset",
  inspectMedia: "inspect-media",
  normalizeVideo: "normalize-video",
  generateThumbnail: "generate-thumbnail",
} as const;

export type JobName = (typeof JOB_NAMES)[keyof typeof JOB_NAMES];

export interface ValidateAssetPayload {
  assetId: string;
  tenantId: string;
}

export interface InspectMediaPayload {
  assetId: string;
  tenantId: string;
}

export interface NormalizeVideoPayload {
  assetId: string;
  tenantId: string;
  /** Platform preset name, validated against @aivs/media-core presets. */
  preset: string;
}

export interface GenerateThumbnailPayload {
  assetId: string;
  tenantId: string;
}

export type MediaProcessingPayload =
  InspectMediaPayload | NormalizeVideoPayload | GenerateThumbnailPayload;

/** Retry policy: 3 attempts, exponential backoff from 5s (ADR §5). */
export const DEFAULT_JOB_OPTIONS: DefaultJobOptions = {
  attempts: 3,
  backoff: { type: "exponential", delay: 5_000 },
  removeOnComplete: { age: 24 * 60 * 60, count: 1_000 },
  removeOnFail: false,
};

export function redisConnectionFromEnv(env: NodeJS.ProcessEnv = process.env): ConnectionOptions {
  const url = new URL(env.REDIS_URL ?? "redis://localhost:6380");
  return {
    host: url.hostname,
    port: Number(url.port || 6380),
    maxRetriesPerRequest: null,
  };
}

export function createQueue<Payload>(
  name: QueueName,
  connection: ConnectionOptions,
): Queue<Payload> {
  return new Queue<Payload>(name, { connection, defaultJobOptions: DEFAULT_JOB_OPTIONS });
}

/**
 * Deterministic BullMQ job ID: re-enqueueing the same logical work while a
 * prior job is still pending is a no-op; `epoch` differentiates deliberate
 * reprocess runs.
 */
export function deterministicJobId(jobName: JobName, assetId: string, epoch: number): string {
  return `${jobName}:${assetId}:${epoch}`;
}

export function jobOptionsFor(jobName: JobName, assetId: string, epoch: number): JobsOptions {
  return { jobId: deterministicJobId(jobName, assetId, epoch) };
}
