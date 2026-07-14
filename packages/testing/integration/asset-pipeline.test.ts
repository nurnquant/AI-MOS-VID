/**
 * Full ingestion pipeline against live local infra (Postgres, Redis,
 * MinIO) with a real ffmpeg-generated fixture video:
 *   upload → quarantine → validate → promote → thumbnail → signed URL
 * plus the consent gate, rejection, and normalization paths.
 */
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  REJECTION_REASONS,
  createAssetServices,
  closeAssetServices,
  ingestUpload,
  processGenerateThumbnail,
  processNormalizeVideo,
  validateAsset,
  type AssetServices,
} from "@aivs/assets";
import {
  AssetStatus,
  ConsentScope,
  MediaKind,
  VersionRole,
  createPrismaClient,
} from "@aivs/database";
import { runProcess } from "@aivs/media-core";
import { MinioStorageProvider } from "@aivs/storage";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://aivs:aivs_local@localhost:5433/aivs";
process.env.REDIS_URL ??= "redis://localhost:6380";

let services: AssetServices;
let workDir: string;
let fixturePath: string;
let tenantId: string;
let projectId: string;

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

  const tenant = await services.prisma.tenant.create({
    data: { slug: `it-${randomUUID().slice(0, 8)}`, name: "Integration Tenant" },
  });
  tenantId = tenant.id;
  const project = await services.prisma.project.create({
    data: { tenantId, slug: "pipeline", name: "Pipeline Project" },
  });
  projectId = project.id;

  workDir = await mkdtemp(join(tmpdir(), "aivs-pipeline-test-"));
  fixturePath = join(workDir, "fixture.mp4");
  const result = await runProcess("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "testsrc=size=640x360:rate=25:duration=2",
    "-f",
    "lavfi",
    "-i",
    "anullsrc=channel_layout=stereo:sample_rate=44100",
    "-t",
    "2",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-c:a",
    "aac",
    "-shortest",
    fixturePath,
  ]);
  expect(result.exitCode).toBe(0);
}, 120_000);

afterAll(async () => {
  await rm(workDir, { recursive: true, force: true });
  // Tenant-scoped cleanup (cascades handle versions/transitions).
  const assets = await services.prisma.asset.findMany({ where: { tenantId } });
  for (const asset of assets) {
    for (const key of [asset.storageKey, asset.quarantineKey]) {
      if (key) await services.storage.deleteObject(key).catch(() => {});
    }
    const versions = await services.prisma.assetVersion.findMany({
      where: { assetId: asset.id },
    });
    for (const v of versions) await services.storage.deleteObject(v.storageKey).catch(() => {});
  }
  await services.prisma.job.deleteMany({ where: { tenantId } });
  await services.prisma.asset.deleteMany({ where: { tenantId } });
  await services.prisma.consentRecord.deleteMany({ where: { tenantId } });
  await services.prisma.project.deleteMany({ where: { tenantId } });
  await services.prisma.tenant.delete({ where: { id: tenantId } });
  // Drain the local queues so orphaned jobs don't spam a later worker run.
  await services.validationQueue.obliterate({ force: true }).catch(() => {});
  await services.mediaQueue.obliterate({ force: true }).catch(() => {});
  await closeAssetServices(services);
});

async function ingestFixture(
  overrides: { featuresMinor?: boolean; consentRecordId?: string } = {},
) {
  return ingestUpload(services, {
    tenantId,
    projectId,
    originalFilename: "fixture video.mp4",
    claimedContentType: "video/mp4",
    featuresMinor: overrides.featuresMinor ?? false,
    consentRecordId: overrides.consentRecordId,
    body: createReadStream(fixturePath),
  });
}

