/** GET /api/assets — tenant-scoped asset list, optional project filter. */
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { serializeAsset, serializeVersion } from "@/lib/serialize";
import { getServices } from "@/lib/services";
import { TenantNotFoundError, resolveTenant } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  projectId: z.uuid().optional(),
  cursor: z.uuid().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const tenant = await resolveTenant(request);
    const parsed = querySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
    }
    const { projectId, cursor, limit } = parsed.data;

    const assets = await prisma.asset.findMany({
      where: { tenantId: tenant.id, ...(projectId ? { projectId } : {}) },
      include: { versions: true },
      orderBy: { createdAt: "desc" },
      take: limit,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    });

    return NextResponse.json({
      assets: assets.map((asset) => ({
        ...serializeAsset(asset),
        versions: asset.versions.map(serializeVersion),
      })),
      nextCursor: assets.length === limit ? assets.at(-1)?.id : undefined,
    });
  } catch (error) {
    if (error instanceof TenantNotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
