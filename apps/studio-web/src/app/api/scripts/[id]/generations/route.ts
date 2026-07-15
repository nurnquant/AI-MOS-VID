/**
 * POST /api/scripts/{id}/generations (editor+) — start generation from an
 * approved script. GET (viewer+) — generations with scene progress.
 */
import { NextResponse, type NextRequest } from "next/server";
import { GenerationError, listGenerations, startGeneration } from "@aivs/generation";
import { z } from "zod";
import { MembershipRole, authErrorResponse, requireContext } from "@/lib/auth-context";
import { getServices } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ targetPreset: z.string().min(1) });

function generationErrorResponse(error: unknown): NextResponse {
  if (error instanceof GenerationError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return authErrorResponse(error);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const services = getServices();
  try {
    const { user, tenant } = await requireContext(request, MembershipRole.editor);
    const { id } = await params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
    }
    const generation = await startGeneration(
      services,
      { tenantId: tenant.id, userId: user.id },
      { scriptId: id, targetPreset: parsed.data.targetPreset },
    );
    return NextResponse.json(
      { generationId: generation.id, scenes: generation.sceneGenerations.length },
      { status: 202 },
    );
  } catch (error) {
    return generationErrorResponse(error);
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const services = getServices();
  try {
    const { tenant } = await requireContext(request);
    const { id } = await params;
    const generations = await listGenerations(services, tenant.id, id);
    return NextResponse.json({
      generations: generations.map((generation) => ({
        id: generation.id,
        targetPreset: generation.targetPreset,
        status: generation.status,
        error: generation.error,
        finalAssetId: generation.finalAssetId,
        createdAt: generation.createdAt.toISOString(),
        scenes: generation.sceneGenerations.map((sceneGen) => ({
          position: sceneGen.position,
          status: sceneGen.status,
          assetId: sceneGen.assetId,
          error: sceneGen.error,
        })),
      })),
    });
  } catch (error) {
    return generationErrorResponse(error);
  }
}
