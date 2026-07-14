/**
 * media-processing queue processors (ADR-AIVS-002 §6): inspect-media,
 * normalize-video (platform presets), generate-thumbnail. Results are
 * persisted as AssetVersion rows; processors are idempotent — re-delivery
 * checks current state before acting.
 */
import { randomUUID } from "node:crypto";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import type { AssetServices } from "@aivs/assets";
import { AssetStatus, MediaKind, VersionRole, type Asset } from "@aivs/database";
import { generateThumbnail, getPreset, inspectMedia, normalizeVideo } from "@aivs/media-core";
import type {
  GenerateThumbnailPayload,
  InspectMediaPayload,
  NormalizeVideoPayload,
} from "@aivs/queue";
import { buildAssetKey } from "@aivs/storage";
import { withLocalCopy } from "../local-file.ts";

const THUMBNAIL_WIDTH = 640;

async function readyAsset(services: AssetServices, assetId: string, tenantId: string) {
  const asset = await services.prisma.asset.findFirstOrThrow({
    where: { id: assetId, tenantId },
  });
  if (asset.status !== AssetStatus.ready || !asset.storageKey) {
    throw new Error(`Asset ${assetId} is ${asset.status}; media jobs require ready`);
  }
  return asset;
}

function versionKey(asset: Asset, ext: string): string {
  return buildAssetKey("assets", {
    tenantId: asset.tenantId,
    projectId: asset.projectId,
    assetId: asset.id,
    objectId: randomUUID(),
    ext,
  });
}

export async function processInspectMedia(
  services: AssetServices,
  payload: InspectMediaPayload,
): Promise<unknown> {
  const asset = await readyAsset(services, payload.assetId, payload.tenantId);
  return withLocalCopy(services.storage, asset.storageKey!, async (localPath) => {
    const metadata = await inspectMedia(localPath);
    const video = metadata.streams.find((s) => s.codecType === "video");
    await services.prisma.asset.update({
      where: { id: asset.id },
      data: {
        durationSeconds: metadata.durationSeconds || asset.durationSeconds,
        width: video?.width ?? asset.width,
        height: video?.height ?? asset.height,
      },
    });
    return { ...metadata, path: undefined };
  });
}

export async function processNormalizeVideo(
  services: AssetServices,
  payload: NormalizeVideoPayload,
): Promise<unknown> {
  const asset = await readyAsset(services, payload.assetId, payload.tenantId);
  if (asset.kind !== MediaKind.video) {
    throw new Error(`normalize-video requires a video asset, got ${asset.kind}`);
  }
  const preset = getPreset(payload.preset);

  // Idempotency: one normalized version per (asset, preset).
  const existing = await services.prisma.assetVersion.findFirst({
    where: { assetId: asset.id, role: VersionRole.normalized, preset: preset.name },
  });
  if (existing) return { versionId: existing.id, deduplicated: true };

  return withLocalCopy(services.storage, asset.storageKey!, async (localPath, workDir) => {
    const outPath = join(workDir, `${preset.name}.mp4`);
    await normalizeVideo(localPath, outPath, {
      targetWidth: preset.width,
      targetHeight: preset.height,
      targetFps: preset.fps,
    });
    const [outMeta, outStat] = [await inspectMedia(outPath), await stat(outPath)];
    const key = versionKey(asset, "mp4");
    await services.storage.putObjectStream(
      key,
      (await import("node:fs")).createReadStream(outPath),
      "video/mp4",
    );
    const version = await services.prisma.assetVersion.create({
      data: {
        assetId: asset.id,
        role: VersionRole.normalized,
        preset: preset.name,
        storageKey: key,
        contentType: "video/mp4",
        sizeBytes: BigInt(outStat.size),
        width: preset.width,
        height: preset.height,
        durationSeconds: outMeta.durationSeconds,
      },
    });
    return { versionId: version.id, storageKey: key, preset: preset.name };
  });
}

export async function processGenerateThumbnail(
  services: AssetServices,
  payload: GenerateThumbnailPayload,
): Promise<unknown> {
  const asset = await readyAsset(services, payload.assetId, payload.tenantId);
  if (asset.kind === MediaKind.audio) {
    return { skipped: "audio assets have no thumbnail" };
  }
  const atSeconds =
    asset.kind === MediaKind.video ? Math.min(1, (asset.durationSeconds ?? 2) / 2) : 0;

  return withLocalCopy(services.storage, asset.storageKey!, async (localPath, workDir) => {
    const outPath = join(workDir, "thumbnail.png");
    await generateThumbnail(localPath, outPath, { atSeconds, width: THUMBNAIL_WIDTH });
    const outStat = await stat(outPath);
    const key = versionKey(asset, "png");
    await services.storage.putObjectStream(
      key,
      (await import("node:fs")).createReadStream(outPath),
      "image/png",
    );
    const version = await services.prisma.assetVersion.create({
      data: {
        assetId: asset.id,
        role: VersionRole.thumbnail,
        storageKey: key,
        contentType: "image/png",
        sizeBytes: BigInt(outStat.size),
        width: THUMBNAIL_WIDTH,
      },
    });
    return { versionId: version.id, storageKey: key };
  });
}
