/**
 * GET/POST /api/consents — child-media consent registry
 * (child_media_reviewer+ only; ADR-AIVS-004 §4).
 */
import { NextResponse, type NextRequest } from "next/server";
import { ConsentError, createConsent, listConsents } from "@aivs/assets";
import { ConsentScope } from "@aivs/database";
import { z } from "zod";
import { MembershipRole, authErrorResponse, requireContext } from "@/lib/auth-context";
import { getServices } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  subjectLabel: z.string().min(1).max(120),
  guardianName: z.string().min(1).max(200),
  guardianContact: z.string().max(200).optional(),
  scope: z.enum(ConsentScope),
  platforms: z.array(z.string().min(1)).default([]),
  expiresAt: z.coerce.date(),
  documentRef: z.string().max(500).optional(),
});

function consentErrorResponse(error: unknown): NextResponse {
  if (error instanceof ConsentError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  return authErrorResponse(error);
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const { tenant } = await requireContext(request, MembershipRole.child_media_reviewer);
    return NextResponse.json({ consents: await listConsents(prisma, tenant.id) });
  } catch (error) {
    return consentErrorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const { user, tenant } = await requireContext(request, MembershipRole.child_media_reviewer);
    const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
    }
    const record = await createConsent(prisma, {
      tenantId: tenant.id,
      userId: user.id,
      ...parsed.data,
    });
    return NextResponse.json({ consentId: record.id }, { status: 201 });
  } catch (error) {
    return consentErrorResponse(error);
  }
}
