/**
 * Ingestion: stream an upload into the quarantine prefix with a hard byte
 * cap and sha256 computed in flight, then enqueue validation.
 * (ADR-AIVS-002 §3-§4, security baseline §2-§5.)
 */
import { createHash, randomUUID } from "node:crypto";
import { Transform, type Readable } from "node:stream";
import { AssetStatus, MediaKind, TransitionActor, type Asset } from "@aivs/database";
import { JOB_NAMES } from "@aivs/queue";
import { buildAssetKey } from "@aivs/storage";
import type { AssetServices } from "./context.ts";
import { enqueueWithRecord } from "./jobs.ts";
import { MAX_UPLOAD_BYTES, sanitizeDisplayName } from "./limits.ts";
import { recordInitialTransition, transitionAsset } from "./state-machine.ts";

export class UploadTooLargeError extends Error {
  readonly capBytes: number;

  constructor(capBytes: number) {
    super(`Upload exceeds the maximum allowed size of ${capBytes} bytes`);
    this.name = "UploadTooLargeError";
    this.capBytes = capBytes;
  }
}

export interface IngestUploadParams {
  tenantId: string;
  projectId: string;
  /** Client-supplied name — display metadata only, sanitized here. */
  originalFilename: string;
  /** Client-claimed content type — recorded, never trusted. */
  claimedContentType: string;
  featuresMinor: boolean;
  consentRecordId?: string;
  body: Readable;
  /** Override for tests; defaults to the global streaming cap. */
  maxBytes?: number;
}

export interface IngestResult {
  asset: Asset;
  validationJobId: string;
}

/**
 * Creates the asset row (uploaded), streams the body to quarantine while
 * hashing and enforcing the byte cap, transitions to quarantined, and
 * enqueues validation. On a tripped cap the partial object is removed and
 * the asset lands in rejected with an audit trail.
 */
export async function ingestUpload(
  services: AssetServices,
  params: IngestUploadParams,
): Promise<IngestResult> {
  const { prisma, storage, validationQueue } = services;
  const maxBytes = params.maxBytes ?? MAX_UPLOAD_BYTES;

  // Tenant/project must exist and belong together (tenant scoping, §8).
  const project = await prisma.project.findFirst({
    where: { id: params.projectId, tenantId: params.tenantId },
    select: { id: true },
  });
  if (!project) {
    throw new Error(`Project ${params.projectId} not found for tenant ${params.tenantId}`);
  }

  const asset = await prisma.asset.create({
    data: {
      tenantId: params.tenantId,
      projectId: params.projectId,
      // Kind is provisional until magic-byte + ffprobe validation.
      kind: MediaKind.video,
      status: AssetStatus.uploaded,
      displayName: sanitizeDisplayName(params.originalFilename),
      claimedContentType: params.claimedContentType,
      sizeBytes: 0,
      checksumSha256: "",
      featuresMinor: params.featuresMinor,
      consentRecordId: params.consentRecordId,
    },
  });
  await recordInitialTransition(prisma, asset.id, TransitionActor.api);

  const quarantineKey = buildAssetKey("quarantine", {
    tenantId: params.tenantId,
    projectId: params.projectId,
    assetId: asset.id,
    objectId: randomUUID(),
    ext: "upload",
  });

  const hash = createHash("sha256");
  let bytesSeen = 0;
  const capAndHash = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      bytesSeen += chunk.byteLength;
      if (bytesSeen > maxBytes) {
        callback(new UploadTooLargeError(maxBytes));
        return;
      }
      hash.update(chunk);
      callback(null, chunk);
    },
  });

  try {
    const guarded = params.body.pipe(capAndHash);
    // Source errors don't cross .pipe() — forward them so the upload aborts.
    params.body.on("error", (error) => capAndHash.destroy(error as Error));
    await storage.putObjectStream(quarantineKey, guarded, "application/octet-stream");
  } catch (error) {
    await storage.deleteObject(quarantineKey).catch(() => {});
    const reason =
      error instanceof UploadTooLargeError ? "size-cap-exceeded" : "upload-stream-failed";
    await transitionAsset(prisma, asset.id, AssetStatus.rejected, {
      actor: TransitionActor.system,
      reason,
    });
    throw error;
  }

  const checksum = hash.digest("hex");
  const quarantined = await transitionAsset(prisma, asset.id, AssetStatus.quarantined, {
    actor: TransitionActor.system,
    patch: { quarantineKey, sizeBytes: BigInt(bytesSeen), checksumSha256: checksum },
  });

  const { bullJobId } = await enqueueWithRecord({
    prisma,
    queue: validationQueue,
    jobName: JOB_NAMES.validateAsset,
    payload: { assetId: asset.id, tenantId: params.tenantId },
    tenantId: params.tenantId,
    assetId: asset.id,
  });

  return { asset: quarantined, validationJobId: bullJobId };
}
