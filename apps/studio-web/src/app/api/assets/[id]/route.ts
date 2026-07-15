/** GET /api/assets/{id} — detail with versions and full audit trail. */
import { NextResponse, type NextRequest } from "next/server";
import { serializeAsset, serializeTransition, serializeVersion } from "@/lib/serialize";
import { canAccessChildMedia } from "@aivs/auth";
import { authErrorResponse, requireContext } from "@/lib/auth-context";
import { getServices } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const { tenant, role } = await requireContext(request);
    const { id } = await params;
    const asset = await prisma.asset.findFirst({
      where: {
        id,
        tenantId: tenant.id,
        ...(canAccessChildMedia(role) ? {} : { featuresMinor: false }),
      },
      include: {
        versions: { orderBy: { createdAt: "asc" } },
        transitions: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!asset) return NextResponse.json({ error: "asset not found" }, { status: 404 });

    return NextResponse.json({
      asset: {
        ...serializeAsset(asset),
        versions: asset.versions.map(serializeVersion),
        transitions: asset.transitions.map(serializeTransition),
      },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
