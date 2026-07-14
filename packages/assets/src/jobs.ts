/**
 * Job-row bookkeeping: every enqueue writes a Job row so pipeline history
 * survives Redis flushes and is queryable per asset (ADR §5).
 */
import { JobStatus, type PrismaClient } from "@aivs/database";
import { jobOptionsFor, type JobName } from "@aivs/queue";
import type { Queue } from "bullmq";

export interface EnqueueParams<Payload> {
  prisma: PrismaClient;
  queue: Queue<Payload>;
  jobName: JobName;
  payload: Payload;
  tenantId: string;
  assetId: string;
}

export async function enqueueWithRecord<Payload>(
  params: EnqueueParams<Payload>,
): Promise<{ jobRecordId: string; bullJobId: string }> {
  const { prisma, queue, jobName, payload, tenantId, assetId } = params;
  // Epoch = number of prior runs of this job for this asset. Deterministic,
  // so accidental double-enqueue dedupes while reprocess gets a fresh ID.
  const epoch = await prisma.job.count({ where: { assetId, name: jobName } });
  const options = jobOptionsFor(jobName, assetId, epoch);
  const bullJobId = options.jobId as string;

  const record = await prisma.job.create({
    data: {
      tenantId,
      assetId,
      queue: queue.name,
      name: jobName,
      bullJobId,
      status: JobStatus.queued,
      payload: JSON.parse(JSON.stringify(payload)),
    },
  });
  // BullMQ's conditional name-type generic can't reduce over an unresolved
  // Payload; the queue's name type is plain string at every call site.
  await (queue as unknown as Queue<unknown, unknown, string>).add(jobName, payload, options);
  return { jobRecordId: record.id, bullJobId };
}

export async function markJobRunning(prisma: PrismaClient, bullJobId: string): Promise<void> {
  await prisma.job.updateMany({
    where: { bullJobId },
    data: { status: JobStatus.running, attempts: { increment: 1 } },
  });
}

export async function markJobFinished(
  prisma: PrismaClient,
  bullJobId: string,
  outcome:
    | { status: typeof JobStatus.succeeded; result?: unknown }
    | { status: typeof JobStatus.failed | typeof JobStatus.dead; error: string },
): Promise<void> {
  await prisma.job.updateMany({
    where: { bullJobId },
    data:
      outcome.status === JobStatus.succeeded
        ? {
            status: outcome.status,
            result:
              outcome.result === undefined ? undefined : JSON.parse(JSON.stringify(outcome.result)),
          }
        : { status: outcome.status, error: outcome.error },
  });
}
