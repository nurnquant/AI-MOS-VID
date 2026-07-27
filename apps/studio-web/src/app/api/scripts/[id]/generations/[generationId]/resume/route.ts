/**
 * POST /api/scripts/{id}/generations/{generationId}/resume (editor+) —
 * partial resume: re-renders only unfinished scenes (AIVS-RESUME-014).
 */
import { NextResponse, type NextRequest } from "next/server";
import { GenerationError, resumeGeneration } from "@aivs/generation";
import { MembershipRole, authErrorResponse, requireContext } from "@/lib/auth-context";
import { getServices } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; generationId: string }> },
): Promise<NextResponse> {
  const services = getServices();
  try {
    const { user, tenant } = await requireContext(request, MembershipRole.editor);
    const { generationId } = await params;
    const result = await resumeGeneration(
      services,
      { tenantId: tenant.id, userId: user.id },
      generationId,
    );
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    if (error instanceof GenerationError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return authErrorResponse(error);
  }
}
