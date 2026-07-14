/**
 * Dev seed: one tenant + one project with fixed IDs so local tooling and
 * tests can reference them without lookups. Idempotent (upserts).
 */
import { createPrismaClient } from "./index.ts";

export const DEV_TENANT_ID = "00000000-0000-4000-8000-000000000001";
export const DEV_PROJECT_ID = "00000000-0000-4000-8000-000000000002";

export async function seed(databaseUrl?: string): Promise<void> {
  const prisma = createPrismaClient(databaseUrl);
  try {
    await prisma.tenant.upsert({
      where: { id: DEV_TENANT_ID },
      update: {},
      create: {
        id: DEV_TENANT_ID,
        slug: "riwaq-dev",
        name: "Riwaq Al Ilm (dev)",
      },
    });
    await prisma.project.upsert({
      where: { id: DEV_PROJECT_ID },
      update: {},
      create: {
        id: DEV_PROJECT_ID,
        tenantId: DEV_TENANT_ID,
        slug: "sandbox",
        name: "Sandbox Project",
      },
    });
    console.log(`Seeded dev tenant ${DEV_TENANT_ID} and project ${DEV_PROJECT_ID}`);
  } finally {
    await prisma.$disconnect();
  }
}

if (process.argv[1]?.endsWith("seed.ts")) {
  await seed();
}
