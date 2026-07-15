/**
 * POST /api/consents/{id}/revoke — irreversible: enqueues hard deletion of
 * all linked child-media assets (ADR-AIVS-004 §3). Reason required.
 */
import { NextResponse, type NextRequest } from "next/server";
import { ConsentError, revokeConsent } from "@aivs/assets";
import { z } from "zod";
import { MembershipRole, authErrorResponse, requireContext } from "@/lib/auth-context";
import { getServices } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ reason: z.string().min(3).max(500) });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const services = getServices();
  try {
    const { user, tenant } = await requireContext(request, MembershipRole.child_media_reviewer);
    const { id } = await params;
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
    }
    await revokeConsent(services, {
      consentId: id,
      tenantId: tenant.id,
      userId: user.id,
      reason: parsed.data.reason,
    });
    return NextResponse.json({ revoked: id, enforcement: "enqueued" }, { status: 202 });
  } catch (error) {
    if (error instanceof ConsentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return authErrorResponse(error);
  }
}
