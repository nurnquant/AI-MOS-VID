/**
 * GET /api/scripts (viewer+) — list. POST /api/scripts (editor+) — create,
 * optionally generating scenes from the brief via the mock provider.
 */
import { NextResponse, type NextRequest } from "next/server";
import { createScript, listScripts } from "@aivs/content";
import { ScriptLanguage } from "@aivs/database";
import { z } from "zod";
import { MembershipRole, requireContext } from "@/lib/auth-context";
import { contentErrorResponse, scriptProvider } from "@/lib/content-context";
import { serializeScriptSummary } from "@/lib/script-serialize";
import { getServices } from "@/lib/services";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createSchema = z.object({
  projectId: z.uuid(),
  title: z.string().min(1).max(200),
  brief: z.string().min(3).max(4000),
  language: z.enum(ScriptLanguage).default(ScriptLanguage.en),
  targetPresets: z.array(z.string().min(1)).default([]),
  generate: z.boolean().default(false),
});

export async function GET(request: NextRequest): Promise<NextResponse> {
  const { prisma } = getServices();
  try {
    const { tenant } = await requireContext(request);
    const projectId = request.nextUrl.searchParams.get("projectId") ?? undefined;
    const scripts = await listScripts(prisma, tenant.id, projectId);
    return NextResponse.json({ scripts: scripts.map(serializeScriptSummary) });
  } catch (error) {
    return contentErrorResponse(error);
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
    const script = await createScript(
      prisma,
      { tenantId: tenant.id, userId: user.id },
      {
        projectId: parsed.data.projectId,
        title: parsed.data.title,
        brief: parsed.data.brief,
        language: parsed.data.language,
        targetPresets: parsed.data.targetPresets,
        provider: parsed.data.generate ? scriptProvider : undefined,
      },
    );
    return NextResponse.json(
      { scriptId: script.id, sceneCount: script.scenes.length },
      { status: 201 },
    );
  } catch (error) {
    return contentErrorResponse(error);
  }
}
