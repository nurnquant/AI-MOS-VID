/**
 * RESUME-014 integration: scene-level partial resume reuses finished
 * clips and re-renders only what failed; assembly-only failures resume
 * without re-rendering anything; guards on non-resumable states.
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
  resumeGeneration,
  startGeneration,
} from "@aivs/generation";
import { inspectMedia } from "@aivs/media-core";
import { LocalSynthVideoProvider, MockScriptProvider } from "@aivs/providers";
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
    data: { id: userId, name: "Resume Actor", email: `res-${userId.slice(0, 8)}@it.riwaq.dev` },
  });
  const tenant = await prisma.tenant.create({
    data: { slug: `res-${randomUUID().slice(0, 8)}`, name: "Resume Tenant" },
  });
  tenantId = tenant.id;
  ctx = { tenantId, userId };
  const project = await prisma.project.create({
    data: { tenantId, slug: "res", name: "Resume Project" },
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
  await closeAssetServices(services);
});

/** Fails submits for the given scene positions until told to heal. */
class FlakyProvider implements VideoGenerationProvider {
  readonly name = "flaky-test";
  private readonly inner = new LocalSynthVideoProvider();
  submits = 0;
  constructor(public failFor: Set<number>) {}

  async submit(request: Parameters<VideoGenerationProvider["submit"]>[0]) {
    this.submits += 1;
    // Position is encoded in the prompt by the test via scene text.
    const match = request.prompt.match(/POS(\d+)/);
    const position = match ? Number(match[1]) : -1;
    if (this.failFor.has(position)) {
      return {
        jobId: randomUUID(),
        status: "failed",
        error: "flaky test failure",
      } as VideoGenerationJob;
    }
    return this.inner.submit(request);
  }

  getJob(jobId: string) {
    return this.inner.getJob(jobId);
  }
}

async function approvedScript(brief: string) {
  const { prisma } = services;
  const script = await createScript(prisma, ctx, {
    projectId,
    title: `Resume ${randomUUID().slice(0, 6)}`,
    brief,
    language: ScriptLanguage.en,
    provider: new MockScriptProvider(),
  });
  for (const scene of script.scenes) {
    await updateScene(prisma, ctx, script.id, scene.id, {
      durationTargetSeconds: 2,
      visualDescription: `POS${scene.position} test scene`,
    });
  }
  await transitionScript(prisma, ctx, script.id, "submit");
  await transitionScript(prisma, ctx, script.id, "approve");
  return prisma.script.findUniqueOrThrow({
    where: { id: script.id },
    include: { scenes: { orderBy: { position: "asc" } } },
  });
}

