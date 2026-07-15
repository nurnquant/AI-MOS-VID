/**
 * GEN-006 integration: approved script → synthesized scene clips (through
 * the real ingestion pipeline) → assembled, preset-normalized final video
 * verified with ffprobe. Plus approval gate, partial failure, idempotency.
 */
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeAssetServices, createAssetServices, type AssetServices } from "@aivs/assets";
import { createScript, transitionScript, updateScene } from "@aivs/content";
import {
  AssetStatus,
  GenerationStatus,
  SceneGenerationStatus,
  ScriptLanguage,
  createPrismaClient,
} from "@aivs/database";
import {
  checkGeneration,
  markSceneFailed,
  processAssembleVideo,
  processGenerateScene,
  startGeneration,
} from "@aivs/generation";
import { inspectMedia } from "@aivs/media-core";
import { MockScriptProvider } from "@aivs/providers";
import { MinioStorageProvider } from "@aivs/storage";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://aivs:aivs_local@localhost:5433/aivs";
process.env.REDIS_URL ??= "redis://localhost:6380";

let services: AssetServices;
let tenantId: string;
let projectId: string;
let ctx: { tenantId: string; userId: string };
const userId = randomUUID();
const scriptProvider = new MockScriptProvider();

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
    data: { id: userId, name: "Gen Actor", email: `gen-${userId.slice(0, 8)}@it.riwaq.dev` },
  });
  const tenant = await prisma.tenant.create({
    data: { slug: `gen-${randomUUID().slice(0, 8)}`, name: "Gen Tenant" },
  });
  tenantId = tenant.id;
  ctx = { tenantId, userId };
  const project = await prisma.project.create({
    data: { tenantId, slug: "gen", name: "Gen Project" },
  });
  projectId = project.id;
});

afterAll(async () => {
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
  await services.validationQueue.obliterate({ force: true }).catch(() => {});
  await services.mediaQueue.obliterate({ force: true }).catch(() => {});
  await services.generationQueue.obliterate({ force: true }).catch(() => {});
  await closeAssetServices(services);
});

/** Generated + approved script with short (2s) scenes for fast synthesis. */
async function approvedScript(brief: string) {
  const { prisma } = services;
  const script = await createScript(prisma, ctx, {
    projectId,
    title: `Gen ${randomUUID().slice(0, 6)}`,
    brief,
    language: ScriptLanguage.en,
    provider: scriptProvider,
  });
  for (const scene of script.scenes) {
    await updateScene(prisma, ctx, script.id, scene.id, { durationTargetSeconds: 2 });
  }
  await transitionScript(prisma, ctx, script.id, "submit");
  await transitionScript(prisma, ctx, script.id, "approve");
  return prisma.script.findUniqueOrThrow({
    where: { id: script.id },
    include: { scenes: { orderBy: { position: "asc" } } },
  });
}