describe("full pipeline: upload → quarantine → validate → promote → thumbnail → signed URL", () => {
  it("walks a real video through every stage", async () => {
    const { asset } = await ingestFixture();
    expect(asset.status).toBe(AssetStatus.quarantined);
    expect(asset.quarantineKey).toMatch(/^quarantine\/tenant\//);
    expect(asset.checksumSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(await services.storage.objectExists(asset.quarantineKey!)).toBe(true);

    const outcome = await validateAsset(services, asset.id);
    expect(outcome.status).toBe(AssetStatus.ready);

    const promoted = await services.prisma.asset.findUniqueOrThrow({
      where: { id: asset.id },
      include: { versions: true, transitions: { orderBy: { createdAt: "asc" } } },
    });
    expect(promoted.kind).toBe(MediaKind.video);
    expect(promoted.detectedContentType).toBe("video/mp4");
    expect(promoted.storageKey).toMatch(/^assets\/tenant\//);
    expect(promoted.quarantineKey).toBeNull();
    expect(await services.storage.objectExists(asset.quarantineKey!)).toBe(false);
    expect(promoted.width).toBe(640);
    expect(promoted.durationSeconds).toBeGreaterThan(1.5);
    expect(promoted.transitions.map((t) => t.toStatus)).toEqual([
      AssetStatus.uploaded,
      AssetStatus.quarantined,
      AssetStatus.validating,
      AssetStatus.ready,
    ]);
    const original = promoted.versions.find((v) => v.role === VersionRole.original);
    expect(original).toBeDefined();

    const thumbResult = (await processGenerateThumbnail(services, {
      assetId: asset.id,
      tenantId,
    })) as { storageKey: string };
    expect(thumbResult.storageKey).toMatch(/\.png$/);

    const url = await services.storage.getSignedUrl(thumbResult.storageKey, 60);
    const response = await fetch(url);
    expect(response.status).toBe(200);
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
  }, 120_000);

  it("normalizes to a platform preset as an asset version", async () => {
    const { asset } = await ingestFixture();
    await validateAsset(services, asset.id);
    const result = (await processNormalizeVideo(services, {
      assetId: asset.id,
      tenantId,
      preset: "tiktok",
    })) as { versionId: string };
    const version = await services.prisma.assetVersion.findUniqueOrThrow({
      where: { id: result.versionId },
    });
    expect(version).toMatchObject({
      role: VersionRole.normalized,
      preset: "tiktok",
      width: 1080,
      height: 1920,
      contentType: "video/mp4",
    });
    // Idempotency: same preset again dedupes.
    const again = (await processNormalizeVideo(services, {
      assetId: asset.id,
      tenantId,
      preset: "tiktok",
    })) as { deduplicated?: boolean };
    expect(again.deduplicated).toBe(true);
  }, 180_000);
});

describe("consent gate", () => {
  it("blocks a featuresMinor asset without consent and keeps the quarantine object", async () => {
    const { asset } = await ingestFixture({ featuresMinor: true });
    const outcome = await validateAsset(services, asset.id);
    expect(outcome).toMatchObject({
      status: AssetStatus.rejected,
      reason: REJECTION_REASONS.consentMissing,
    });
    const rejected = await services.prisma.asset.findUniqueOrThrow({ where: { id: asset.id } });
    expect(rejected.quarantineKey).not.toBeNull();
    expect(await services.storage.objectExists(rejected.quarantineKey!)).toBe(true);
    expect(rejected.storageKey).toBeNull();
  }, 60_000);

  it("promotes the same asset once a valid consent record is attached (reprocess path)", async () => {
    const { asset } = await ingestFixture({ featuresMinor: true });
    await validateAsset(services, asset.id);

    const consent = await services.prisma.consentRecord.create({
      data: {
        tenantId,
        subjectLabel: "student-1",
        guardianName: "Guardian Name",
        scope: ConsentScope.internal,
        platforms: [],
        expiresAt: new Date(Date.now() + 7 * 24 * 3600 * 1000),
      },
    });
    await services.prisma.asset.update({
      where: { id: asset.id },
      data: { consentRecordId: consent.id },
    });

    const outcome = await validateAsset(services, asset.id);
    expect(outcome.status).toBe(AssetStatus.ready);
  }, 60_000);

  it("rejects expired consent", async () => {
    const consent = await services.prisma.consentRecord.create({
      data: {
        tenantId,
        subjectLabel: "student-2",
        guardianName: "Guardian Name",
        scope: ConsentScope.internal,
        platforms: [],
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    const { asset } = await ingestFixture({ featuresMinor: true, consentRecordId: consent.id });
    const outcome = await validateAsset(services, asset.id);
    expect(outcome).toMatchObject({
      status: AssetStatus.rejected,
      reason: REJECTION_REASONS.consentMissing,
    });
  }, 60_000);
});

describe("rejection paths", () => {
  it("rejects a claimed-video that is actually not media, deleting the quarantine object", async () => {
    const fakePath = join(workDir, "fake.mp4");
    await writeFile(fakePath, Buffer.from("MZ not a video at all, just bytes".repeat(4)));
    const { asset } = await ingestUpload(services, {
      tenantId,
      projectId,
      originalFilename: "../evil name.mp4",
      claimedContentType: "video/mp4",
      featuresMinor: false,
      body: createReadStream(fakePath),
    });
    expect(asset.displayName).toBe("..evil name.mp4");

    const quarantineKey = asset.quarantineKey!;
    const outcome = await validateAsset(services, asset.id);
    expect(outcome).toMatchObject({
      status: AssetStatus.rejected,
      reason: REJECTION_REASONS.unknownType,
    });
    expect(await services.storage.objectExists(quarantineKey)).toBe(false);
    const rejected = await services.prisma.asset.findUniqueOrThrow({ where: { id: asset.id } });
    expect(rejected.rejectionReason).toBe(REJECTION_REASONS.unknownType);
  }, 60_000);

  it("rejects a kind mismatch (png claimed as video)", async () => {
    const pngPath = join(workDir, "real.png");
    await runProcess("ffmpeg", [
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=red:s=64x64:d=1",
      "-frames:v",
      "1",
      pngPath,
    ]);
    const { asset } = await ingestUpload(services, {
      tenantId,
      projectId,
      originalFilename: "sneaky.mp4",
      claimedContentType: "video/mp4",
      featuresMinor: false,
      body: createReadStream(pngPath),
    });
    const outcome = await validateAsset(services, asset.id);
    expect(outcome).toMatchObject({
      status: AssetStatus.rejected,
      reason: REJECTION_REASONS.kindMismatch,
    });
  }, 60_000);

  it("enforces the streaming byte cap during upload", async () => {
    const bigChunks = Readable.from(
      (async function* () {
        for (let i = 0; i < 64; i++) yield Buffer.alloc(1024, i);
      })(),
    );
    await expect(
      ingestUpload(services, {
        tenantId,
        projectId,
        originalFilename: "big.mp4",
        claimedContentType: "video/mp4",
        featuresMinor: false,
        body: bigChunks,
        maxBytes: 16 * 1024,
      }),
    ).rejects.toThrow(/maximum allowed size/);
    const rejected = await services.prisma.asset.findFirst({
      where: { tenantId, displayName: "big.mp4" },
      include: { transitions: true },
    });
    expect(rejected?.status).toBe(AssetStatus.rejected);
    expect(rejected?.transitions.some((t) => t.reason === "size-cap-exceeded")).toBe(true);
  }, 60_000);
});
