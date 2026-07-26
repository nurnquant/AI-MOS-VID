/** GET /api/projects — the active workspace's projects (viewer+). */
import { NextResponse, type NextRequest } from "next/server";
import { authErrorResponse, requireContext } from "@/lib/auth-context";
import { getServices } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const { tenant } = await requireContext(request);
    const projects = await prisma.project.findMany({
      where: { tenantId: tenant.id },
      orderBy: { createdAt: "asc" },
      select: { id: true, slug: true, name: true },
    });
    return NextResponse.json({ projects });
  } catch (error) {
    return authErrorResponse(error);
  }
}
