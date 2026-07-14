import type { NextRequest } from "next/server";
import type { Tenant } from "@aivs/database";
import { getServices } from "./services";

/**
 * Tenant context until the auth module lands: explicit `x-aivs-tenant`
 * header (tenant id or slug), defaulting to the seeded dev tenant for
 * local development. Every handler scopes all queries by the resolved
 * tenant id (security baseline §8).
 */
const DEV_TENANT_SLUG = "riwaq-dev";

export class TenantNotFoundError extends Error {
  constructor(ref: string) {
    super(`Unknown tenant: ${ref}`);
    this.name = "TenantNotFoundError";
  }
}

export async function resolveTenant(request: NextRequest): Promise<Tenant> {
  const { prisma } = getServices();
  const ref = request.headers.get("x-aivs-tenant") ?? DEV_TENANT_SLUG;
  const tenant = await prisma.tenant.findFirst({
    where: { OR: [{ id: ref }, { slug: ref }] },
  });
  if (!tenant) throw new TenantNotFoundError(ref);
  return tenant;
}
