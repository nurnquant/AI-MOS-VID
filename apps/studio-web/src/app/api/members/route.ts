/**
 * GET /api/members — members of the active workspace (viewer+).
 * POST /api/members — invite by email with a role (admin+).
 */
import { NextResponse, type NextRequest } from "next/server";
import { ConsoleEmailSender, inviteMember, listMembers } from "@aivs/auth";
import { MembershipRole } from "@aivs/database";
import { z } from "zod";
import { authErrorResponse, requireContext } from "@/lib/auth-context";
import { getServices } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const emailSender = new ConsoleEmailSender();

const inviteSchema = z.object({
  email: z.email(),
  role: z.enum(MembershipRole),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const { tenant } = await requireContext(request);
    const members = await listMembers(prisma, tenant.id);
    return NextResponse.json({
      members: members.map((m) => ({
        userId: m.userId,
        name: m.user.name,
        email: m.user.email,
        role: m.role,
        joinedAt: m.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const { user, tenant, role } = await requireContext(request, MembershipRole.admin);
    const parsed = inviteSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
    }
    const invitation = await inviteMember(prisma, emailSender, {
      tenantId: tenant.id,
      inviterUserId: user.id,
      inviterRole: role,
      inviteeEmail: parsed.data.email,
      role: parsed.data.role,
      baseUrl: process.env.APP_URL ?? request.nextUrl.origin,
    });
    return NextResponse.json(
      { invitationId: invitation.id, email: invitation.email, role: invitation.role },
      { status: 201 },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
