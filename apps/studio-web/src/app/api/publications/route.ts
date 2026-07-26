/**
 * GET /api/publications (viewer+; child-media rows hidden below reviewer).
 * POST /api/publications (editor+) — create for a ready video asset.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createPublication, listPublications } from "@aivs/publishing";
import { PublishPlatform } from "@aivs/database";
import { z } from "zod";
import { MembershipRole, requireContext } from "@/lib/auth-context";
import { publishingErrorResponse } from "@/lib/publishing-context";
import { getServices } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  assetId: z.uuid(),
  platform: z.enum(PublishPlatform),
  caption: z.string().min(1).max(2000),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const { tenant, role } = await requireContext(request);
    const publications = await listPublications(prisma, tenant.id, role);
    return NextResponse.json({
      publications: publications.map((p) => ({
        id: p.id,
        platform: p.platform,
        caption: p.caption,
        status: p.status,
        externalId: p.externalId,
        error: p.error,
        assetName: p.asset?.displayName ?? "(deleted)",
        featuresMinor: p.asset?.featuresMinor ?? false,
        approvals: p.approvals.map((a) => ({ kind: a.kind, approvedBy: a.approvedBy })),
        createdAt: p.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return publishingErrorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const { user, tenant, role } = await requireContext(request, MembershipRole.editor);
    const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
    }
    const publication = await createPublication(
      prisma,
      { tenantId: tenant.id, userId: user.id, role },
      parsed.data,
    );
    return NextResponse.json({ publicationId: publication.id }, { status: 201 });
  } catch (error) {
    return publishingErrorResponse(error);
  }
}
