/**
 * Route-handler authorization glue (ADR-AIVS-003 §3): session → active
 * tenant membership → minimum role, with AuthzError/TenancyError mapped to
 * HTTP responses. Replaces the deleted x-aivs-tenant header path.
 */
import { NextResponse, type NextRequest } from "next/server";
import {
  AuthzError,
  TenancyError,
  getAuth,
  requireMembership,
  type RequestContext,
} from "@aivs/auth";
import { MembershipRole } from "@aivs/database";
import { getServices } from "./services";

export async function requireContext(
  request: NextRequest,
  minRole: MembershipRole = MembershipRole.viewer,
): Promise<RequestContext> {
  const { prisma } = getServices();
  return requireMembership(prisma, getAuth(), request.headers, minRole);
}

/** Uniform error mapping for auth/tenancy failures; rethrows the rest. */
export function authErrorResponse(error: unknown): NextResponse {
  if (error instanceof AuthzError || error instanceof TenancyError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  throw error;
}

export { MembershipRole };
