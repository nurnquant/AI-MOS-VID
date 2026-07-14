/**
 * AIVS database package — Prisma client factory and generated types.
 * Schema source of truth: prisma/schema.prisma (migrations only, never
 * manual edits).
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client.ts";

export * from "./generated/client.ts";
export * from "./generated/enums.ts";
export type * from "./generated/models.ts";

export function createPrismaClient(databaseUrl?: string): PrismaClient {
  const connectionString = databaseUrl ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set and no databaseUrl was provided");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

/** Singleton for app/worker use; survives Next.js dev hot reloads. */
const globalForPrisma = globalThis as unknown as { aivsPrisma?: PrismaClient };

export function getPrisma(): PrismaClient {
  globalForPrisma.aivsPrisma ??= createPrismaClient();
  return globalForPrisma.aivsPrisma;
}
