/** GET /api/assets/{id}/status — lifecycle status + latest job (polled by UI). */
import { NextResponse, type NextRequest } from "next/server";
import { serializeJob } from "@/lib/serialize";
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
      select: { id: true, status: true, rejectionReason: true },
    });
    if (!asset) return NextResponse.json({ error: "asset not found" }, { status: 404 });

    const latestJob = await prisma.job.findFirst({
      where: { assetId: id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      assetId: asset.id,
      status: asset.status,
      rejectionReason: asset.rejectionReason,
      latestJob: latestJob ? serializeJob(latestJob) : null,
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
