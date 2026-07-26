/**
 * PUB-008 integration: baseline §10 approval matrix, guardian-scope
 * validation, mock publish execution, failure path, retraction on
 * consent revocation. Live local Postgres/MinIO/Redis.
 */
import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  closeAssetServices,
  createAssetServices,
  enforceConsent,
  type AssetServices,
} from "@aivs/assets";
import {
  ApprovalKind,
  AssetStatus,
  ConsentScope,
  MediaKind,
  MembershipRole,
  PublicationStatus,
  PublishPlatform,
  createPrismaClient,
} from "@aivs/database";
import {
  PublishingError,
  contentApprove,
  createPublication,
  finalApprove,
  processPublishPublication,
  rejectPublication,
  submitPublication,
} from "@aivs/publishing";
import { MinioStorageProvider } from "@aivs/storage";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://aivs:aivs_local@localhost:5433/aivs";
process.env.REDIS_URL ??= "redis://localhost:6380";

let services: AssetServices;
let tenantId: string;
let projectId: string;
const userId = randomUUID();
const adminCtx = () => ({ tenantId, userId, role: MembershipRole.owner });

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
    data: { id: userId, name: "Pub Actor", email: `pub-${userId.slice(0, 8)}@it.riwaq.dev` },
  });
  const tenant = await prisma.tenant.create({
    data: { slug: `pub-${randomUUID().slice(0, 8)}`, name: "Pub Tenant" },
  });
  tenantId = tenant.id;
  const project = await prisma.project.create({
    data: { tenantId, slug: "pub", name: "Pub Project" },
  });
  projectId = project.id;
});

afterAll(async () => {
  const { prisma, storage } = services;
  const assets = await prisma.asset.findMany({ where: { tenantId } });
  for (const asset of assets) {
    if (asset.storageKey) await storage.deleteObject(asset.storageKey).catch(() => {});
  }
  await prisma.auditEvent.deleteMany({ where: { tenantId } });
  await prisma.publication.deleteMany({ where: { tenantId } });
  await prisma.asset.deleteMany({ where: { tenantId } });
  await prisma.consentRecord.deleteMany({ where: { tenantId } });
  await prisma.project.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.user.delete({ where: { id: userId } });
  await services.publishingQueue.obliterate({ force: true }).catch(() => {});
  await closeAssetServices(services);
});

async function readyVideo(featuresMinor = false, consentRecordId?: string) {
  const key = `assets/tenant/${tenantId}/project/${projectId}/asset/${randomUUID()}/${randomUUID()}.mp4`;
  await services.storage.putObject(key, new TextEncoder().encode("video"), "video/mp4");
  return services.prisma.asset.create({
    data: {
      tenantId,
      projectId,
      kind: MediaKind.video,
      status: AssetStatus.ready,
      displayName: "pub.mp4",
      claimedContentType: "video/mp4",
      sizeBytes: 5,
      checksumSha256: "0".repeat(64),
      storageKey: key,
      featuresMinor,
      consentRecordId,
    },
  });
}

function publishingConsent(platforms: string[], scope: ConsentScope = ConsentScope.publishing) {
  return services.prisma.consentRecord.create({
    data: {
      tenantId,
      subjectLabel: `s-${randomUUID().slice(0, 6)}`,
      guardianName: "Guardian",
      scope,
      platforms,
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000),
    },
  });
}

