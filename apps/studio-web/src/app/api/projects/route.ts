/**
 * /api/projects — list (viewer+) with content counts; create (editor+).
 */
import { NextResponse, type NextRequest } from "next/server";
import { createProject, listProjects } from "@aivs/auth";
import { z } from "zod";
import { MembershipRole, authErrorResponse, requireContext } from "@/lib/auth-context";
import { getServices } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({ name: z.string().min(1).max(120) });

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const { tenant } = await requireContext(request);
    return NextResponse.json({ projects: await listProjects(prisma, tenant.id) });
  } catch (error) {
    return authErrorResponse(error);
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const { user, tenant } = await requireContext(request, MembershipRole.editor);
    const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
    if (!parsed.success) {
      return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
    }
    const project = await createProject(
      prisma,
      { tenantId: tenant.id, userId: user.id },
      parsed.data.name,
    );
    return NextResponse.json(
      { project: { id: project.id, slug: project.slug, name: project.name } },
      { status: 201 },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}
