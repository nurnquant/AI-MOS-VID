/**
 * GET /api/scripts/{id} — detail with masked child-media references.
 * PATCH — metadata edits (editor+, draft only).
 */
import { NextResponse, type NextRequest } from "next/server";
import { getScript, updateScriptMeta } from "@aivs/content";
import { ScriptLanguage } from "@aivs/database";
import { z } from "zod";
import { MembershipRole, requireContext } from "@/lib/auth-context";
import { contentErrorResponse } from "@/lib/content-context";
import { serializeScriptDetail } from "@/lib/script-serialize";
import { getServices } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  brief: z.string().min(3).max(4000).optional(),
  language: z.enum(ScriptLanguage).optional(),
  targetPresets: z.array(z.string().min(1)).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const { tenant, role } = await requireContext(request);
    const { id } = await params;
    const script = await getScript(prisma, tenant.id, id);
    return NextResponse.json({ script: serializeScriptDetail(script, role) });
  } catch (error) {
    return contentErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const { user, tenant, role } = await requireContext(request, MembershipRole.editor);
    const { id } = await params;
    const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
    }
    await updateScriptMeta(prisma, { tenantId: tenant.id, userId: user.id }, id, parsed.data);
    const script = await getScript(prisma, tenant.id, id);
    return NextResponse.json({ script: serializeScriptDetail(script, role) });
  } catch (error) {
    return contentErrorResponse(error);
  }
}
