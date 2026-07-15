/**
 * POST /api/scripts/{id}/actions — generate (editor+, draft),
 * submit (editor+), approve/reject (admin+). One action route keeps the
 * status machine in a single place.
 */
import { NextResponse, type NextRequest } from "next/server";
import { getScript, regenerateScenes, transitionScript } from "@aivs/content";
import { z } from "zod";
import { MembershipRole, requireContext } from "@/lib/auth-context";
import { contentErrorResponse, scriptProvider } from "@/lib/content-context";
import { serializeScriptDetail } from "@/lib/script-serialize";
import { getServices } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z.enum(["generate", "submit", "approve", "reject"]),
  reason: z.string().max(500).optional(),
});

const MIN_ROLE: Record<z.infer<typeof bodySchema>["action"], MembershipRole> = {
  generate: MembershipRole.editor,
  submit: MembershipRole.editor,
  approve: MembershipRole.admin,
  reject: MembershipRole.admin,
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
    }
    const { action, reason } = parsed.data;
    const { user, tenant, role } = await requireContext(request, MIN_ROLE[action]);
    const { id } = await params;
    const ctx = { tenantId: tenant.id, userId: user.id };

    if (action === "generate") {
      await regenerateScenes(prisma, ctx, id, scriptProvider);
    } else {
      await transitionScript(prisma, ctx, id, action, reason);
    }
    const script = await getScript(prisma, tenant.id, id);
    return NextResponse.json({ script: serializeScriptDetail(script, role) });
  } catch (error) {
    return contentErrorResponse(error);
  }
}
