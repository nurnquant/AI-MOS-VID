/**
 * Better Auth server instance (ADR-AIVS-003 §1): email+password, database
 * sessions via the Prisma adapter, rate-limited sign-in/up, login audit
 * hooks. One instance per process.
 */
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { getPrisma, type PrismaClient } from "@aivs/database";
import { writeAudit } from "./audit.ts";

export interface CreateAuthOptions {
  prisma?: PrismaClient;
  baseURL?: string;
  secret?: string;
}

export function createAuth(options: CreateAuthOptions = {}) {
  const prisma = options.prisma ?? getPrisma();
  return betterAuth({
    baseURL: options.baseURL ?? process.env.APP_URL ?? "http://localhost:3000",
    secret: options.secret ?? process.env.BETTER_AUTH_SECRET,
    database: prismaAdapter(prisma, { provider: "postgresql" }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      minPasswordLength: 10,
    },
    session: {
      expiresIn: 7 * 24 * 60 * 60,
      updateAge: 24 * 60 * 60,
    },
    rateLimit: {
      enabled: true,
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 5 },
      },
    },
    advanced: {
      database: { generateId: () => crypto.randomUUID() },
    },
    databaseHooks: {
      session: {
        create: {
          after: async (session) => {
            await writeAudit(prisma, {
              userId: session.userId,
              type: "auth.login.success",
              detail: { ipAddress: session.ipAddress ?? null },
            });
          },
        },
      },
      user: {
        create: {
          after: async (user) => {
            await writeAudit(prisma, {
              userId: user.id,
              type: "auth.register",
              detail: { email: user.email },
            });
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

/** Process-wide singleton (survives Next dev hot reloads). */
const globalStore = globalThis as unknown as { aivsAuth?: Auth };

export function getAuth(): Auth {
  globalStore.aivsAuth ??= createAuth();
  return globalStore.aivsAuth;
}
