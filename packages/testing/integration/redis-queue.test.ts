import { afterAll, describe, expect, it } from "vitest";
import { Queue, Worker, QueueEvents } from "bullmq";

const redisUrl = new URL(process.env.REDIS_URL ?? "redis://localhost:6380");
const QUEUE_NAME = "aivs-integration-test";
const connection = {
  host: redisUrl.hostname,
  port: Number(redisUrl.port || 6380),
  maxRetriesPerRequest: null,
};

const queue = new Queue(QUEUE_NAME, { connection });
const events = new QueueEvents(QUEUE_NAME, { connection });
const worker = new Worker(
  QUEUE_NAME,
  async (job) => ({ doubled: (job.data.value as number) * 2 }),
  { connection },
);

afterAll(async () => {
  await worker.close();
  await queue.obliterate({ force: true });
  await queue.close();
  await events.close();
});

describe("Redis queue round-trip (integration)", () => {
  it("enqueues a job and receives the processed result", async () => {
    await events.waitUntilReady();
    const job = await queue.add("double", { value: 21 });
    const result = await job.waitUntilFinished(events, 10_000);
    expect(result).toEqual({ doubled: 42 });
  });
});
