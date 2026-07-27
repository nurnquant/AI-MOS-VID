/**
 * Provider spend controls (ADR-AIVS-009 §2). Real adapters call
 * `assertProviderBudget` before every paid request and
 * `recordProviderUsage` after it. Mocks never touch this path.
 *
 * Unset or invalid budget env vars mean ZERO budget — a real provider
 * call with no configured budget fails closed. This is deliberate:
 * missing configuration must never produce spend.
 */
import { writeAudit } from "@aivs/auth";
import type { PrismaClient, ProviderUnitType } from "@aivs/database";

/** Upstream provider failure with an HTTP-ish status for API mapping. */
export class ProviderCallError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ProviderCallError";
    this.status = status;
  }
}

export class ProviderBudgetError extends Error {
  readonly status = 409;

  constructor(message: string) {
    super(message);
    this.name = "ProviderBudgetError";
  }
}

export interface ProviderUsageEntry {
  tenantId: string;
  provider: string;
  operation: string;
  units: number;
  unitType: ProviderUnitType;
  estimatedCostUsd: number;
  jobId?: string;
}

/** Missing/invalid/non-positive env value = 0 (no budget, fail closed). */
export function budgetFromEnv(name: string): number {
  const raw = process.env[name];
  if (!raw) return 0;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

async function spentSince(prisma: PrismaClient, tenantId: string, since: Date): Promise<number> {
  const sum = await prisma.providerUsage.aggregate({
    where: { tenantId, createdAt: { gte: since } },
    _sum: { estimatedCostUsd: true },
  });
  return Number(sum._sum.estimatedCostUsd ?? 0);
}

/**
 * Throws `ProviderBudgetError` (and audits `provider.budget_exceeded`)
 * when the projected spend crosses the daily or monthly cap
 * (`PROVIDER_DAILY_BUDGET_USD` / `PROVIDER_MONTHLY_BUDGET_USD`).
 */
export async function assertProviderBudget(
  prisma: PrismaClient,
  tenantId: string,
  estimatedCostUsd: number,
): Promise<void> {
  const dailyCap = budgetFromEnv("PROVIDER_DAILY_BUDGET_USD");
  const monthlyCap = budgetFromEnv("PROVIDER_MONTHLY_BUDGET_USD");
  const now = new Date();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const checks: Array<{ window: "daily" | "monthly"; cap: number; since: Date }> = [
    { window: "daily", cap: dailyCap, since: dayStart },
    { window: "monthly", cap: monthlyCap, since: monthStart },
  ];
  for (const check of checks) {
    const spent = check.cap > 0 ? await spentSince(prisma, tenantId, check.since) : 0;
    if (spent + estimatedCostUsd > check.cap) {
      await writeAudit(prisma, {
        type: "provider.budget_exceeded",
        tenantId,
        detail: {
          window: check.window,
          capUsd: check.cap,
          spentUsd: spent,
          attemptedUsd: estimatedCostUsd,
        },
      });
      throw new ProviderBudgetError(
        `${check.window} provider budget exceeded: cap $${check.cap.toFixed(2)}, ` +
          `spent $${spent.toFixed(2)}, attempted $${estimatedCostUsd.toFixed(4)}`,
      );
    }
  }
}

/** Ledger row + `provider.call` audit. Never logs payload contents. */
export async function recordProviderUsage(
  prisma: PrismaClient,
  entry: ProviderUsageEntry,
): Promise<void> {
  await prisma.providerUsage.create({
    data: {
      tenantId: entry.tenantId,
      provider: entry.provider,
      operation: entry.operation,
      units: entry.units,
      unitType: entry.unitType,
      estimatedCostUsd: entry.estimatedCostUsd,
      jobId: entry.jobId,
    },
  });
  await writeAudit(prisma, {
    type: "provider.call",
    tenantId: entry.tenantId,
    detail: {
      provider: entry.provider,
      operation: entry.operation,
      units: entry.units,
      unitType: entry.unitType,
      estimatedCostUsd: entry.estimatedCostUsd,
      jobId: entry.jobId,
    },
  });
}
