/**
 * GET /api/consents/confirm?token=… — guardian email confirmation
 * (ADR-AIVS-011 §D). Public by design: guardians are not app users;
 * the unguessable single-use token is the credential. The response
 * reveals only the subject label, never other consent data.
 */
import { NextResponse, type NextRequest } from "next/server";
import { ConsentError, confirmGuardianConsent } from "@aivs/assets";
import { getServices } from "@/lib/services";

export const dynamic = "force-dynamic";

function page(title: string, body: string, status: number): NextResponse {
  return new NextResponse(
    `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head>` +
      `<body style="font-family: system-ui, sans-serif; max-width: 32rem; margin: 4rem auto; padding: 0 1rem;">` +
      `<h1>${title}</h1><p>${body}</p></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return page("Invalid link", "This confirmation link is missing its token.", 400);
  try {
    const record = await confirmGuardianConsent(getServices().prisma, token);
    return page(
      "Consent confirmed — thank you",
      `Your consent for "${record.subjectLabel}" has been confirmed. You can close this page.`,
      200,
    );
  } catch (error) {
    if (error instanceof ConsentError) {
      return page("Link invalid or already used", error.message, error.status);
    }
    throw error;
  }
}
