/**
 * GET /api/tenants — the caller's memberships (for the tenant switcher).
 * POST /api/tenants — create a workspace; caller becomes owner.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createTenant, getAuth, requireSession } from "@aivs/auth";
import { z } from "zod";
import { authErrorResponse } from "@/lib/auth-context";
import { getServices } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z.string().min(2).max(63),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const session = await requireSession(getAuth(), request.headers);
    const memberships = await prisma.membership.findMany({
      where: { userId: session.user.id },
      include: { tenant: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json({
      tenants: memberships.map((m) => ({
        id: m.tenant.id,
        slug: m.tenant.slug,
        name: m.tenant.name,
        role: m.role,
      })),
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const session = await requireSession(getAuth(), request.headers);
    const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
    }
    const tenant = await createTenant(prisma, {
      userId: session.user.id,
      name: parsed.data.name,
      slug: parsed.data.slug,
    });
    return NextResponse.json({ tenant }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
