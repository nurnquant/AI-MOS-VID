/**
 * CONSENT-004 integration: attach → revalidate → ready without re-upload;
 * revoke → hard delete verified against MinIO + DB with PII-free
 * tombstones; expiry sweep; 30-day quarantine retention. Live local infra.
 */
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  QUARANTINE_RETENTION_MS,
  REJECTION_REASONS,
  attachConsent,
  closeAssetServices,
  createAssetServices,
  createConsent,
  enforceConsent,
  getConsentStatus,
  ingestUpload,
  listConsents,
  retentionSweep,
  revokeConsent,
  validateAsset,
  type AssetServices,
} from "@aivs/assets";
import { AssetStatus, ConsentScope, createPrismaClient } from "@aivs/database";
import { runProcess } from "@aivs/media-core";
import { MinioStorageProvider } from "@aivs/storage";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://aivs:aivs_local@localhost:5433/aivs";
process.env.REDIS_URL ??= "redis://localhost:6380";

let services: AssetServices;
let workDir: string;
let fixturePath: string;
let tenantId: string;
let projectId: string;
// Audit rows FK to User — the actor must be a real user row.
const actorId = randomUUID();
const actorEmail = `consent-actor-${actorId.slice(0, 8)}@it.riwaq.dev`;

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
  await services.prisma.user.create({
    data: { id: actorId, name: "Consent Actor", email: actorEmail },
  });
  const tenant = await services.prisma.tenant.create({
    data: { slug: `cg-${randomUUID().slice(0, 8)}`, name: "Consent Gov Tenant" },
  });
  tenantId = tenant.id;
  const project = await services.prisma.project.create({
    data: { tenantId, slug: "consent", name: "Consent Project" },
  });
  projectId = project.id;

  workDir = await mkdtemp(join(tmpdir(), "aivs-consent-test-"));
  fixturePath = join(workDir, "fixture.mp4");
  const result = await runProcess("ffmpeg", [
    "-hide_banner",
    "-loglevel",
    "error",
    "-f",
    "lavfi",
    "-i",
    "testsrc=size=320x180:rate=25:duration=1",
    "-t",
    "1",
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    fixturePath,
  ]);
  expect(result.exitCode).toBe(0);
}, 120_000);

afterAll(async () => {
  await rm(workDir, { recursive: true, force: true });
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
  await prisma.job.deleteMany({ where: { tenantId } });
  await prisma.asset.deleteMany({ where: { tenantId } });
  await prisma.consentRecord.deleteMany({ where: { tenantId } });
  await prisma.project.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.user.deleteMany({ where: { id: actorId } });
  await services.validationQueue.obliterate({ force: true }).catch(() => {});
  await services.mediaQueue.obliterate({ force: true }).catch(() => {});
  await services.enforcementQueue.obliterate({ force: true }).catch(() => {});
  await closeAssetServices(services);
});

async function uploadMinorAsset(consentRecordId?: string) {
  const { asset } = await ingestUpload(services, {
    tenantId,
    projectId,
    originalFilename: "minor-media.mp4",
    claimedContentType: "video/mp4",
    featuresMinor: true,
    consentRecordId,
    body: createReadStream(fixturePath),
  });
  return asset;
}

function newConsent(expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000)) {
  return createConsent(services.prisma, {
    tenantId,
    userId: actorId,
    subjectLabel: `student-${randomUUID().slice(0, 6)}`,
    guardianName: "Guardian",
    scope: ConsentScope.internal,
    expiresAt,
  });
}

describe("attach → revalidate", () => {
  it("consent-missing rejection becomes ready after attach without re-upload", async () => {
    const asset = await uploadMinorAsset();
    const first = await validateAsset(services, asset.id);
    expect(first).toMatchObject({
      status: AssetStatus.rejected,
      reason: REJECTION_REASONS.consentMissing,
    });

    const consent = await newConsent();
    const { revalidationEnqueued } = await attachConsent(services, {
      assetId: asset.id,
      consentId: consent.id,
      tenantId,
      userId: actorId,
    });
    expect(revalidationEnqueued).toBe(true);

    const second = await validateAsset(services, asset.id);
    expect(second.status).toBe(AssetStatus.ready);

    const types = (await services.prisma.auditEvent.findMany({ where: { tenantId } })).map(
      (e) => e.type,
    );
    expect(types).toContain("consent.created");
    expect(types).toContain("consent.attached");
  }, 60_000);

  it("refuses attaching an expired or revoked consent", async () => {
    const asset = await uploadMinorAsset();
    const consent = await newConsent();
    await revokeConsent(services, {
      consentId: consent.id,
      tenantId,
      userId: actorId,
      reason: "test revoke before attach",
    });
    await expect(
      attachConsent(services, {
        assetId: asset.id,
        consentId: consent.id,
        tenantId,
        userId: actorId,
      }),
    ).rejects.toMatchObject({ status: 409 });
  }, 60_000);
});

