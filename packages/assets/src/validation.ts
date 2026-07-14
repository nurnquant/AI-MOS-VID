/**
 * Validation worker logic (ADR-AIVS-002 §3): magic bytes → kind match →
 * ffprobe/image decode → limits → malware-scan boundary → consent gate →
 * promotion or rejection. Runs inside the asset-validation queue processor.
 */
import { randomUUID } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import {
  AssetStatus,
  MediaKind,
  TransitionActor,
  VersionRole,
  type ConsentRecord,
} from "@aivs/database";
import { inspectMedia } from "@aivs/media-core";
import { JOB_NAMES } from "@aivs/queue";
import { buildAssetKey } from "@aivs/storage";
import sharp from "sharp";
import type { AssetServices } from "./context.ts";
import { enqueueWithRecord } from "./jobs.ts";
import { checkLimits } from "./limits.ts";
import { SNIFF_LENGTH, sniffMediaType, type DetectedType } from "./magic-bytes.ts";
import { transitionAsset } from "./state-machine.ts";

export const REJECTION_REASONS = {
  unknownType: "unsupported-or-unrecognized-type",
  kindMismatch: "claimed-kind-mismatch",
  decodeFailed: "media-decode-failed",
  limits: "limits-exceeded",
  malware: "malware-detected",
  consentMissing: "consent-missing",
  processingFailed: "processing-failed",
} as const;

export interface ValidationOutcome {
  status: typeof AssetStatus.ready | typeof AssetStatus.rejected;
  reason?: string;
}

function kindFromClaimed(claimedContentType: string): MediaKind | null {
  const [top] = claimedContentType.split("/");
  if (top === "video") return MediaKind.video;
  if (top === "audio") return MediaKind.audio;
  if (top === "image") return MediaKind.image;
  return null;
}

function consentIsValid(record: ConsentRecord | null, now: Date): boolean {
  return !!record && record.revokedAt === null && record.expiresAt > now;
}

interface ProbeResult {
  durationSeconds?: number;
  width?: number;
  height?: number;
}

async function probeMedia(detected: DetectedType, filePath: string): Promise<ProbeResult> {
  if (detected.kind === MediaKind.image) {
    const meta = await sharp(filePath).metadata();
    if (!meta.width || !meta.height) throw new Error("image decode returned no dimensions");
    return { width: meta.width, height: meta.height };
  }
  const meta = await inspectMedia(filePath);
  const video = meta.streams.find((s) => s.codecType === "video");
  if (detected.kind === MediaKind.video && !video) {
    throw new Error("no video stream in file detected as video");
  }
  return {
    durationSeconds: meta.durationSeconds,
    width: video?.width,
    height: video?.height,
  };
}

/**
 * Runs the full validation ladder for a quarantined (or reprocessed
 * rejected) asset. Every rejection reason is recorded in the audit trail.
 * Only the consent-missing rejection keeps the quarantine object.
 */
