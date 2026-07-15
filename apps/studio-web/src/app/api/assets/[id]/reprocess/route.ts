/**
 * POST /api/assets/{id}/reprocess (editor+) — rejected: revalidate (if
 * quarantine object retained); ready: regenerate thumbnail, or normalize
 * to a preset when body.preset is given.
 */
import { NextResponse, type NextRequest } from "next/server";
import { enqueueWithRecord, reprocessAsset } from "@aivs/assets";
import { AssetStatus } from "@aivs/database";
import { JOB_NAMES } from "@aivs/queue";
import { z } from "zod";
import { MembershipRole, authErrorResponse, requireContext } from "@/lib/auth-context";
import { getServices } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ preset: z.string().min(1).optional() }).default({});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const services = getServices();
  try {
    const { tenant } = await requireContext(request, MembershipRole.editor);
    const { id } = await params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
    }

    if (parsed.data.preset) {
      const asset = await services.prisma.asset.findFirst({
        where: { id, tenantId: tenant.id },
        select: { status: true },
      });
      if (!asset) return NextResponse.json({ error: "asset not found" }, { status: 404 });
      if (asset.status !== AssetStatus.ready) {
        return NextResponse.json(
          { error: `normalization requires a ready asset, got ${asset.status}` },
          { status: 409 },
        );
      }
      const { bullJobId } = await enqueueWithRecord({
        prisma: services.prisma,
        queue: services.mediaQueue,
        jobName: JOB_NAMES.normalizeVideo,
        payload: { assetId: id, tenantId: tenant.id, preset: parsed.data.preset },
        tenantId: tenant.id,
        assetId: id,
      });
      return NextResponse.json({ enqueued: bullJobId }, { status: 202 });
    }

    const result = await reprocessAsset(services, id, tenant.id);
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    try {
      return authErrorResponse(error);
    } catch {
      const message = error instanceof Error ? error.message : "reprocess failed";
      const status = /not found|NotFound/i.test(message)
        ? 404
        : /cannot be reprocessed|re-upload required/.test(message)
          ? 409
          : 500;
      return NextResponse.json({ error: message }, { status });
    }
  }
}
