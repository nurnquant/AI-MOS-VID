/**
 * PATCH /api/members/{userId} — change a member's role (admin+, capped
 * strictly below the actor's own level).
 * DELETE /api/members/{userId} — remove a member (admin+, never the owner).
 */
import { NextResponse, type NextRequest } from "next/server";
import { changeMemberRole, removeMember } from "@aivs/auth";
import { MembershipRole } from "@aivs/database";
import { z } from "zod";
import { authErrorResponse, requireContext } from "@/lib/auth-context";
import { getServices } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const patchSchema = z.object({ role: z.enum(MembershipRole) });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const { user, tenant, role } = await requireContext(request, MembershipRole.admin);
    const { userId } = await params;
    const parsed = patchSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
    }
    const updated = await changeMemberRole(prisma, {
      tenantId: tenant.id,
      actorUserId: user.id,
      actorRole: role,
      targetUserId: userId,
      newRole: parsed.data.role,
    });
    return NextResponse.json({ userId: updated.userId, role: updated.role });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> },
): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const { user, tenant, role } = await requireContext(request, MembershipRole.admin);
    const { userId } = await params;
    await removeMember(prisma, {
      tenantId: tenant.id,
      actorUserId: user.id,
      actorRole: role,
      targetUserId: userId,
    });
    return NextResponse.json({ removed: userId });
  } catch (error) {
    return authErrorResponse(error);
  }
}
