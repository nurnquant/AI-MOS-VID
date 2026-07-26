/**
 * PROV-009 Phase 0 integration: spend ledger + budget caps against the
 * live local database. A fake "adapter" drives the budget services the
 * way real adapters will in phases A-D — no network anywhere.
 */
import { randomUUID } from "node:crypto";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createPrismaClient, type PrismaClient } from "@aivs/database";
import { ProviderBudgetError, assertProviderBudget, recordProviderUsage } from "@aivs/providers";

const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://aivs:aivs_local@localhost:5433/aivs";

let prisma: PrismaClient;
let tenantId: string;

beforeAll(async () => {
  prisma = createPrismaClient(DATABASE_URL);
  const tenant = await prisma.tenant.create({
    data: { slug: `prov-${randomUUID().slice(0, 8)}`, name: "Provider Budget Tenant" },
  });
  tenantId = tenant.id;
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await prisma.providerUsage.deleteMany({ where: { tenantId } });
  await prisma.auditEvent.deleteMany({ where: { tenantId } });
});

afterAll(async () => {
  await prisma.providerUsage.deleteMany({ where: { tenantId } });
  await prisma.auditEvent.deleteMany({ where: { tenantId } });
  await prisma.tenant.delete({ where: { id: tenantId } });
  await prisma.$disconnect();
});

describe("recordProviderUsage", () => {
  it("writes a ledger row and a provider.call audit", async () => {
    await recordProviderUsage(prisma, {
      tenantId,
      provider: "fake",
      operation: "script.generate",
      units: 1200,
      unitType: "tokens",
      estimatedCostUsd: 0.0421,
      jobId: "job-1",
    });

    const rows = await prisma.providerUsage.findMany({ where: { tenantId } });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.provider).toBe("fake");
    expect(Number(rows[0]!.estimatedCostUsd)).toBeCloseTo(0.0421);

    const audits = await prisma.auditEvent.findMany({
      where: { tenantId, type: "provider.call" },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]!.detail).toMatchObject({ provider: "fake", operation: "script.generate" });
  });
});

describe("assertProviderBudget (fail closed)", () => {
  it("blocks any spend when no budget is configured", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "");
    await expect(assertProviderBudget(prisma, tenantId, 0.01)).rejects.toBeInstanceOf(
      ProviderBudgetError,
    );
    const audits = await prisma.auditEvent.findMany({
      where: { tenantId, type: "provider.budget_exceeded" },
    });
    expect(audits.length).toBeGreaterThan(0);
  });

  it("allows spend under both caps", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "5");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "50");
    await expect(assertProviderBudget(prisma, tenantId, 1)).resolves.toBeUndefined();
  });

  it("blocks when recorded usage plus the attempt crosses the daily cap", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "1");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "100");
    await recordProviderUsage(prisma, {
      tenantId,
      provider: "fake",
      operation: "video.submit",
      units: 8,
      unitType: "seconds",
      estimatedCostUsd: 0.9,
    });

    await expect(assertProviderBudget(prisma, tenantId, 0.05)).resolves.toBeUndefined();
    await expect(assertProviderBudget(prisma, tenantId, 0.2)).rejects.toThrow(
      /daily provider budget exceeded/,
    );

    const audits = await prisma.auditEvent.findMany({
      where: { tenantId, type: "provider.budget_exceeded" },
    });
    expect(audits).toHaveLength(1);
    expect(audits[0]!.detail).toMatchObject({ window: "daily", capUsd: 1 });
  });

  it("blocks on the monthly cap independently of the daily cap", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "100");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "2");
    await recordProviderUsage(prisma, {
      tenantId,
      provider: "fake",
      operation: "voice.synthesize",
      units: 60,
      unitType: "seconds",
      estimatedCostUsd: 1.95,
    });

    await expect(assertProviderBudget(prisma, tenantId, 0.1)).rejects.toThrow(
      /monthly provider budget exceeded/,
    );
  });

  it("budget is tenant-scoped: another tenant's spend does not count", async () => {
    vi.stubEnv("PROVIDER_DAILY_BUDGET_USD", "1");
    vi.stubEnv("PROVIDER_MONTHLY_BUDGET_USD", "10");
    const other = await prisma.tenant.create({
      data: { slug: `prov-o-${randomUUID().slice(0, 8)}`, name: "Other Tenant" },
    });
    try {
      await recordProviderUsage(prisma, {
        tenantId: other.id,
        provider: "fake",
        operation: "script.generate",
        units: 1,
        unitType: "calls",
        estimatedCostUsd: 0.99,
      });
      await expect(assertProviderBudget(prisma, tenantId, 0.5)).resolves.toBeUndefined();
    } finally {
      await prisma.providerUsage.deleteMany({ where: { tenantId: other.id } });
      await prisma.auditEvent.deleteMany({ where: { tenantId: other.id } });
      await prisma.tenant.delete({ where: { id: other.id } });
    }
  });
});
