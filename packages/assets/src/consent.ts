/**
 * Child-media consent lifecycle (ADR-AIVS-004 §1-§2): create, attach,
 * revoke, list — every action audited. Status is derived, never stored.
 */
import { AssetStatus, ConsentScope, type ConsentRecord, type PrismaClient } from "@aivs/database";
import { writeAudit } from "@aivs/auth";
import { JOB_NAMES } from "@aivs/queue";
import type { AssetServices } from "./context.ts";
import { enqueueWithRecord } from "./jobs.ts";
import { REJECTION_REASONS } from "./validation.ts";

export type ConsentStatus = "active" | "expired" | "revoked";

export class ConsentError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ConsentError";
    this.status = status;
  }
}

export function getConsentStatus(
  record: Pick<ConsentRecord, "revokedAt" | "expiresAt">,
  now: Date = new Date(),
): ConsentStatus {
  if (record.revokedAt !== null) return "revoked";
  if (record.expiresAt <= now) return "expired";
  return "active";
}

export interface CreateConsentParams {
  tenantId: string;
  userId: string;
  subjectLabel: string;
  guardianName: string;
  guardianContact?: string;
  scope: ConsentScope;
  platforms?: string[];
  expiresAt: Date;
  documentRef?: string;
}

export async function createConsent(prisma: PrismaClient, params: CreateConsentParams) {
  if (params.expiresAt <= new Date()) {
    throw new ConsentError("expiresAt must be in the future", 400);
  }
  const record = await prisma.consentRecord.create({
    data: {
      tenantId: params.tenantId,
      subjectLabel: params.subjectLabel.trim(),
      guardianName: params.guardianName.trim(),
      guardianContact: params.guardianContact?.trim(),
      scope: params.scope,
      platforms: params.platforms ?? [],
      expiresAt: params.expiresAt,
      documentRef: params.documentRef?.trim(),
    },
  });
  await writeAudit(prisma, {
    type: "consent.created",
    tenantId: params.tenantId,
    userId: params.userId,
    detail: { consentId: record.id, scope: record.scope, expiresAt: record.expiresAt },
  });
  return record;
}

/**
 * Attaches an active consent to an asset. A `consent-missing` rejected
 * asset with its quarantine object retained is auto-re-enqueued for
 * validation — it becomes ready without re-upload.
 */
export async function attachConsent(
  services: AssetServices,
  params: { assetId: string; consentId: string; tenantId: string; userId: string },
): Promise<{ revalidationEnqueued: boolean }> {
  const { prisma, validationQueue } = services;
  const consent = await prisma.consentRecord.findFirst({
    where: { id: params.consentId, tenantId: params.tenantId },
  });
  if (!consent) throw new ConsentError("consent record not found", 404);
  if (getConsentStatus(consent) !== "active") {
    throw new ConsentError(`consent is ${getConsentStatus(consent)}, not active`, 409);
  }
  const asset = await prisma.asset.findFirst({
    where: { id: params.assetId, tenantId: params.tenantId },
  });
  if (!asset) throw new ConsentError("asset not found", 404);

  await prisma.asset.update({
    where: { id: asset.id },
    data: { consentRecordId: consent.id },
  });
  await writeAudit(prisma, {
    type: "consent.attached",
    tenantId: params.tenantId,
    userId: params.userId,
    detail: { consentId: consent.id, assetId: asset.id },
  });

  const needsRevalidation =
    asset.status === AssetStatus.rejected &&
    asset.rejectionReason === REJECTION_REASONS.consentMissing &&
    asset.quarantineKey !== null;
  if (needsRevalidation) {
    await enqueueWithRecord({
      prisma,
      queue: validationQueue,
      jobName: JOB_NAMES.validateAsset,
      payload: { assetId: asset.id, tenantId: params.tenantId },
      tenantId: params.tenantId,
      assetId: asset.id,
    });
  }
  return { revalidationEnqueued: needsRevalidation };
}

/** Revokes a consent and enqueues deletion enforcement immediately. */
export async function revokeConsent(
  services: AssetServices,
  params: { consentId: string; tenantId: string; userId: string; reason: string },
) {
  const { prisma, enforcementQueue } = services;
  const consent = await prisma.consentRecord.findFirst({
    where: { id: params.consentId, tenantId: params.tenantId },
  });
  if (!consent) throw new ConsentError("consent record not found", 404);
  if (consent.revokedAt) throw new ConsentError("consent is already revoked", 409);

  const updated = await prisma.consentRecord.update({
    where: { id: consent.id },
    data: {
      revokedAt: new Date(),
      revokedBy: params.userId,
      revokeReason: params.reason.trim(),
    },
  });
  await writeAudit(prisma, {
    type: "consent.revoked",
    tenantId: params.tenantId,
    userId: params.userId,
    detail: { consentId: consent.id, reason: params.reason.trim() },
  });
  await enforcementQueue.add(
    JOB_NAMES.enforceConsent,
    { consentId: consent.id, tenantId: params.tenantId, trigger: "revoked" },
    { jobId: `${JOB_NAMES.enforceConsent}__${consent.id}` },
  );
  return updated;
}

export async function listConsents(prisma: PrismaClient, tenantId: string, now: Date = new Date()) {
  const records = await prisma.consentRecord.findMany({
    where: { tenantId },
    include: { _count: { select: { assets: true } } },
    orderBy: { createdAt: "desc" },
  });
  return records.map((record) => ({
    id: record.id,
    subjectLabel: record.subjectLabel,
    guardianName: record.guardianName,
    guardianContact: record.guardianContact,
    scope: record.scope,
    platforms: record.platforms,
    documentRef: record.documentRef,
    expiresAt: record.expiresAt.toISOString(),
    revokedAt: record.revokedAt?.toISOString() ?? null,
    revokeReason: record.revokeReason,
    enforcedAt: record.enforcedAt?.toISOString() ?? null,
    status: getConsentStatus(record, now),
    linkedAssets: record._count.assets,
    createdAt: record.createdAt.toISOString(),
  }));
}
