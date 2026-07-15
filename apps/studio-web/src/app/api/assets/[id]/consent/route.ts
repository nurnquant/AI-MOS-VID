/**
 * POST /api/assets/{id}/consent — attach a consent record; a
 * consent-missing rejection auto-revalidates (ADR-AIVS-004 §2).
 */
import { NextResponse, type NextRequest } from "next/server";
import { ConsentError, attachConsent } from "@aivs/assets";
import { z } from "zod";
import { MembershipRole, authErrorResponse, requireContext } from "@/lib/auth-context";
import { getServices } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ consentRecordId: z.uuid() });

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
    const result = await attachConsent(services, {
      assetId: id,
      consentId: parsed.data.consentRecordId,
      tenantId: tenant.id,
      userId: user.id,
    });
    return NextResponse.json(result, { status: 202 });
  } catch (error) {
    if (error instanceof ConsentError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return authErrorResponse(error);
  }
}