export async function validateAsset(
  services: AssetServices,
  assetId: string,
  options: { bullJobRecordId?: string } = {},
): Promise<ValidationOutcome> {
  const { prisma, storage, scanner, mediaQueue } = services;
  const asset = await prisma.asset.findUniqueOrThrow({
    where: { id: assetId },
    include: { consentRecord: true },
  });
  if (!asset.quarantineKey) {
    throw new Error(`Asset ${assetId} has no quarantine object to validate`);
  }

  await transitionAsset(prisma, assetId, AssetStatus.validating, {
    actor: TransitionActor.system,
    jobId: options.bullJobRecordId,
  });

  const reject = async (
    reason: string,
    { keepObject = false }: { keepObject?: boolean } = {},
  ): Promise<ValidationOutcome> => {
    if (!keepObject) {
      await storage.deleteObject(asset.quarantineKey!).catch(() => {});
    }
    await transitionAsset(prisma, assetId, AssetStatus.rejected, {
      actor: TransitionActor.system,
      reason,
      jobId: options.bullJobRecordId,
      patch: {
        rejectionReason: reason,
        ...(keepObject ? {} : { quarantineKey: null }),
      },
    });
    return { status: AssetStatus.rejected, reason };
  };

  const workDir = await mkdtemp(join(tmpdir(), "aivs-validate-"));
  try {
    const localPath = join(workDir, "quarantined.bin");
    await pipeline(
      await storage.getObjectStream(asset.quarantineKey),
      createWriteStream(localPath),
    );

    // 1. Magic bytes against the allowlist.
    const head = new Uint8Array((await readFile(localPath)).subarray(0, SNIFF_LENGTH));
    const detected = sniffMediaType(head);
    if (!detected) return await reject(REJECTION_REASONS.unknownType);

    // 2. Claimed type must agree with detected kind.
    const claimedKind = kindFromClaimed(asset.claimedContentType);
    if (claimedKind !== detected.kind) return await reject(REJECTION_REASONS.kindMismatch);

    // 3. Deep decode (ffprobe / sharp).
    let probe: ProbeResult;
    try {
      probe = await probeMedia(detected, localPath);
    } catch {
      return await reject(REJECTION_REASONS.decodeFailed);
    }

    // 4. Size/duration limits on detected kind.
    const sizeBytes = Number(asset.sizeBytes);
    const limitError = checkLimits(detected.kind, sizeBytes, probe.durationSeconds);
    if (limitError) return await reject(REJECTION_REASONS.limits);

    // 5. Malware scan boundary.
    const scan = await scanner.scan(localPath);
    if (!scan.clean) return await reject(REJECTION_REASONS.malware);

    // 6. Consent gate: asset featuring a minor cannot leave quarantine
    //    without a valid consent record. Object is retained for later
    //    consent, unlike every other rejection.
    if (asset.featuresMinor && !consentIsValid(asset.consentRecord, new Date())) {
      return await reject(REJECTION_REASONS.consentMissing, { keepObject: true });
    }

    // Promotion: copy quarantine → assets, verify size, delete quarantine.
    const promotedKey = buildAssetKey("assets", {
      tenantId: asset.tenantId,
      projectId: asset.projectId,
      assetId: asset.id,
      objectId: randomUUID(),
      ext: detected.ext,
    });
    await storage.copyObject(asset.quarantineKey, promotedKey);
    const promotedSize = await storage.objectSize(promotedKey);
    if (promotedSize !== sizeBytes) {
      await storage.deleteObject(promotedKey).catch(() => {});
      throw new Error(
        `Promotion size mismatch for ${assetId}: quarantine=${sizeBytes} promoted=${promotedSize}`,
      );
    }
    await storage.deleteObject(asset.quarantineKey);

    await prisma.assetVersion.create({
      data: {
        assetId: asset.id,
        role: VersionRole.original,
        storageKey: promotedKey,
        contentType: detected.contentType,
        sizeBytes: asset.sizeBytes,
        width: probe.width,
        height: probe.height,
        durationSeconds: probe.durationSeconds,
      },
    });
    await transitionAsset(prisma, assetId, AssetStatus.ready, {
      actor: TransitionActor.system,
      jobId: options.bullJobRecordId,
      patch: {
        kind: detected.kind,
        detectedContentType: detected.contentType,
        storageKey: promotedKey,
        quarantineKey: null,
        durationSeconds: probe.durationSeconds,
        width: probe.width,
        height: probe.height,
        rejectionReason: null,
      },
    });

    // Post-promotion media jobs: metadata persistence + thumbnail.
    await enqueueWithRecord({
      prisma,
      queue: mediaQueue,
      jobName: JOB_NAMES.inspectMedia,
      payload: { assetId: asset.id, tenantId: asset.tenantId },
      tenantId: asset.tenantId,
      assetId: asset.id,
    });
    await enqueueWithRecord({
      prisma,
      queue: mediaQueue,
      jobName: JOB_NAMES.generateThumbnail,
      payload: { assetId: asset.id, tenantId: asset.tenantId },
      tenantId: asset.tenantId,
      assetId: asset.id,
    });

    return { status: AssetStatus.ready };
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

/** Reprocess entry points (ADR §3): rejected → revalidate, ready → media jobs. */
export async function reprocessAsset(
  services: AssetServices,
  assetId: string,
  tenantId: string,
): Promise<{ enqueued: string }> {
  const { prisma, validationQueue, mediaQueue } = services;
  const asset = await prisma.asset.findFirstOrThrow({
    where: { id: assetId, tenantId },
  });

  if (asset.status === AssetStatus.rejected) {
    if (!asset.quarantineKey) {
      throw new Error(
        `Asset ${assetId} was rejected and its quarantine object is gone; re-upload required`,
      );
    }
    const { bullJobId } = await enqueueWithRecord({
      prisma,
      queue: validationQueue,
      jobName: JOB_NAMES.validateAsset,
      payload: { assetId, tenantId },
      tenantId,
      assetId,
    });
    return { enqueued: bullJobId };
  }

  if (asset.status === AssetStatus.ready) {
    const { bullJobId } = await enqueueWithRecord({
      prisma,
      queue: mediaQueue,
      jobName: JOB_NAMES.generateThumbnail,
      payload: { assetId, tenantId },
      tenantId,
      assetId,
    });
    return { enqueued: bullJobId };
  }

  throw new Error(`Asset ${assetId} in status ${asset.status} cannot be reprocessed`);
}

export { consentIsValid };
