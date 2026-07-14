/** JSON-safe views of Prisma rows (BigInt → number, Date → ISO string). */
import type { Asset, AssetTransition, AssetVersion, Job } from "@aivs/database";

export function serializeAsset(asset: Asset) {
  return {
    id: asset.id,
    tenantId: asset.tenantId,
    projectId: asset.projectId,
    kind: asset.kind,
    status: asset.status,
    displayName: asset.displayName,
    claimedContentType: asset.claimedContentType,
    detectedContentType: asset.detectedContentType,
    sizeBytes: Number(asset.sizeBytes),
    durationSeconds: asset.durationSeconds,
    width: asset.width,
    height: asset.height,
    checksumSha256: asset.checksumSha256,
    featuresMinor: asset.featuresMinor,
    consentRecordId: asset.consentRecordId,
    rejectionReason: asset.rejectionReason,
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString(),
  };
}

export function serializeVersion(version: AssetVersion) {
  return {
    id: version.id,
    role: version.role,
    preset: version.preset,
    contentType: version.contentType,
    sizeBytes: Number(version.sizeBytes),
    width: version.width,
    height: version.height,
    durationSeconds: version.durationSeconds,
    createdAt: version.createdAt.toISOString(),
  };
}

export function serializeTransition(transition: AssetTransition) {
  return {
    id: transition.id,
    fromStatus: transition.fromStatus,
    toStatus: transition.toStatus,
    reason: transition.reason,
    actor: transition.actor,
    createdAt: transition.createdAt.toISOString(),
  };
}

export function serializeJob(job: Job) {
  return {
    id: job.id,
    queue: job.queue,
    name: job.name,
    status: job.status,
    attempts: job.attempts,
    error: job.error,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}
