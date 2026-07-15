/**
 * GET /api/assets/{id}/signed-url[?versionId=] — time-limited signed URL
 * for a ready asset's version (default: original). viewer+, but
 * `featuresMinor` assets require child_media_reviewer+ and the access is
 * audit-logged BEFORE the URL is returned (baseline §7/§10). Quarantined
 * objects are never served.
 */
import { NextResponse, type NextRequest } from "next/server";
import { canAccessChildMedia, writeAuditStrict } from "@aivs/auth";
import { AssetStatus, VersionRole } from "@aivs/database";
import { SIGNED_URL_DEFAULT_TTL_SECONDS, isQuarantineKey } from "@aivs/storage";
import { z } from "zod";
import { authErrorResponse, requireContext } from "@/lib/auth-context";
import { getServices } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  versionId: z.uuid().optional(),
  expiresIn: z.coerce.number().int().min(60).max(86_400).default(SIGNED_URL_DEFAULT_TTL_SECONDS),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { prisma, storage } = getServices();
  try {
    const { user, tenant, role } = await requireContext(request);
    const { id } = await params;
    const parsed = querySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
    }

    const asset = await prisma.asset.findFirst({
      where: { id, tenantId: tenant.id },
      include: { versions: true },
    });
    if (!asset) return NextResponse.json({ error: "asset not found" }, { status: 404 });

    if (asset.featuresMinor && !canAccessChildMedia(role)) {
      return NextResponse.json(
        { error: "child-media access requires the child_media_reviewer role" },
        { status: 403 },
      );
    }

    if (asset.status !== AssetStatus.ready) {
      return NextResponse.json(
        { error: `signed URLs require a ready asset, got ${asset.status}` },
        { status: 409 },
      );
    }

    const version = parsed.data.versionId
      ? asset.versions.find((v) => v.id === parsed.data.versionId)
      : asset.versions.find((v) => v.role === VersionRole.original);
    if (!version) return NextResponse.json({ error: "version not found" }, { status: 404 });
    if (isQuarantineKey(version.storageKey)) {
      return NextResponse.json({ error: "version is not servable" }, { status: 409 });
    }

    // Mandatory audit for child media — must commit before the URL exists.
    if (asset.featuresMinor) {
      await writeAuditStrict(prisma, {
        type: "asset.child_media.url_issued",
        tenantId: tenant.id,
        userId: user.id,
        detail: { assetId: asset.id, versionId: version.id, expiresIn: parsed.data.expiresIn },
      });
    }

    const url = await storage.getSignedUrl(version.storageKey, parsed.data.expiresIn);
    return NextResponse.json({
      url,
      versionId: version.id,
      expiresInSeconds: parsed.data.expiresIn,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
