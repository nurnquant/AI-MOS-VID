/** POST /api/scripts/{id}/scenes — add a scene (editor+, draft only). */
import { NextResponse, type NextRequest } from "next/server";
import { addScene } from "@aivs/content";
import { z } from "zod";
import { MembershipRole, requireContext } from "@/lib/auth-context";
import { contentErrorResponse } from "@/lib/content-context";
import { getServices } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  narration: z.string().min(1).max(4000),
  visualDescription: z.string().min(1).max(4000),
  durationTargetSeconds: z.number().positive().max(3600).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const { user, tenant } = await requireContext(request, MembershipRole.editor);
    const { id } = await params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
    }
    const scene = await addScene(prisma, { tenantId: tenant.id, userId: user.id }, id, parsed.data);
    return NextResponse.json({ sceneId: scene.id, position: scene.position }, { status: 201 });
  } catch (error) {
    return contentErrorResponse(error);
  }
}
