/** POST /api/invitations/accept — join a workspace via invitation token. */
import { NextResponse, type NextRequest } from "next/server";
import { acceptInvitation, getAuth, requireSession } from "@aivs/auth";
import { z } from "zod";
import { authErrorResponse } from "@/lib/auth-context";
import { getServices } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ token: z.string().min(16) });

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const session = await requireSession(getAuth(), request.headers);
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
    }
    const membership = await acceptInvitation(prisma, {
      token: parsed.data.token,
      userId: session.user.id,
      userEmail: session.user.email,
    });
    return NextResponse.json(
      { tenantId: membership.tenantId, role: membership.role },
      { status: 201 },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
