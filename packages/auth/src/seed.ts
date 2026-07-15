/**
 * Dev seed: owner user for the seeded dev tenant. Idempotent. Local
 * credentials only — printed on creation.
 */
import { MembershipRole, createPrismaClient } from "@aivs/database";
import { createAuth } from "./server.ts";

export const DEV_TENANT_ID = "00000000-0000-4000-8000-000000000001";
export const DEV_OWNER_EMAIL = "owner@riwaq.dev";
export const DEV_OWNER_PASSWORD = "riwaq-dev-owner-1";

export async function seedAuth(databaseUrl?: string): Promise<void> {
  const prisma = createPrismaClient(databaseUrl);
  const auth = createAuth({ prisma });
  try {
    let user = await prisma.user.findUnique({ where: { email: DEV_OWNER_EMAIL } });
    if (!user) {
      await auth.api.signUpEmail({
        body: { name: "Dev Owner", email: DEV_OWNER_EMAIL, password: DEV_OWNER_PASSWORD },
      });
      user = await prisma.user.findUniqueOrThrow({ where: { email: DEV_OWNER_EMAIL } });
      console.log(`Created dev owner ${DEV_OWNER_EMAIL} (password: ${DEV_OWNER_PASSWORD})`);
    }
    await prisma.membership.upsert({
      where: { userId_tenantId: { userId: user.id, tenantId: DEV_TENANT_ID } },
      update: { role: MembershipRole.owner },
      create: { userId: user.id, tenantId: DEV_TENANT_ID, role: MembershipRole.owner },
    });
    console.log(`Dev owner is ${MembershipRole.owner} of tenant ${DEV_TENANT_ID}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  await seedAuth();
}
