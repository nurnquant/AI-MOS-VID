/**
 * POST /api/publications/{id}/actions — submit (editor+), content_approve
 * (child_media_reviewer+), final_approve (admin+), reject (reviewer+).
 */
import { NextResponse, type NextRequest } from "next/server";
import {
  contentApprove,
  finalApprove,
  rejectPublication,
  submitPublication,
} from "@aivs/publishing";
import { z } from "zod";
import { MembershipRole, requireContext } from "@/lib/auth-context";
import { publishingErrorResponse } from "@/lib/publishing-context";
import { getServices } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({
  action: z.enum(["submit", "content_approve", "final_approve", "reject"]),
  notes: z.string().max(500).optional(),
  reason: z.string().max(500).optional(),
});

const MIN_ROLE: Record<z.infer<typeof bodySchema>["action"], MembershipRole> = {
  submit: MembershipRole.editor,
  content_approve: MembershipRole.child_media_reviewer,
  final_approve: MembershipRole.admin,
  reject: MembershipRole.child_media_reviewer,
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const services = getServices();
  try {
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
    }
    const { action, notes, reason } = parsed.data;
    const { user, tenant, role } = await requireContext(request, MIN_ROLE[action]);
    const { id } = await params;
    const ctx = { tenantId: tenant.id, userId: user.id, role };

    const result =
      action === "submit"
        ? await submitPublication(services.prisma, ctx, id)
        : action === "content_approve"
          ? await contentApprove(services, ctx, id, notes)
          : action === "final_approve"
            ? await finalApprove(services, ctx, id, notes)
            : await rejectPublication(services.prisma, ctx, id, reason ?? "rejected");

    return NextResponse.json({ id: result.id, status: result.status });
  } catch (error) {
    return publishingErrorResponse(error);
  }
}
