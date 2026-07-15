/** POST /api/tenants/active — select the active workspace (cookie). */
import { NextResponse, type NextRequest } from "next/server";
import { ACTIVE_TENANT_COOKIE, getAuth, requireSession } from "@aivs/auth";
import { z } from "zod";
import { authErrorResponse } from "@/lib/auth-context";
import { getServices } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const bodySchema = z.object({ tenantId: z.uuid() });

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const session = await requireSession(getAuth(), request.headers);
    const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
    }
    const membership = await prisma.membership.findUnique({
      where: {
        userId_tenantId: { userId: session.user.id, tenantId: parsed.data.tenantId },
      },
    });
    if (!membership) {
      return NextResponse.json({ error: "not a member of that workspace" }, { status: 403 });
    }
    const response = NextResponse.json({ activeTenantId: parsed.data.tenantId });
    response.cookies.set(ACTIVE_TENANT_COOKIE, parsed.data.tenantId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