describe("revocation enforcement", () => {
  it("hard-deletes every object and row, leaving only a PII-free tombstone", async () => {
    const consent = await newConsent();
    const asset = await uploadMinorAsset(consent.id);
    const outcome = await validateAsset(services, asset.id);
    expect(outcome.status).toBe(AssetStatus.ready);

    const ready = await services.prisma.asset.findUniqueOrThrow({
      where: { id: asset.id },
      include: { versions: true },
    });
    expect(await services.storage.objectExists(ready.storageKey!)).toBe(true);

    await revokeConsent(services, {
      consentId: consent.id,
      tenantId,
      userId: actorId,
      reason: "guardian requested deletion",
    });
    const result = await enforceConsent(services, {
      consentId: consent.id,
      tenantId,
      trigger: "revoked",
    });
    expect(result.deletedAssets).toBe(1);

    expect(await services.storage.objectExists(ready.storageKey!)).toBe(false);
    for (const version of ready.versions) {
      expect(await services.storage.objectExists(version.storageKey)).toBe(false);
    }
    expect(await services.prisma.asset.findUnique({ where: { id: asset.id } })).toBeNull();

    const tombstone = await services.prisma.auditEvent.findFirstOrThrow({
      where: { tenantId, type: "asset.child_media.deleted" },
      orderBy: { createdAt: "desc" },
    });
    const detail = tombstone.detail as Record<string, unknown>;
    expect(detail).toMatchObject({ assetId: asset.id, trigger: "revoked" });
    const serialized = JSON.stringify(detail).toLowerCase();
    expect(serialized).not.toContain("student");
    expect(serialized).not.toContain("guardian");

    const enforced = await services.prisma.consentRecord.findUniqueOrThrow({
      where: { id: consent.id },
    });
    expect(enforced.enforcedAt).not.toBeNull();
    expect(getConsentStatus(enforced)).toBe("revoked");

    // Idempotent re-run.
    const rerun = await enforceConsent(services, {
      consentId: consent.id,
      tenantId,
      trigger: "revoked",
    });
    expect(rerun.deletedAssets).toBe(0);
  }, 120_000);
});

describe("retention sweep", () => {
  it("enforces expired consents automatically", async () => {
    const consent = await newConsent(new Date(Date.now() + 60_000));
    const asset = await uploadMinorAsset(consent.id);
    expect((await validateAsset(services, asset.id)).status).toBe(AssetStatus.ready);

    const beforeSweep = await retentionSweep(services, new Date());
    expect(beforeSweep.expiredConsents).toBe(0);

    const afterExpiry = new Date(Date.now() + 120_000);
    const swept = await retentionSweep(services, afterExpiry);
    expect(swept.expiredConsents).toBe(1);
    expect(await services.prisma.asset.findUnique({ where: { id: asset.id } })).toBeNull();
    const types = (await services.prisma.auditEvent.findMany({ where: { tenantId } })).map(
      (e) => e.type,
    );
    expect(types).toContain("consent.expired_swept");
  }, 120_000);

  it("deletes retained consent-missing quarantine objects after 30 days", async () => {
    const asset = await uploadMinorAsset();
    await validateAsset(services, asset.id);
    const rejected = await services.prisma.asset.findUniqueOrThrow({ where: { id: asset.id } });
    expect(rejected.quarantineKey).not.toBeNull();
    expect(await services.storage.objectExists(rejected.quarantineKey!)).toBe(true);

    // Backdate the upload past the retention window.
    await services.prisma.asset.update({
      where: { id: asset.id },
      data: { createdAt: new Date(Date.now() - QUARANTINE_RETENTION_MS - 1000) },
    });
    const swept = await retentionSweep(services, new Date());
    expect(swept.quarantineObjectsDeleted).toBe(1);
    expect(await services.storage.objectExists(rejected.quarantineKey!)).toBe(false);

    const after = await services.prisma.asset.findUniqueOrThrow({ where: { id: asset.id } });
    expect(after.quarantineKey).toBeNull();
    expect(after.status).toBe(AssetStatus.rejected);
  }, 60_000);
});

describe("registry listing", () => {
  it("lists consents with derived status and linked counts", async () => {
    const consents = await listConsents(services.prisma, tenantId);
    expect(consents.length).toBeGreaterThan(0);
    for (const consent of consents) {
      expect(["active", "expired", "revoked"]).toContain(consent.status);
    }
  });
});
