/**
 * SLIDESHOW-015 integration: full generation through the slideshow
 * video provider — stills come from a stub-priced fal image adapter
 * (stubbed fetch, zero network), Ken Burns render + narration mux are
 * real local ffmpeg. Proves the provider seam end-to-end: quarantine,
 * validation, assembly, and one `images` ledger row per scene.
 */
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeAssetServices, createAssetServices, type AssetServices } from "@aivs/assets";
import { createScript, transitionScript, updateScene } from "@aivs/content";
import { AssetStatus, GenerationStatus, ScriptLanguage, createPrismaClient } from "@aivs/database";
import { processAssembleVideo, processGenerateScene, startGeneration } from "@aivs/generation";
import { inspectMedia, synthesizeStillImage } from "@aivs/media-core";
import { FalImageProvider, MockScriptProvider, SlideshowVideoProvider } from "@aivs/providers";
import { MinioStorageProvider } from "@aivs/storage";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://aivs:aivs_local@localhost:5433/aivs";
const STUB_IMAGE_URL = "https://stub.fal.local/still.png";

let services: AssetServices;
let tenantId: string;
let projectId: string;
let ctx: { tenantId: string; userId: string };
let pngBytes: Buffer;
let envBackup: Record<string, string | undefined>;
const userId = randomUUID();

beforeAll(async () => {
  envBackup = {
    PROVIDER_DAILY_BUDGET_USD: process.env.PROVIDER_DAILY_BUDGET_USD,
    PROVIDER_MONTHLY_BUDGET_USD: process.env.PROVIDER_MONTHLY_BUDGET_USD,
  };
  process.env.PROVIDER_DAILY_BUDGET_USD = "5";
  process.env.PROVIDER_MONTHLY_BUDGET_USD = "50";

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
    data: { id: userId, name: "Slide Actor", email: `sli-${userId.slice(0, 8)}@it.riwaq.dev` },
  });
  const tenant = await prisma.tenant.create({
    data: { slug: `sli-${randomUUID().slice(0, 8)}`, name: "Slideshow Tenant" },
  });
  tenantId = tenant.id;
  ctx = { tenantId, userId };
  const project = await prisma.project.create({
    data: { tenantId, slug: "sli", name: "Slideshow Project" },
  });
  projectId = project.id;

  const workDir = await mkdtemp(join(tmpdir(), "slideshow-png-"));
  const pngPath = join(workDir, "still.png");
  await synthesizeStillImage(pngPath, { seed: 3 });
  pngBytes = await readFile(pngPath);
  await rm(workDir, { recursive: true, force: true });
});

afterAll(async () => {
  for (const [key, value] of Object.entries(envBackup)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
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
  await prisma.providerUsage.deleteMany({ where: { tenantId } });
  await prisma.generation.deleteMany({ where: { tenantId } });
  await prisma.job.deleteMany({ where: { tenantId } });
  await prisma.script.deleteMany({ where: { tenantId } });
  await prisma.asset.deleteMany({ where: { tenantId } });
  await prisma.project.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.user.delete({ where: { id: userId } });
  await closeAssetServices(services);
});

/** Routes fal queue calls and the image download — zero real network. */
function stubFetch(): typeof fetch {
  return (async (input: unknown) => {
    const url = String(input);
    if (url === STUB_IMAGE_URL) {
      return {
        ok: true,
        status: 200,
        arrayBuffer: async () =>
          pngBytes.buffer.slice(pngBytes.byteOffset, pngBytes.byteOffset + pngBytes.byteLength),
      };
    }
    const json = url.endsWith("/status")
      ? { status: "COMPLETED" }
      : url.includes("/requests/")
        ? { images: [{ url: STUB_IMAGE_URL }] }
        : { request_id: `img-${randomUUID().slice(0, 8)}` };
    return { ok: true, status: 200, json: async () => json, text: async () => "" };
  }) as unknown as typeof fetch;
}

describe("slideshow generation (AIVS-SLIDESHOW-015)", () => {
  it(
    "renders a full video from stills with narration and ledger rows",
    { timeout: 180_000 },
    async () => {
      const { prisma } = services;
      const script = await createScript(prisma, ctx, {
        projectId,
        title: `Slideshow ${randomUUID().slice(0, 6)}`,
        brief: "storybook slideshow",
        language: ScriptLanguage.en,
        provider: new MockScriptProvider(),
      });
      for (const scene of script.scenes) {
        await updateScene(prisma, ctx, script.id, scene.id, { durationTargetSeconds: 2 });
      }
      await transitionScript(prisma, ctx, script.id, "submit");
      await transitionScript(prisma, ctx, script.id, "approve");

      const generation = await startGeneration(services, ctx, {
        scriptId: script.id,
        targetPreset: "youtube-1080p",
      });

      const fetchImpl = stubFetch();
      const image = new FalImageProvider({
        apiKey: "stub-key",
        prisma,
        fetchImpl,
        pollIntervalMs: 1,
      });
      const provider = new SlideshowVideoProvider(image, { fetchImpl });
      for (const sceneGen of generation.sceneGenerations) {
        await processGenerateScene(
          services,
          { sceneGenerationId: sceneGen.id, tenantId },
          provider,
        );
      }
      await processAssembleVideo(services, { generationId: generation.id, tenantId });

      const final = await prisma.generation.findUniqueOrThrow({
        where: { id: generation.id },
        include: { sceneGenerations: true, finalAsset: true },
      });
      expect(final.status).toBe(GenerationStatus.succeeded);
      expect(final.finalAsset?.status).toBe(AssetStatus.ready);

      // One images ledger row per scene at the stub price.
      const rows = await prisma.providerUsage.findMany({ where: { tenantId } });
      const imageRows = rows.filter((r) => r.provider === "fal-image");
      expect(imageRows).toHaveLength(final.sceneGenerations.length);
      for (const row of imageRows) {
        expect(row.unitType).toBe("images");
        expect(Number(row.units)).toBe(1);
      }

      // The final video is real: expected length, video + audio streams.
      const workDir = await mkdtemp(join(tmpdir(), "slideshow-verify-"));
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
        const codecTypes = meta.streams.map((s) => s.codecType);
        expect(codecTypes).toContain("video");
        expect(codecTypes).toContain("audio");
      } finally {
        await rm(workDir, { recursive: true, force: true });
      }
    },
  );
});