describe("full generation loop", () => {
  it("turns an approved script into scene clips and a preset-normalized final video", async () => {
    const script = await approvedScript("full loop test");
    const generation = await startGeneration(services, ctx, {
      scriptId: script.id,
      targetPreset: "tiktok",
    });
    expect(generation.status).toBe(GenerationStatus.running);
    expect(generation.sceneGenerations).toHaveLength(script.scenes.length);

    for (const sceneGen of generation.sceneGenerations) {
      const result = await processGenerateScene(services, {
        sceneGenerationId: sceneGen.id,
        tenantId,
      });
      expect(result.assetId).toBeTruthy();
      const asset = await services.prisma.asset.findUniqueOrThrow({
        where: { id: result.assetId! },
        include: { transitions: { orderBy: { createdAt: "asc" } } },
      });
      expect(asset.status).toBe(AssetStatus.ready);
      expect(asset.featuresMinor).toBe(false);
      // Traveled the real pipeline: quarantine before ready.
      expect(asset.transitions.map((t) => t.toStatus)).toEqual(
        expect.arrayContaining([AssetStatus.quarantined, AssetStatus.ready]),
      );
    }

    const assembled = await processAssembleVideo(services, {
      generationId: generation.id,
      tenantId,
    });
    const finalized = await services.prisma.generation.findUniqueOrThrow({
      where: { id: generation.id },
      include: { finalAsset: true },
    });
    expect(finalized.status).toBe(GenerationStatus.succeeded);
    expect(finalized.finalAssetId).toBe(assembled.finalAssetId);
    expect(finalized.finalAsset?.status).toBe(AssetStatus.ready);

    // ffprobe the actual object: preset dimensions/fps, duration ≈ scenes.
    const workDir = await mkdtemp(join(tmpdir(), "aivs-gen-verify-"));
    try {
      const localPath = join(workDir, "final.mp4");
      await pipeline(
        await services.storage.getObjectStream(finalized.finalAsset!.storageKey!),
        createWriteStream(localPath),
      );
      const meta = await inspectMedia(localPath);
      const video = meta.streams.find((s) => s.codecType === "video");
      expect(video).toMatchObject({ codecName: "h264", width: 1080, height: 1920 });
      const expected = script.scenes.length * 2;
      expect(meta.durationSeconds).toBeGreaterThan(expected - 1.5);
      expect(meta.durationSeconds).toBeLessThan(expected + 1.5);
    } finally {
      await rm(workDir, { recursive: true, force: true });
    }

    const types = (await services.prisma.auditEvent.findMany({ where: { tenantId } })).map(
      (e) => e.type,
    );
    expect(types).toContain("generation.started");
    expect(types).toContain("generation.completed");

    // Idempotency: re-running a scene and the assembly changes nothing.
    const rerun = await processGenerateScene(services, {
      sceneGenerationId: generation.sceneGenerations[0]!.id,
      tenantId,
    });
    expect(rerun.skipped).toBe(true);
    const reassemble = await processAssembleVideo(services, {
      generationId: generation.id,
      tenantId,
    });
    expect(reassemble.skipped).toBe(true);
    expect(reassemble.finalAssetId).toBe(assembled.finalAssetId);
  }, 300_000);
});

describe("gates and failure paths", () => {
  it("refuses non-approved scripts and unknown presets", async () => {
    const { prisma } = services;
    const draft = await createScript(prisma, ctx, {
      projectId,
      title: "Draft",
      brief: "still a draft",
      language: ScriptLanguage.en,
      provider: scriptProvider,
    });
    await expect(
      startGeneration(services, ctx, { scriptId: draft.id, targetPreset: "tiktok" }),
    ).rejects.toMatchObject({ status: 409 });

    const approved = await approvedScript("preset check");
    await expect(
      startGeneration(services, ctx, { scriptId: approved.id, targetPreset: "betamax" }),
    ).rejects.toMatchObject({ status: 400 });
  }, 120_000);

  it("finalizes as partial when a scene fails, keeping successful clips", async () => {
    const script = await approvedScript("partial failure test");
    const generation = await startGeneration(services, ctx, {
      scriptId: script.id,
      targetPreset: "tiktok",
    });
    const [first, ...rest] = generation.sceneGenerations;

    const ok = await processGenerateScene(services, {
      sceneGenerationId: first!.id,
      tenantId,
    });
    for (const sceneGen of rest) {
      await markSceneFailed(services, sceneGen.id, "synthetic failure for test");
    }
    await checkGeneration(services, generation.id);

    const finalized = await services.prisma.generation.findUniqueOrThrow({
      where: { id: generation.id },
      include: { sceneGenerations: true },
    });
    expect(finalized.status).toBe(GenerationStatus.partial);
    expect(finalized.error).toContain("synthetic failure");
    const successful = finalized.sceneGenerations.find(
      (s) => s.status === SceneGenerationStatus.succeeded,
    );
    expect(successful?.assetId).toBe(ok.assetId);
    const keptAsset = await services.prisma.asset.findUniqueOrThrow({
      where: { id: ok.assetId! },
    });
    expect(keptAsset.status).toBe(AssetStatus.ready);
  }, 120_000);
});
