/** GET /api/usage — provider spend vs budget caps (admin+). */
import { NextResponse, type NextRequest } from "next/server";
import { summarizeProviderUsage } from "@aivs/providers";
import { MembershipRole, authErrorResponse, requireContext } from "@/lib/auth-context";
import { getServices } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const { tenant } = await requireContext(request, MembershipRole.admin);
    return NextResponse.json({ usage: await summarizeProviderUsage(prisma, tenant.id) });
  } catch (error) {
    return authErrorResponse(error);
  }
}
