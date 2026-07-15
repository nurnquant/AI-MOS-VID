/**
 * GET /api/assets/{id}/signed-url[?versionId=] — thin wrapper over
 * issueAssetSignedUrl (@aivs/assets), which enforces ready-only, no
 * quarantine keys, and the audited child-media gate.
 */
import { NextResponse, type NextRequest } from "next/server";
import { SignedUrlError, issueAssetSignedUrl } from "@aivs/assets";
import { SIGNED_URL_DEFAULT_TTL_SECONDS } from "@aivs/storage";
import { z } from "zod";
import { authErrorResponse, requireContext } from "@/lib/auth-context";
import { getServices } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const querySchema = z.object({
  versionId: z.uuid().optional(),
  expiresIn: z.coerce.number().int().min(60).max(86_400).default(SIGNED_URL_DEFAULT_TTL_SECONDS),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const services = getServices();
  try {
    const { user, tenant, role } = await requireContext(request);
    const { id } = await params;
    const parsed = querySchema.safeParse(
      Object.fromEntries(request.nextUrl.searchParams.entries()),
    );
    if (!parsed.success) {
      return NextResponse.json({ error: z.prettifyError(parsed.error) }, { status: 400 });
    }
    const result = await issueAssetSignedUrl(services, {
      assetId: id,
      tenantId: tenant.id,
      userId: user.id,
      role,
      versionId: parsed.data.versionId,
      expiresInSeconds: parsed.data.expiresIn,
    });
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SignedUrlError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return authErrorResponse(error);
  }
}
