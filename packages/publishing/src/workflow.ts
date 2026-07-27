/**
 * Publishing workflow (ADR-AIVS-008): status machine, the baseline §10
 * approval matrix (content review + guardian-scope check + final
 * approval for child media), mock publish execution, audit throughout.
 */
import { getConsentStatus, type AssetServices } from "@aivs/assets";
import { canAccessChildMedia, writeAudit } from "@aivs/auth";
import {
  ApprovalKind,
  AssetStatus,
  MediaKind,
  MembershipRole,
  PublicationStatus,
  type PrismaClient,
  type PublishPlatform,
} from "@aivs/database";
import { resolvePublishingProvider, type PublishingProvider } from "@aivs/providers";
import { JOB_NAMES, type PublishPublicationPayload } from "@aivs/queue";

export class PublishingError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "PublishingError";
    this.status = status;
  }
}

/** Env-selected (PUBLISH_PROVIDER, ADR-AIVS-009); mock default. */
const defaultProvider = resolvePublishingProvider();

export interface PublishContext {
  tenantId: string;
  userId: string;
  role: MembershipRole;
}

/** Baseline §10 approval matrix. */
export function requiredApprovalKinds(featuresMinor: boolean): ApprovalKind[] {
  return featuresMinor
    ? [ApprovalKind.content_review, ApprovalKind.guardian_scope, ApprovalKind.final_approval]
    : [ApprovalKind.final_approval];
}

async function getOwnedPublication(prisma: PrismaClient, tenantId: string, id: string) {
  const publication = await prisma.publication.findFirst({
    where: { id, tenantId },
    include: { approvals: true, asset: { include: { consentRecord: true } } },
  });
  if (!publication) throw new PublishingError("publication not found", 404);
  return publication;
}

export async function createPublication(
  prisma: PrismaClient,
  ctx: PublishContext,
  params: { assetId: string; platform: PublishPlatform; caption: string },
) {
  const asset = await prisma.asset.findFirst({
    where: { id: params.assetId, tenantId: ctx.tenantId },
  });
  if (!asset) throw new PublishingError("asset not found", 404);
  if (asset.kind !== MediaKind.video) {
    throw new PublishingError("only video assets can be published", 409);
  }
  if (asset.status !== AssetStatus.ready) {
    throw new PublishingError(`asset must be ready, got ${asset.status}`, 409);
  }
  if (asset.featuresMinor && !canAccessChildMedia(ctx.role)) {
    throw new PublishingError("child media requires the child_media_reviewer role", 403);
  }

  const publication = await prisma.publication.create({
    data: {
      tenantId: ctx.tenantId,
      assetId: asset.id,
      platform: params.platform,
      caption: params.caption.trim(),
      createdBy: ctx.userId,
    },
  });
  await writeAudit(prisma, {
    type: "publication.created",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    detail: { publicationId: publication.id, assetId: asset.id, platform: params.platform },
  });
  return publication;
}

/** draft|failed → in_review; approvals cleared (fresh review cycle). */
export async function submitPublication(prisma: PrismaClient, ctx: PublishContext, id: string) {
  const publication = await getOwnedPublication(prisma, ctx.tenantId, id);
  if (
    publication.status !== PublicationStatus.draft &&
    publication.status !== PublicationStatus.failed
  ) {
    throw new PublishingError(`cannot submit from ${publication.status}`, 409);
  }
  if (!publication.asset) throw new PublishingError("asset no longer exists", 409);
  await prisma.publicationApproval.deleteMany({ where: { publicationId: id } });
  const updated = await prisma.publication.update({
    where: { id },
    data: { status: PublicationStatus.in_review, error: null },
  });
  await writeAudit(prisma, {
    type: "publication.submitted",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    detail: { publicationId: id },
  });
  return updated;
}

/**
 * Reviewer action for child media: writes `content_review` AND runs the
 * guardian-scope check (consent active + scope=publishing + platform
 * listed), writing `guardian_scope` on pass. Fails closed with the
 * precise reason.
 */
