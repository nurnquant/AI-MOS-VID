/**
 * Dependency health (ADR-AIVS-011 §A): probes the app's REAL backing
 * services — database query, Redis round-trip, storage head, and the
 * WORKER via its Redis heartbeat — identically for local Docker infra
 * and production (Neon / Railway / R2). This is the URL an external
 * uptime pinger watches: any dependency down → HTTP 503.
 */
import { NextResponse } from "next/server";
import { getServices } from "@/lib/services";

export const dynamic = "force-dynamic";

const HEARTBEAT_KEY = "aivs:worker:heartbeat";
/** Worker beats every 30 s; two missed beats + slack = considered down. */
const HEARTBEAT_STALE_MS = 120_000;

async function withTimeout(check: Promise<unknown>, timeoutMs = 3000): Promise<boolean> {
  try {
    await Promise.race([
      check,
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), timeoutMs)),
    ]);
    return true;
  } catch {
    return false;
  }
}

async function workerAlive(services: ReturnType<typeof getServices>): Promise<boolean> {
  try {
    const client = (await services.validationQueue.client) as unknown as {
      get(key: string): Promise<string | null>;
    };
    const beat = await client.get(HEARTBEAT_KEY);
    if (!beat) return false;
    return Date.now() - Number(beat) < HEARTBEAT_STALE_MS;
  } catch {
    return false;
  }
}

async function queueDepths(services: ReturnType<typeof getServices>) {
  const queues = {
    "asset-validation": services.validationQueue,
    "media-processing": services.mediaQueue,
    "consent-enforcement": services.enforcementQueue,
    generation: services.generationQueue,
    publishing: services.publishingQueue,
  };
  const depths: Record<string, { waiting: number; failed: number }> = {};
  await Promise.all(
    Object.entries(queues).map(async ([name, queue]) => {
      try {
        const counts = await queue.getJobCounts("waiting", "failed");
        depths[name] = { waiting: counts.waiting ?? 0, failed: counts.failed ?? 0 };
      } catch {
        depths[name] = { waiting: -1, failed: -1 };
      }
    }),
  );
  return depths;
}

export async function GET() {
  const services = getServices();
  const [postgres, redis, storage, worker, queues] = await Promise.all([
    withTimeout(services.prisma.$queryRaw`SELECT 1`),
    withTimeout(services.validationQueue.getJobCounts()),
    withTimeout(services.storage.ensureBucket()),
    workerAlive(services),
    queueDepths(services),
  ]);

  const result = { postgres, redis, storage, worker };
  const allUp = Object.values(result).every(Boolean);

  return NextResponse.json(
    {
      status: allUp ? "ok" : "degraded",
      services: result,
      queues,
      timestamp: new Date().toISOString(),
    },
    { status: allUp ? 200 : 503 },
  );
}
