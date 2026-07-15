/**
 * Consent enforcement (ADR-AIVS-004 §3): hard deletion of child media on
 * revocation/expiry, plus the retention sweep. Deletion order is
 * object-first, then rows — a mid-job crash converges on retry instead of
 * leaking orphaned child media. Tombstones carry no child PII.
 */
import { writeAuditStrict } from "@aivs/auth";
import { AssetStatus } from "@aivs/database";
import { JOB_NAMES, type EnforceConsentPayload } from "@aivs/queue";
import type { AssetServices } from "./context.ts";
import { REJECTION_REASONS } from "./validation.ts";

export const QUARANTINE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Hard-deletes every asset linked to the consent: all storage objects
 * (promoted, retained quarantine, every version), then the rows (cascades
 * versions/transitions). Idempotent — re-delivery finds nothing linked.
 */
export async function enforceConsent(
  services: AssetServices,
  payload: EnforceConsentPayload,
): Promise<{ deletedAssets: number }> {
  const { prisma, storage } = services;
  const assets = await prisma.asset.findMany({
    where: {
      tenantId: payload.tenantId,
      consentRecordId: payload.consentId,
      featuresMinor: true,
    },
    include: { versions: true },
  });

  for (const asset of assets) {
    const keys = new Set<string>();
    if (asset.storageKey) keys.add(asset.storageKey);
    if (asset.quarantineKey) keys.add(asset.quarantineKey);
    for (const version of asset.versions) keys.add(version.storageKey);
    for (const key of keys) {
      await storage.deleteObject(key);
    }
    // Job rows keep their history but must not point at the deleted asset.
    await prisma.job.updateMany({ where: { assetId: asset.id }, data: { assetId: null } });
    await prisma.asset.delete({ where: { id: asset.id } });
    await writeAuditStrict(prisma, {
      type: "asset.child_media.deleted",
      tenantId: payload.tenantId,
      detail: {
        assetId: asset.id,
        versionCount: asset.versions.length,
        objectCount: keys.size,
        trigger: payload.trigger,
      },
    });
  }

  await prisma.consentRecord.update({
    where: { id: payload.consentId },
    data: { enforcedAt: new Date() },
  });
  return { deletedAssets: assets.length };
}

/**
 * Repeatable sweep: (1) enforce expired, unrevoked, un-enforced consents;
 * (2) baseline §9 raw-upload retention — delete quarantine objects of
 * consent-missing rejections older than 30 days (rows stay as audit trail).
 */
export async function retentionSweep(
  services: AssetServices,
  now: Date = new Date(),
): Promise<{ expiredConsents: number; quarantineObjectsDeleted: number }> {
  const { prisma, storage } = services;

  const expired = await prisma.consentRecord.findMany({
    where: {
      expiresAt: { lte: now },
      revokedAt: null,
      enforcedAt: null,
      assets: { some: { featuresMinor: true } },
    },
  });
  for (const consent of expired) {
    await writeAuditStrict(prisma, {
      type: "consent.expired_swept",
      tenantId: consent.tenantId,
      detail: { consentId: consent.id, expiresAt: consent.expiresAt },
    });
    await enforceConsent(services, {
      consentId: consent.id,
      tenantId: consent.tenantId,
      trigger: "expired",
    });
  }

  const staleQuarantine = await prisma.asset.findMany({
    where: {
      status: AssetStatus.rejected,
      rejectionReason: REJECTION_REASONS.consentMissing,
      quarantineKey: { not: null },
      createdAt: { lte: new Date(now.getTime() - QUARANTINE_RETENTION_MS) },
    },
  });
  for (const asset of staleQuarantine) {
    await storage.deleteObject(asset.quarantineKey!);
    await prisma.asset.update({
      where: { id: asset.id },
      data: { quarantineKey: null },
    });
    await writeAuditStrict(prisma, {
      type: "asset.child_media.deleted",
      tenantId: asset.tenantId,
      detail: { assetId: asset.id, scope: "quarantine-retention", trigger: "expired" },
    });
  }

  return { expiredConsents: expired.length, quarantineObjectsDeleted: staleQuarantine.length };
}

/** Registers the hourly repeatable sweep (worker startup). */
export async function scheduleRetentionSweep(
  services: AssetServices,
  everyMs = 60 * 60 * 1000,
): Promise<void> {
  await services.enforcementQueue.add(
    JOB_NAMES.retentionSweep,
    {},
    { repeat: { every: everyMs }, jobId: JOB_NAMES.retentionSweep },
  );
}
