/** POLISH-013: usage summary aggregates against seeded ledger rows. */
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { recordProviderUsage, summarizeProviderUsage } from "@aivs/providers";
import { createPrismaClient, type PrismaClient } from "@aivs/database";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://aivs:aivs_local@localhost:5433/aivs";

let prisma: PrismaClient;
let tenantId: string;

beforeAll(async () => {
  prisma = createPrismaClient(DATABASE_URL);
  const tenant = await prisma.tenant.create({
    data: { slug: `usage-${randomUUID().slice(0, 8)}`, name: "Usage Tenant" },
  });
  tenantId = tenant.id;
});

afterEach(() => vi.unstubAllEnvs());

afterAll(async () => {
  await prisma.providerUsage.deleteMany({ where: { tenantId } });
  await prisma.auditEvent.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.$disconnect();
});

describe("summarizeProviderUsage", () => {
  it("aggregates day/month per provider, caps, and recent calls", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "5");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "50");

    await recordProviderUsage(prisma, {
      tenantId,
      provider: "anthropic",
      operation: "script.generate",
      units: 1000,
      unitType: "tokens",
      estimatedCostUsd: 0.5,
    });
    await recordProviderUsage(prisma, {
      tenantId,
      provider: "fal",
      operation: "video.submit",
      units: 5,
      unitType: "seconds",
      estimatedCostUsd: 1.25,
      jobId: "job-x",
    });
    // A row earlier this month but before today (yesterday, if the
    // month allows; otherwise it lands today and totals still hold).
    const yesterday = new Date(Date.now() - 86_400_000);
    const sameMonth = yesterday.getUTCMonth() === new Date().getUTCMonth();
    await prisma.providerUsage.create({
      data: {
        tenantId,
        provider: "fal",
        operation: "video.submit",
        units: 5,
        unitType: "seconds",
        estimatedCostUsd: 2,
        createdAt: sameMonth ? yesterday : new Date(),
      },
    });

    const usage = await summarizeProviderUsage(prisma, tenantId);

    expect(usage.caps).toEqual({ dailyUsd: 5, monthlyUsd: 50 });
    expect(usage.totals.monthUsd).toBeCloseTo(3.75);
    if (sameMonth) expect(usage.totals.dayUsd).toBeCloseTo(1.75);

    const fal = usage.providers.find((p) => p.provider === "fal")!;
    expect(fal.monthUsd).toBeCloseTo(3.25);
    expect(fal.calls).toBe(2);
    const anthropic = usage.providers.find((p) => p.provider === "anthropic")!;
    expect(anthropic.monthUsd).toBeCloseTo(0.5);

    expect(usage.recent.length).toBeGreaterThanOrEqual(3);
    expect(usage.recent[0]!.provider).toBeTruthy();
    expect(usage.blockedToday).toBe(0);
  });

  it("counts today's budget blocks", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "");
    const { assertProviderBudget, ProviderBudgetError } = await import("@aivs/providers");
    await expect(assertProviderBudget(prisma, tenantId, 1)).rejects.toBeInstanceOf(
      ProviderBudgetError,
    );
    const usage = await summarizeProviderUsage(prisma, tenantId);
    expect(usage.blockedToday).toBeGreaterThanOrEqual(1);
  });
});
