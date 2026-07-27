/**
 * /api/projects/{id} — rename (admin+), delete (admin+, empty only —
 * content-bearing projects can never be deleted).
 */
import { NextResponse, type NextRequest } from "next/server";
import { deleteProject, renameProject } from "@aivs/auth";
import { z } from "zod";
import { MembershipRole, authErrorResponse, requireContext } from "@/lib/auth-context";
import { getServices } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const renameSchema = z.object({ name: z.string().min(1).max(120) });

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const { user, tenant } = await requireContext(request, MembershipRole.admin);
    const { id } = await params;
    const parsed = renameSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
    }
    const project = await renameProject(
      prisma,
      { tenantId: tenant.id, userId: user.id },
      id,
      parsed.data.name,
    );
    return NextResponse.json({
      project: { id: project.id, slug: project.slug, name: project.name },
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const { user, tenant } = await requireContext(request, MembershipRole.admin);
    const { id } = await params;
    await deleteProject(prisma, { tenantId: tenant.id, userId: user.id }, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
