/**
 * Dependency health: probes the app's REAL backing services (database
 * query, Redis ping, storage head) — works identically for local
 * Docker infra and production (Neon / Railway Redis / R2). Replaces
 * the ENV-001 localhost port probe, which always reported "down" on
 * Vercel where nothing listens on 127.0.0.1.
 */
import { NextResponse } from "next/server";
import { getServices } from "@/lib/services";

export const dynamic = "force-dynamic";

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

export async function GET() {
  const services = getServices();
  const [postgres, redis, storage] = await Promise.all([
    withTimeout(services.prisma.$queryRaw`SELECT 1`),
    withTimeout(services.validationQueue.getJobCounts()),
    withTimeout(services.storage.ensureBucket()),
  ]);

  const result = { postgres, redis, storage };
  const allUp = Object.values(result).every(Boolean);

  return NextResponse.json(
    { status: allUp ? "ok" : "degraded", services: result, timestamp: new Date().toISOString() },
    { status: allUp ? 200 : 503 },
  );
}
