/**
 * Request guards (ADR-AIVS-003 §3): session → active-tenant membership →
 * role check. Framework-agnostic — takes Fetch API Headers, so route
 * handlers and tests share the same path.
 */
import { MembershipRole, type PrismaClient, type Tenant, type User } from "@aivs/database";
import { roleAtLeast } from "./roles.ts";
import type { Auth } from "./server.ts";

export const ACTIVE_TENANT_COOKIE = "aivs_active_tenant";

export class AuthzError extends Error {
  readonly status: number;

  constructor(message: string, status: 401 | 403) {
    super(message);
    this.name = "AuthzError";
    this.status = status;
  }
}

export interface RequestContext {
  user: Pick<User, "id" | "name" | "email">;
  tenant: Tenant;
  role: MembershipRole;
}

export async function requireSession(auth: Auth, headers: Headers) {
  const session = await auth.api.getSession({ headers });
  if (!session) throw new AuthzError("authentication required", 401);
  return session;
}

function activeTenantFromCookie(headers: Headers): string | null {
  const cookie = headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`(?:^|;\\s*)${ACTIVE_TENANT_COOKIE}=([^;]+)`));
  return match?.[1] ? decodeURIComponent(match[1]) : null;
}

/**
 * Resolves the caller's active tenant (cookie selection, validated against
 * their own memberships; falls back to the oldest membership) and enforces
 * the minimum role.
 */
export async function requireMembership(
  prisma: PrismaClient,
  auth: Auth,
  headers: Headers,
  minRole: MembershipRole = MembershipRole.viewer,
): Promise<RequestContext> {
  const session = await requireSession(auth, headers);

  const memberships = await prisma.membership.findMany({
    where: { userId: session.user.id },
    include: { tenant: true },
    orderBy: { createdAt: "asc" },
  });
  if (memberships.length === 0) {
    throw new AuthzError("no tenant membership — create or join a workspace", 403);
  }

  const requested = activeTenantFromCookie(headers);
  const membership = requested ? memberships.find((m) => m.tenantId === requested) : memberships[0];
  if (!membership) {
    throw new AuthzError("not a member of the selected workspace", 403);
  }
  if (!roleAtLeast(membership.role, minRole)) {
    throw new AuthzError(`requires ${minRole} role or higher`, 403);
  }

  return {
    user: { id: session.user.id, name: session.user.name, email: session.user.email },
    tenant: membership.tenant,
    role: membership.role,
  };
}
