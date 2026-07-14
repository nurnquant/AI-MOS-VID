import { NextResponse } from "next/server";
import { createConnection } from "node:net";

async function checkPort(host: string, port: number, timeoutMs = 1500): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = createConnection({ host, port, timeout: timeoutMs });
    const finish = (ok: boolean) => {
      socket.destroy();
      resolve(ok);
    };
    socket.once("connect", () => finish(true));
    socket.once("error", () => finish(false));
    socket.once("timeout", () => finish(false));
  });
}

export async function GET() {
  const [postgres, redis, minio] = await Promise.all([
    checkPort("127.0.0.1", Number(process.env.POSTGRES_PORT ?? 5433)),
    checkPort("127.0.0.1", Number(process.env.REDIS_PORT ?? 6380)),
    checkPort("127.0.0.1", Number(process.env.MINIO_PORT ?? 9000)),
  ]);

  const services = { postgres, redis, minio };
  const allUp = Object.values(services).every(Boolean);

  return NextResponse.json(
    { status: allUp ? "ok" : "degraded", services, timestamp: new Date().toISOString() },
    { status: allUp ? 200 : 503 },
  );
}
