/**
 * Signed-URL issuance policy (ADR-AIVS-003 §3, baseline §7/§10): ready
 * assets only, never quarantine keys, and `featuresMinor` assets require
 * child-media access with a mandatory audit write BEFORE the URL exists.
 */
import { AuthzError, canAccessChildMedia, writeAuditStrict } from "@aivs/auth";
import { AssetStatus, VersionRole, type MembershipRole } from "@aivs/database";
import { SIGNED_URL_DEFAULT_TTL_SECONDS, isQuarantineKey } from "@aivs/storage";
import type { AssetServices } from "./context.ts";

export class SignedUrlError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "SignedUrlError";
    this.status = status;
  }
}

export interface IssueSignedUrlParams {
  assetId: string;
  tenantId: string;
  userId: string;
  role: MembershipRole;
  versionId?: string;
  expiresInSeconds?: number;
}

export async function issueAssetSignedUrl(
  services: AssetServices,
  params: IssueSignedUrlParams,
): Promise<{ url: string; versionId: string; expiresInSeconds: number }> {
  const { prisma, storage } = services;
  const expiresInSeconds = params.expiresInSeconds ?? SIGNED_URL_DEFAULT_TTL_SECONDS;

  const asset = await prisma.asset.findFirst({
    where: { id: params.assetId, tenantId: params.tenantId },
    include: { versions: true },
  });
  if (!asset) throw new SignedUrlError("asset not found", 404);

  if (asset.featuresMinor && !canAccessChildMedia(params.role)) {
    throw new AuthzError("child-media access requires the child_media_reviewer role", 403);
  }
  if (asset.status !== AssetStatus.ready) {
    throw new SignedUrlError(`signed URLs require a ready asset, got ${asset.status}`, 409);
  }

  const version = params.versionId
    ? asset.versions.find((v) => v.id === params.versionId)
    : asset.versions.find((v) => v.role === VersionRole.original);
  if (!version) throw new SignedUrlError("version not found", 404);
  if (isQuarantineKey(version.storageKey)) {
    throw new SignedUrlError("version is not servable", 409);
  }

  // Mandatory audit for child media — must commit before the URL exists.
  if (asset.featuresMinor) {
    await writeAuditStrict(prisma, {
      type: "asset.child_media.url_issued",
      tenantId: params.tenantId,
      userId: params.userId,
      detail: { assetId: asset.id, versionId: version.id, expiresInSeconds },
    });
  }

  const url = await storage.getSignedUrl(version.storageKey, expiresInSeconds);
  return { url, versionId: version.id, expiresInSeconds };
}