describe("partial resume (AIVS-RESUME-014)", () => {
  it(
    "re-renders only the failed scene and reuses finished clips",
    { timeout: 120_000 },
    async () => {
      const script = await approvedScript("resume main path");
      const generation = await startGeneration(services, ctx, {
        scriptId: script.id,
        targetPreset: "youtube-1080p",
      });

      const flaky = new FlakyProvider(new Set([1]));
      for (const sceneGen of generation.sceneGenerations) {
        try {
          await processGenerateScene(services, { sceneGenerationId: sceneGen.id, tenantId }, flaky);
        } catch {
          await markSceneFailed(services, sceneGen.id, "flaky test failure");
        }
      }
      await checkGeneration(services, generation.id);

      const partial = await services.prisma.generation.findUniqueOrThrow({
        where: { id: generation.id },
        include: { sceneGenerations: { orderBy: { position: "asc" } } },
      });
      expect(partial.status).toBe(GenerationStatus.partial);
      const succeededBefore = new Map(
        partial.sceneGenerations
          .filter((s) => s.status === SceneGenerationStatus.succeeded)
          .map((s) => [s.position, s.assetId]),
      );
      expect(succeededBefore.size).toBe(partial.sceneGenerations.length - 1);

      // Resume with a healed provider: exactly one scene re-queued.
      flaky.failFor.clear();
      const submitsBefore = flaky.submits;
      const result = await resumeGeneration(services, ctx, generation.id);
      expect(result).toMatchObject({ resumedScenes: 1, assemblyEnqueued: false });

      const resumed = await services.prisma.generation.findUniqueOrThrow({
        where: { id: generation.id },
        include: { sceneGenerations: true },
      });
      expect(resumed.status).toBe(GenerationStatus.running);
      const requeued = resumed.sceneGenerations.filter(
        (s) => s.status === SceneGenerationStatus.queued,
      );
      expect(requeued).toHaveLength(1);
      expect(requeued[0]!.attempts).toBe(1);

      // Process the resumed scene + assemble; finished clips untouched.
      for (const sceneGen of resumed.sceneGenerations) {
        await processGenerateScene(services, { sceneGenerationId: sceneGen.id, tenantId }, flaky);
      }
      // Idempotency proof: only ONE real submit happened on resume.
      expect(flaky.submits - submitsBefore).toBe(1);

      const assembled = await processAssembleVideo(services, {
        generationId: generation.id,
        tenantId,
      });
      const final = await services.prisma.generation.findUniqueOrThrow({
        where: { id: generation.id },
        include: { sceneGenerations: true, finalAsset: true },
      });
      expect(final.status).toBe(GenerationStatus.succeeded);
      expect(final.finalAsset?.status).toBe(AssetStatus.ready);
      for (const scene of final.sceneGenerations) {
        const before = succeededBefore.get(scene.position);
        if (before) expect(scene.assetId).toBe(before);
      }

      // Final duration ≈ scenes × 2s — the reused clips are real.
      const workDir = await mkdtemp(join(tmpdir(), "resume-verify-"));
      try {
        const local = join(workDir, "final.mp4");
        await pipeline(
          await services.storage.getObjectStream(final.finalAsset!.storageKey!),
          createWriteStream(local),
        );
        const meta = await inspectMedia(local);
        const expected = final.sceneGenerations.length * 2;
        expect(meta.durationSeconds).toBeGreaterThan(expected - 1.5);
        expect(meta.durationSeconds).toBeLessThan(expected + 1.5);
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }

      expect(assembled.finalAssetId).toBe(final.finalAssetId);
      const types = (await services.prisma.auditEvent.findMany({ where: { tenantId } })).map(
        (e) => e.type,
      );
      expect(types).toContain("generation.resumed");
    },
  );

  it(
    "assembly-only failure resumes without re-rendering scenes",
    { timeout: 120_000 },
    async () => {
      const script = await approvedScript("resume assembly path");
      const generation = await startGeneration(services, ctx, {
        scriptId: script.id,
        targetPreset: "tiktok",
      });
      const provider = new LocalSynthVideoProvider();
      for (const sceneGen of generation.sceneGenerations) {
        await processGenerateScene(
          services,
          { sceneGenerationId: sceneGen.id, tenantId },
          provider,
        );
      }
      // Simulate assembly dying on its final attempt.
      await services.prisma.generation.update({
        where: { id: generation.id },
        data: { status: GenerationStatus.failed, error: "assembly crashed (simulated)" },
      });

      const result = await resumeGeneration(services, ctx, generation.id);
      expect(result).toMatchObject({ resumedScenes: 0, assemblyEnqueued: true });

      const assembled = await processAssembleVideo(services, {
        generationId: generation.id,
        tenantId,
      });
      expect(assembled.finalAssetId).toBeTruthy();
      const final = await services.prisma.generation.findUniqueOrThrow({
        where: { id: generation.id },
      });
      expect(final.status).toBe(GenerationStatus.succeeded);
    },
  );

  it(
    "guards: running and succeeded generations are not resumable",
    { timeout: 60_000 },
    async () => {
      const script = await approvedScript("resume guard path");
      const generation = await startGeneration(services, ctx, {
        scriptId: script.id,
        targetPreset: "tiktok",
      });
      await expect(resumeGeneration(services, ctx, generation.id)).rejects.toThrow(
        /only partial or failed/,
      );
    },
  );
});