export async function contentApprove(
  services: AssetServices,
  ctx: PublishContext,
  id: string,
  notes?: string,
) {
  const { prisma } = services;
  if (!canAccessChildMedia(ctx.role)) {
    throw new PublishingError("requires child_media_reviewer or higher", 403);
  }
  const publication = await getOwnedPublication(prisma, ctx.tenantId, id);
  if (publication.status !== PublicationStatus.in_review) {
    throw new PublishingError(`publication is ${publication.status}, not in_review`, 409);
  }
  const asset = publication.asset;
  if (!asset) throw new PublishingError("asset no longer exists", 409);
  if (!asset.featuresMinor) {
    throw new PublishingError("content review applies to child media only", 409);
  }

  const consent = asset.consentRecord;
  if (!consent) throw new PublishingError("guardian-scope check failed: no consent record", 409);
  if (getConsentStatus(consent) !== "active") {
    throw new PublishingError(
      `guardian-scope check failed: consent is ${getConsentStatus(consent)}`,
      409,
    );
  }
  if (consent.scope !== "publishing") {
    throw new PublishingError("guardian-scope check failed: consent scope is internal only", 409);
  }
  if (!consent.platforms.includes(publication.platform)) {
    throw new PublishingError(
      `guardian-scope check failed: consent does not cover ${publication.platform}`,
      409,
    );
  }
  // ADR-AIVS-011 §D: flag-gated strengthening — when enforcement is on,
  // the guardian must have confirmed via the emailed link.
  if (process.env.ENFORCE_GUARDIAN_CONFIRMATION === "true" && !consent.guardianConfirmedAt) {
    throw new PublishingError(
      "guardian-scope check failed: guardian email confirmation is pending",
      409,
    );
  }

  await prisma.publicationApproval.createMany({
    data: [
      { publicationId: id, kind: ApprovalKind.content_review, approvedBy: ctx.userId, notes },
      {
        publicationId: id,
        kind: ApprovalKind.guardian_scope,
        approvedBy: ctx.userId,
        notes: `verified consent ${consent.id}`,
      },
    ],
    skipDuplicates: true,
  });
  return maybeFinalize(services, ctx, id);
}

/** admin+ final approval; child media requires the other rows first. */
export async function finalApprove(
  services: AssetServices,
  ctx: PublishContext,
  id: string,
  notes?: string,
) {
  const { prisma } = services;
  const publication = await getOwnedPublication(prisma, ctx.tenantId, id);
  if (publication.status !== PublicationStatus.in_review) {
    throw new PublishingError(`publication is ${publication.status}, not in_review`, 409);
  }
  if (!publication.asset) throw new PublishingError("asset no longer exists", 409);
  if (publication.asset.featuresMinor) {
    const kinds = new Set(publication.approvals.map((a) => a.kind));
    if (!kinds.has(ApprovalKind.content_review) || !kinds.has(ApprovalKind.guardian_scope)) {
      throw new PublishingError(
        "child media needs content review + guardian-scope check before final approval",
        409,
      );
    }
  }
  await prisma.publicationApproval.createMany({
    data: [{ publicationId: id, kind: ApprovalKind.final_approval, approvedBy: ctx.userId, notes }],
    skipDuplicates: true,
  });
  return maybeFinalize(services, ctx, id);
}

/** Completes to `approved` + enqueues publish when the matrix is satisfied. */
async function maybeFinalize(services: AssetServices, ctx: PublishContext, id: string) {
  const { prisma, publishingQueue } = services;
  const publication = await getOwnedPublication(prisma, ctx.tenantId, id);
  const required = requiredApprovalKinds(publication.asset?.featuresMinor ?? false);
  const present = new Set(publication.approvals.map((a) => a.kind));
  if (!required.every((kind) => present.has(kind))) return publication;

  const approved = await prisma.publication.update({
    where: { id },
    data: { status: PublicationStatus.approved },
  });
  await writeAudit(prisma, {
    type: "publication.approved",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    detail: { publicationId: id, approvals: [...present] },
  });
  // Deterministic per approval cycle: the final-approval row id is fresh
  // after every reject/resubmit (approvals are cleared).
  const finalRow = publication.approvals.find((a) => a.kind === ApprovalKind.final_approval);
  await publishingQueue.add(
    JOB_NAMES.publishPublication,
    { publicationId: id, tenantId: ctx.tenantId },
    { jobId: `${JOB_NAMES.publishPublication}__${finalRow?.id ?? id}` },
  );
  return approved;
}

