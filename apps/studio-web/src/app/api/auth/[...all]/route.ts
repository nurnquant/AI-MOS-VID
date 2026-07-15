/**
 * Better Auth handler — sign-up/in/out, session, etc. (ADR-AIVS-003 §1).
 * Instantiated lazily so `next build` page-data collection doesn't need a
 * database connection.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handler(request: Request): Promise<Response> {
  const { getAuth } = await import("@aivs/auth");
  return getAuth().handler(request);
}

export { handler as GET, handler as POST };
