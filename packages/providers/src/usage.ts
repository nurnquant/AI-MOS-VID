/**
 * Provider usage summaries for the /usage dashboard (AIVS-POLISH-013).
 * Windows match the budget checks exactly: UTC day + UTC calendar
 * month. All figures are adapter ESTIMATES — reconcile with provider
 * dashboards for billing truth.
 */
import type { PrismaClient } from "@aivs/database";
import { budgetFromEnv } from "./budget.ts";

export interface ProviderSpend {
  provider: string;
  dayUsd: number;
  monthUsd: number;
  calls: number;
}

export interface UsageSummary {
  windows: { dayStart: string; monthStart: string };
  caps: { dailyUsd: number; monthlyUsd: number };
  totals: { dayUsd: number; monthUsd: number };
  providers: ProviderSpend[];
  blockedToday: number;
  recent: {
    provider: string;
    operation: string;
    units: number;
    unitType: string;
    estimatedCostUsd: number;
    jobId: string | null;
    createdAt: string;
  }[];
}

export async function summarizeProviderUsage(
  prisma: PrismaClient,
  tenantId: string,
): Promise<UsageSummary> {
  const now = new Date();
  const dayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [monthRows, recentRows, blockedToday] = await Promise.all([
    prisma.providerUsage.findMany({
      where: { tenantId, createdAt: { gte: monthStart } },
      select: { provider: true, estimatedCostUsd: true, createdAt: true },
    }),
    prisma.providerUsage.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.auditEvent.count({
      where: { tenantId, type: "provider.budget_exceeded", createdAt: { gte: dayStart } },
    }),
  ]);

  const byProvider = new Map<string, ProviderSpend>();
  for (const row of monthRows) {
    const entry = byProvider.get(row.provider) ?? {
      provider: row.provider,
      dayUsd: 0,
      monthUsd: 0,
      calls: 0,
    };
    const cost = Number(row.estimatedCostUsd);
    entry.monthUsd += cost;
    entry.calls += 1;
    if (row.createdAt >= dayStart) entry.dayUsd += cost;
    byProvider.set(row.provider, entry);
  }
  const providers = [...byProvider.values()].sort((a, b) => b.monthUsd - a.monthUsd);

  return {
    windows: { dayStart: dayStart.toISOString(), monthStart: monthStart.toISOString() },
    caps: {
      dailyUsd: budgetFromEnv("PROVIDER_DAILY_BUDGET_USD"),
      monthlyUsd: budgetFromEnv("PROVIDER_MONTHLY_BUDGET_USD"),
    },
    totals: {
      dayUsd: providers.reduce((s, p) => s + p.dayUsd, 0),
      monthUsd: providers.reduce((s, p) => s + p.monthUsd, 0),
    },
    providers,
    blockedToday,
    recent: recentRows.map((r) => ({
      provider: r.provider,
      operation: r.operation,
      units: r.units,
      unitType: r.unitType,
      estimatedCostUsd: Number(r.estimatedCostUsd),
      jobId: r.jobId,
      createdAt: r.createdAt.toISOString(),
    })),
  };
}