export async function rejectPublication(
  prisma: PrismaClient,
  ctx: PublishContext,
  id: string,
  reason: string,
) {
  if (!canAccessChildMedia(ctx.role)) {
    throw new PublishingError("requires child_media_reviewer or higher", 403);
  }
  const publication = await getOwnedPublication(prisma, ctx.tenantId, id);
  if (publication.status !== PublicationStatus.in_review) {
    throw new PublishingError(`publication is ${publication.status}, not in_review`, 409);
  }
  await prisma.publicationApproval.deleteMany({ where: { publicationId: id } });
  const updated = await prisma.publication.update({
    where: { id },
    data: { status: PublicationStatus.draft },
  });
  await writeAudit(prisma, {
    type: "publication.rejected",
    tenantId: ctx.tenantId,
    userId: ctx.userId,
    detail: { publicationId: id, reason },
  });
  return updated;
}

/** Worker processor. Idempotent: published rows are a no-op. */
export async function processPublishPublication(
  services: AssetServices,
  payload: PublishPublicationPayload,
  provider: PublishingProvider = defaultProvider,
): Promise<{ externalId: string | null; skipped?: boolean }> {
  const { prisma } = services;
  const publication = await prisma.publication.findFirstOrThrow({
    where: { id: payload.publicationId, tenantId: payload.tenantId },
    include: { asset: true },
  });
  if (publication.status === PublicationStatus.published) {
    return { externalId: publication.externalId, skipped: true };
  }
  if (publication.status !== PublicationStatus.approved) {
    return { externalId: null, skipped: true };
  }
  if (!publication.asset?.storageKey) {
    throw new Error("publication asset is gone (retracted or deleted)");
  }

  const storageKey = publication.asset.storageKey;
  const result = await provider.publish({
    platform: publication.platform,
    assetKey: storageKey,
    caption: publication.caption,
    tenantId: payload.tenantId,
    getMedia: () => services.storage.getObject(storageKey),
  });
  if (result.status !== "succeeded") {
    await prisma.publication.update({
      where: { id: publication.id },
      data: { status: PublicationStatus.failed, error: `provider returned ${result.status}` },
    });
    await writeAudit(prisma, {
      type: "publication.failed",
      tenantId: payload.tenantId,
      detail: { publicationId: publication.id, providerStatus: result.status },
    });
    return { externalId: null };
  }

  const published = await prisma.publication.update({
    where: { id: publication.id },
    data: { status: PublicationStatus.published, externalId: result.publicationId, error: null },
  });
  await writeAudit(prisma, {
    type: "publication.published",
    tenantId: payload.tenantId,
    detail: { publicationId: publication.id, externalId: result.publicationId },
  });
  return { externalId: published.externalId };
}

/** Worker final-attempt failure handler. */
export async function markPublishFailed(
  services: AssetServices,
  publicationId: string,
  error: string,
): Promise<void> {
  await services.prisma.publication.updateMany({
    where: { id: publicationId, status: PublicationStatus.approved },
    data: { status: PublicationStatus.failed, error: error.slice(0, 2000) },
  });
}

/** Tenant list; child-media publications hidden below reviewer. */
export async function listPublications(
  prisma: PrismaClient,
  tenantId: string,
  role: MembershipRole,
) {
  return prisma.publication.findMany({
    where: {
      tenantId,
      ...(canAccessChildMedia(role)
        ? {}
        : { OR: [{ asset: { featuresMinor: false } }, { asset: null }] }),
    },
    include: {
      approvals: { orderBy: { createdAt: "asc" } },
      asset: {
        select: { displayName: true, featuresMinor: true, project: { select: { name: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}