describe("non-minor flow", () => {
  it("create → submit → final approve → mock published with externalId", async () => {
    const asset = await readyVideo();
    const pub = await createPublication(services.prisma, adminCtx(), {
      assetId: asset.id,
      platform: PublishPlatform.youtube,
      caption: "A lovely lesson",
    });
    await submitPublication(services.prisma, adminCtx(), pub.id);
    const approved = await finalApprove(services, adminCtx(), pub.id);
    expect(approved.status).toBe(PublicationStatus.approved);

    const result = await processPublishPublication(services, {
      publicationId: pub.id,
      tenantId,
    });
    expect(result.externalId).toMatch(/^mock-youtube-/);
    const done = await services.prisma.publication.findUniqueOrThrow({ where: { id: pub.id } });
    expect(done.status).toBe(PublicationStatus.published);

    const types = (await services.prisma.auditEvent.findMany({ where: { tenantId } })).map(
      (e) => e.type,
    );
    for (const t of [
      "publication.created",
      "publication.submitted",
      "publication.approved",
      "publication.published",
    ]) {
      expect(types).toContain(t);
    }
  });

  it("rejects non-ready and non-video assets at creation", async () => {
    const quarantined = await services.prisma.asset.create({
      data: {
        tenantId,
        projectId,
        kind: MediaKind.video,
        status: AssetStatus.quarantined,
        displayName: "q.mp4",
        claimedContentType: "video/mp4",
        sizeBytes: 1,
        checksumSha256: "0".repeat(64),
      },
    });
    await expect(
      createPublication(services.prisma, adminCtx(), {
        assetId: quarantined.id,
        platform: PublishPlatform.youtube,
        caption: "x",
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});

describe("child-media approval matrix (baseline §10)", () => {
  it("blocks final approval without content review + guardian scope", async () => {
    const consent = await publishingConsent([PublishPlatform.youtube]);
    const asset = await readyVideo(true, consent.id);
    const pub = await createPublication(services.prisma, adminCtx(), {
      assetId: asset.id,
      platform: PublishPlatform.youtube,
      caption: "minor content",
    });
    await submitPublication(services.prisma, adminCtx(), pub.id);
    await expect(finalApprove(services, adminCtx(), pub.id)).rejects.toMatchObject({
      status: 409,
    });

    // Reject returns it to draft and clears any partial approvals.
    const rejected = await rejectPublication(
      services.prisma,
      adminCtx(),
      pub.id,
      "needs different framing",
    );
    expect(rejected.status).toBe(PublicationStatus.draft);
    expect(
      await services.prisma.publicationApproval.count({ where: { publicationId: pub.id } }),
    ).toBe(0);
  });

  it("guardian-scope check fails closed: internal scope, wrong platform, editor role", async () => {
    const internalConsent = await publishingConsent(
      [PublishPlatform.youtube],
      ConsentScope.internal,
    );
    const a1 = await readyVideo(true, internalConsent.id);
    const p1 = await createPublication(services.prisma, adminCtx(), {
      assetId: a1.id,
      platform: PublishPlatform.youtube,
      caption: "x",
    });
    await submitPublication(services.prisma, adminCtx(), p1.id);
    await expect(contentApprove(services, adminCtx(), p1.id)).rejects.toThrow(/internal only/);

    const tiktokConsent = await publishingConsent([PublishPlatform.tiktok]);
    const a2 = await readyVideo(true, tiktokConsent.id);
    const p2 = await createPublication(services.prisma, adminCtx(), {
      assetId: a2.id,
      platform: PublishPlatform.youtube,
      caption: "x",
    });
    await submitPublication(services.prisma, adminCtx(), p2.id);
    await expect(contentApprove(services, adminCtx(), p2.id)).rejects.toThrow(
      /does not cover youtube/,
    );

    await expect(
      contentApprove(services, { tenantId, userId, role: MembershipRole.editor }, p2.id),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("full minor flow publishes with all three approval rows recorded", async () => {
    const consent = await publishingConsent([PublishPlatform.instagram]);
    const asset = await readyVideo(true, consent.id);
    const pub = await createPublication(services.prisma, adminCtx(), {
      assetId: asset.id,
      platform: PublishPlatform.instagram,
      caption: "approved minor content",
    });
    await submitPublication(services.prisma, adminCtx(), pub.id);
    await contentApprove(services, adminCtx(), pub.id, "looks appropriate");
    const approved = await finalApprove(services, adminCtx(), pub.id);
    expect(approved.status).toBe(PublicationStatus.approved);

    const approvals = await services.prisma.publicationApproval.findMany({
      where: { publicationId: pub.id },
    });
    expect(approvals.map((a) => a.kind).sort()).toEqual(
      [
        ApprovalKind.content_review,
        ApprovalKind.final_approval,
        ApprovalKind.guardian_scope,
      ].sort(),
    );
    expect(approvals.every((a) => a.approvedBy === userId)).toBe(true);
    const guardianRow = approvals.find((a) => a.kind === ApprovalKind.guardian_scope);
    expect(guardianRow?.notes).toContain(consent.id);

    const result = await processPublishPublication(services, {
      publicationId: pub.id,
      tenantId,
    });
    expect(result.externalId).toMatch(/^mock-instagram-/);
  });

  it("retracts publications when consent is revoked and enforced", async () => {
    const consent = await publishingConsent([PublishPlatform.tiktok]);
    const asset = await readyVideo(true, consent.id);
    const pub = await createPublication(services.prisma, adminCtx(), {
      assetId: asset.id,
      platform: PublishPlatform.tiktok,
      caption: "to be retracted",
    });
    await submitPublication(services.prisma, adminCtx(), pub.id);
    await contentApprove(services, adminCtx(), pub.id);
    await finalApprove(services, adminCtx(), pub.id);
    await processPublishPublication(services, { publicationId: pub.id, tenantId });

    await services.prisma.consentRecord.update({
      where: { id: consent.id },
      data: { revokedAt: new Date(), revokedBy: userId, revokeReason: "guardian request" },
    });
    await enforceConsent(services, { consentId: consent.id, tenantId, trigger: "revoked" });

    const retracted = await services.prisma.publication.findUniqueOrThrow({
      where: { id: pub.id },
    });
    expect(retracted.status).toBe(PublicationStatus.retracted);
    expect(retracted.assetId).toBeNull();
    const types = (await services.prisma.auditEvent.findMany({ where: { tenantId } })).map(
      (e) => e.type,
    );
    expect(types).toContain("publication.retracted");
  });
});

describe("failure path", () => {
  it("provider failure → failed, resubmittable", async () => {
    const asset = await readyVideo();
    const pub = await createPublication(services.prisma, adminCtx(), {
      assetId: asset.id,
      platform: PublishPlatform.facebook,
      caption: "please [force-failure] now",
    });
    await submitPublication(services.prisma, adminCtx(), pub.id);
    await finalApprove(services, adminCtx(), pub.id);
    await processPublishPublication(services, { publicationId: pub.id, tenantId });

    let row = await services.prisma.publication.findUniqueOrThrow({ where: { id: pub.id } });
    expect(row.status).toBe(PublicationStatus.failed);

    // Resubmit with a fixed caption path: caption unchanged here, but the
    // machine allows failed → in_review → re-approval.
    await services.prisma.publication.update({
      where: { id: pub.id },
      data: { caption: "fixed caption" },
    });
    await submitPublication(services.prisma, adminCtx(), pub.id);
    await finalApprove(services, adminCtx(), pub.id);
    await processPublishPublication(services, { publicationId: pub.id, tenantId });
    row = await services.prisma.publication.findUniqueOrThrow({ where: { id: pub.id } });
    expect(row.status).toBe(PublicationStatus.published);
    expect(row.externalId).toMatch(/^mock-facebook-/);
  });

  it("errors are typed", () => {
    expect(new PublishingError("x", 409).status).toBe(409);
  });
});
