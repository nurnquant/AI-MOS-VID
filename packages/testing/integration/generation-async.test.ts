/**
 * PROV-009C integration: the async-provider seam without any real
 * provider — a fake queue-style provider serves a real mp4 over a
 * local ephemeral http-server (https scheme is enforced in production
 * code paths for provider outputs; the test provider URL uses the
 * download path via the same resolver, so we exercise download + pad +
 * mux + ingest exactly as a real fal job would).
 */
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer, type Server } from "node:https";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeAssetServices, createAssetServices, type AssetServices } from "@aivs/assets";
import { createScript, transitionScript, updateScene } from "@aivs/content";
import { AssetStatus, ScriptLanguage, createPrismaClient } from "@aivs/database";
import { processGenerateScene, startGeneration } from "@aivs/generation";
import { inspectMedia, synthesizeVideoTrack } from "@aivs/media-core";
import { MockScriptProvider } from "@aivs/providers";
import type { VideoGenerationJob, VideoGenerationProvider } from "@aivs/providers";
import { MinioStorageProvider } from "@aivs/storage";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://aivs:aivs_local@localhost:5433/aivs";

let services: AssetServices;
let tenantId: string;
let projectId: string;
let ctx: { tenantId: string; userId: string };
const userId = randomUUID();

beforeAll(async () => {
  services = createAssetServices({
    prisma: createPrismaClient(DATABASE_URL),
    storage: new MinioStorageProvider({
      endpoint: process.env.S3_ENDPOINT ?? "http://localhost:9000",
      region: "us-east-1",
      bucket: process.env.S3_BUCKET ?? "aivs-assets",
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "aivs_local",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "aivs_local_secret",
      forcePathStyle: true,
    }),
  });
  await services.storage.ensureBucket();
  const { prisma } = services;
  await prisma.user.create({
    data: { id: userId, name: "Async Actor", email: `async-${userId.slice(0, 8)}@it.riwaq.dev` },
  });
  const tenant = await prisma.tenant.create({
    data: { slug: `async-${randomUUID().slice(0, 8)}`, name: "Async Tenant" },
  });
  tenantId = tenant.id;
  ctx = { tenantId, userId };
  const project = await prisma.project.create({
    data: { tenantId, slug: "async", name: "Async Project" },
  });
  projectId = project.id;
  process.env.VIDEO_POLL_INTERVAL_MS = "25";
});

afterAll(async () => {
  delete process.env.VIDEO_POLL_INTERVAL_MS;
  const { prisma, storage } = services;
  const assets = await prisma.asset.findMany({ where: { tenantId }, include: { versions: true } });
  for (const asset of assets) {
    for (const key of [
      asset.storageKey,
      asset.quarantineKey,
      ...asset.versions.map((v) => v.storageKey),
    ]) {
      if (key) await storage.deleteObject(key).catch(() => {});
    }
  }
  await prisma.auditEvent.deleteMany({ where: { tenantId } });
  await prisma.generation.deleteMany({ where: { tenantId } });
  await prisma.job.deleteMany({ where: { tenantId } });
  await prisma.script.deleteMany({ where: { tenantId } });
  await prisma.asset.deleteMany({ where: { tenantId } });
  await prisma.project.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.user.delete({ where: { id: userId } });
  await closeAssetServices(services);
});

/**
 * Queue-style fake: submit returns `queued`; first poll `running`;
 * second poll `succeeded` with an https URL to a locally served,
 * deliberately SHORT (2s) real clip so the pad-to-narration path runs.
 */
class FakeAsyncProvider implements VideoGenerationProvider {
  readonly name = "fake-async";
  polls = 0;
  constructor(private readonly url: string) {}

  async submit(): Promise<VideoGenerationJob> {
    return { jobId: "fake-1", status: "queued" };
  }

  async getJob(jobId: string): Promise<VideoGenerationJob> {
    this.polls += 1;
    if (this.polls === 1) return { jobId, status: "running" };
    return { jobId, status: "succeeded", outputUrl: this.url };
  }
}

describe("async provider seam (poll → https download → pad → mux → ingest)", () => {
  it("turns a queued https job into a ready, narration-length asset", async () => {
    // Serve a real 2s clip over local https (self-signed) — narration
    // will be 4s, so the clip must be padded, never the narration cut.
    const workDir = await mkdtemp(join(tmpdir(), "async-src-"));
    const clipPath = join(workDir, "short.mp4");
    await synthesizeVideoTrack(clipPath, { durationSeconds: 2 });
    const clipBytes = await readFile(clipPath);

    const { key, cert } = await import("./helpers/self-signed.ts").then((m) => m.selfSignedPair());
    const server: Server = createServer({ key, cert }, (_req, res) => {
      res.writeHead(200, { "content-type": "video/mp4" });
      res.end(clipBytes);
    });
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
    const port = (server.address() as { port: number }).port;
    const provider = new FakeAsyncProvider(`https://127.0.0.1:${port}/clip.mp4`);
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0"; // self-signed, test only

    try {
      const script = await createScript(services.prisma, ctx, {
        projectId,
        title: "Async seam",
        brief: "async seam test",
        language: ScriptLanguage.en,
        provider: new MockScriptProvider(),
      });
      const scene = script.scenes[0]!;
      await updateScene(services.prisma, ctx, script.id, scene.id, { durationTargetSeconds: 4 });
      await transitionScript(services.prisma, ctx, script.id, "submit");
      await transitionScript(services.prisma, ctx, script.id, "approve");
      const generation = await startGeneration(services, ctx, {
        scriptId: script.id,
        targetPreset: "youtube-1080p",
      });

      const sceneGen = generation.sceneGenerations.find((s) => s.position === scene.position)!;
      const result = await processGenerateScene(
        services,
        { sceneGenerationId: sceneGen.id, tenantId },
        provider,
      );

      expect(provider.polls).toBeGreaterThanOrEqual(2);
      expect(result.assetId).toBeTruthy();
      const asset = await services.prisma.asset.findUniqueOrThrow({
        where: { id: result.assetId! },
      });
      expect(asset.status).toBe(AssetStatus.ready);

      // Downloaded 2s clip padded to the 4s narration (not cut).
      const local = join(workDir, "check.mp4");
      const { createWriteStream } = await import("node:fs");
      const { pipeline } = await import("node:stream/promises");
      await pipeline(
        await services.storage.getObjectStream(asset.storageKey!),
        createWriteStream(local),
      );
      const meta = await inspectMedia(local);
      expect(meta.durationSeconds).toBeGreaterThan(3.4);
    } finally {
      delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
      server.close();
      await rm(workDir, { recursive: true, force: true });
    }
  });
});
