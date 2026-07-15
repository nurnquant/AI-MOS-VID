/**
 * PATCH /api/scripts/{id}/scenes/{sceneId} — edit narration/visual/
 * duration/position or set referenceAssetId (editor+, draft only).
 * DELETE — remove the scene (positions renormalize).
 */
import { NextResponse, type NextRequest } from "next/server";
import { deleteScene, setSceneReference, updateScene } from "@aivs/content";
import { z } from "zod";
import { MembershipRole, requireContext } from "@/lib/auth-context";
import { contentErrorResponse } from "@/lib/content-context";
import { getServices } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  narration: z.string().min(1).max(4000).optional(),
  visualDescription: z.string().min(1).max(4000).optional(),
  durationTargetSeconds: z.number().positive().max(3600).nullable().optional(),
  position: z.number().int().min(0).optional(),
  referenceAssetId: z.uuid().nullable().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sceneId: string }> },
): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const { user, tenant } = await requireContext(request, MembershipRole.editor);
    const { id, sceneId } = await params;
    const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
    }
    const ctx = { tenantId: tenant.id, userId: user.id };
    const { referenceAssetId, ...rest } = parsed.data;
    if (Object.keys(rest).length > 0) {
      await updateScene(prisma, ctx, id, sceneId, rest);
    }
    if (referenceAssetId !== undefined) {
      await setSceneReference(prisma, ctx, id, sceneId, referenceAssetId);
    }
    return NextResponse.json({ updated: sceneId });
  } catch (error) {
    return contentErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sceneId: string }> },
): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const { user, tenant } = await requireContext(request, MembershipRole.editor);
    const { id, sceneId } = await params;
    await deleteScene(prisma, { tenantId: tenant.id, userId: user.id }, id, sceneId);
    return NextResponse.json({ deleted: sceneId });
  } catch (error) {
    return contentErrorResponse(error);
  }
}
