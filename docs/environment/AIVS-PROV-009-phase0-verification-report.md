# AIVS-PROV-009 Phase 0 Verification Report

**Result:** **PASS**
**Date:** 2026-07-26
**Branch:** `feature/aivs-prov-009-providers`
**ADR:** `docs/architecture/ADR-AIVS-009-provider-enablement.md`

## 1. Scope delivered

Foundation for the real-provider track: env-driven provider selection
(mock default everywhere), tenant-scoped spend ledger, fail-closed
budget caps, and the enablement/rollback runbook. **Zero real network
calls** — no provider was enabled; phases A-D each require their own
user approval plus a user-supplied key.

## 2. Definition of Done — evidence

| DoD item                                                     | Status | Evidence                                                                                                                      |
| ------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------- |
| All four slots env-selectable; unset/invalid falls to mock   | ✅     | 16 factory unit tests: unset, explicit `mock`, unknown value (warned), whitespace — all resolve to the mock per slot          |
| Budget cap blocks a real call and audits it                  | ✅     | Integration (fake adapter): zero-config block, daily-cap block, monthly-cap block — each throws `ProviderBudgetError` + audit |
| `ProviderUsage` rows written per call                        | ✅     | Integration: ledger row + `provider.call` audit asserted; tenant scoping proven (other tenant's spend not counted)            |
| Zero real network calls in any suite                         | ✅     | Only mocks registered; budget tests use a fake adapter against local Postgres                                                 |
| `pnpm verify` green; gitleaks clean; migrations reproducible | ✅     | verify exit 0; "no leaks found" (61 commits); reset → 7 migrations replay → seed                                              |
| Enablement runbook                                           | ✅     | `docs/operations/PROVIDER-ENABLEMENT.md` (enable, rollback, kill switch, observability, registry table)                       |

Test totals: **73 unit** (20 new: 16 factory + 4 budget-env cases in
providers), **50 integration** (6 new provider-budget), e2e unchanged.

## 3. What shipped

- **Schema:** `ProviderUsage` (tenant-scoped; provider, operation,
  units + `ProviderUnitType` enum, `estimatedCostUsd` Decimal(10,4),
  jobId; indexed `[tenantId, createdAt]`) — migration
  `20260726170738_prov_009_provider_usage`, applied to production Neon
  (7 total).
- **Factory** (`packages/providers/src/factory.ts`): per-slot
  registries behind `SCRIPT_PROVIDER` / `VIDEO_PROVIDER` /
  `VOICE_PROVIDER` / `PUBLISH_PROVIDER`; unset/unknown/empty → mock
  (unknown values warn). Call sites now resolve instead of hardcoding:
  generation orchestrator, studio-web `content-context`, publishing
  workflow.
- **Budget** (`packages/providers/src/budget.ts`):
  `assertProviderBudget` (UTC daily + calendar-month sums vs
  `PROVIDER_DAILY_BUDGET_USD` / `PROVIDER_MONTHLY_BUDGET_USD`; unset =
  zero = fail closed; audit `provider.budget_exceeded`) and
  `recordProviderUsage` (ledger + `provider.call` audit, never payload
  contents). New audit types added to the auth union.
- **Config/docs:** `.env.example` selection + budget vars +
  `ANTHROPIC_API_KEY` placeholder; `PROVIDER-ENABLEMENT.md` runbook;
  ADR-AIVS-009.

## 4. Carry-overs / notes

- Worker does not yet mark `ProviderBudgetError` non-retryable (no
  real adapter exists to throw it); wire in Phase A with the first
  real adapter.
- Costs in the ledger are adapter estimates; monthly reconciliation
  against provider dashboards is an operator task (runbook).
- Production env untouched: no selection or budget vars set in
  Vercel/Railway — production stays fully on mocks.

## 5. Next

Phase A (LLM script provider — recommendation: Anthropic
`claude-opus-5`) — needs its own user approval + user-supplied
`ANTHROPIC_API_KEY` + budgets set before any code binds.
