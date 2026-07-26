# ADR-AIVS-009 — Real Provider Enablement: Factory, Budget, Safety Interlocks

**Status:** Accepted (user approved the PROV-009 master prompt and
authorized implementation on 2026-07-26)
**Date:** 2026-07-26
**Deciders:** User + Claude Code
**Related:** ADR-AIVS-002..008, `AI_Video_Studio_Prov_009_Master_Prompt.md`,
`docs/security/AIVS-media-security-baseline.md`

## Context

All eight modules run on mocks; the pipeline is live in production with
zero paid calls. PROV-009 begins swapping mocks for real providers —
one at a time, each individually user-approved with a user-supplied key.
Phase 0 (this ADR) builds the shared foundation: provider selection,
spend ledger, budget caps, and the safety interlocks that every later
phase (A: LLM scripts, B: TTS, C: video, D: platform publishing) binds
into. Phase 0 itself makes **zero** real network calls.

## Decision

### 1. Provider factory (env-driven selection, mock default)

- `packages/providers/src/factory.ts` exports one resolver per slot:
  `resolveScriptProvider()`, `resolveVideoProvider()`,
  `resolveVoiceProvider()`, `resolvePublishingProvider()`.
- Selection env vars: `SCRIPT_PROVIDER`, `VIDEO_PROVIDER`,
  `VOICE_PROVIDER`, `PUBLISH_PROVIDER`. Each resolver looks the value up
  in a per-slot registry; **unset, unknown, or empty values resolve to
  the mock** (`mock-script`, `local-synth`, `local-synth-voice`,
  `mock-publishing`). No throw, no partial state — the pipeline always
  has a working provider.
- Real adapters (later phases) register under their own key (e.g.
  `SCRIPT_PROVIDER=anthropic`) and must additionally verify their API
  key env at construction; a selected real provider with a missing key
  throws at resolution time with a clear message (fail loud, not silent
  fallback — the operator explicitly asked for a real provider).
- Call sites replace their hardcoded `new Mock…()` singletons with the
  resolver: generation orchestrator (`defaultProvider`), studio-web
  `content-context.ts` (`scriptProvider`), publishing workflow
  (`defaultProvider`). Resolution happens once per process (module
  scope), same as today.

### 2. Spend ledger + budget caps

- New model `ProviderUsage`: tenant-scoped row per real provider call —
  `provider`, `operation`, `units` + `unitType` (`tokens|seconds|calls`),
  `estimatedCostUsd` (Decimal), optional `jobId`, `createdAt`. Indexed
  `[tenantId, createdAt]` for windowed sums.
- `packages/providers/src/budget.ts` (deps: `@aivs/database`,
  `@aivs/auth` for `writeAudit` — no cycle; neither depends on
  providers):
  - `assertProviderBudget(prisma, tenantId, estimatedCostUsd)` — sums
    `estimatedCostUsd` over the current UTC day and calendar month,
    compares against `PROVIDER_DAILY_BUDGET_USD` /
    `PROVIDER_MONTHLY_BUDGET_USD`. Over either cap → audit
    `provider.budget_exceeded` + throw `ProviderBudgetError` (409-style;
    jobs fail closed, no retry storm — budget errors are marked
    non-retryable at the worker).
  - `recordProviderUsage(prisma, entry)` — writes the ledger row +
    audit `provider.call` (provider, operation, units, cost; never
    payload contents).
  - **Unset caps mean zero budget.** A real provider call with no
    budget configured is blocked. Mocks never touch the budget path.
- Real adapters (later phases) call `assertProviderBudget` before the
  paid request and `recordProviderUsage` after it. Phase 0 ships the
  services + tests with a fake adapter only.

### 3. Safety interlocks (unchanged gates, restated as requirements)

- Human gates stay in front of real spend: script approval before
  generation, baseline §10 two-step approval before publishing.
- Real provider **output** enters through the existing ingestion path:
  quarantine → validation → `ready`. The orchestrator's `file://`-only
  URL check is relaxed **only** in Phase C, where `https` outputs are
  downloaded into storage and then follow the identical pipeline.
- Keys live only in Vercel/Railway env stores and local `.env`
  (gitignored). `.env.example` gains selection vars, budget vars, and an
  `ANTHROPIC_API_KEY` placeholder — all empty/mock defaults.

### 4. Phase sequence (each separately approved)

A: LLM scripts (recommended: Anthropic `claude-opus-5`) → B: TTS
(ElevenLabs / Azure Arabic bake-off) → C: video (fal.ai first adapter)
→ D: platform publishing (heaviest compliance; may be deferred).

## Alternatives considered

| Area          | Alternative                             | Why rejected                                                                       |
| ------------- | --------------------------------------- | ---------------------------------------------------------------------------------- |
| Selection     | DB-stored per-tenant provider config    | Env is the existing config surface; per-tenant choice is premature (one tenant)    |
| Budget store  | Redis counters                          | Ledger doubles as audit/reporting; Prisma sums are cheap at this volume            |
| Unset caps    | Unlimited (opt-out)                     | Fails open — violates the no-surprise-spend rule; zero-until-configured is safe    |
| Budget scope  | Global (not per-tenant)                 | Tenant scoping matches every other table; global cap = same env for the one tenant |
| Factory place | New `packages/provider-runtime` package | Providers package already owns contracts + mocks; one home, no sprawl              |

## Security implications

- No real network calls in Phase 0; all suites keep running offline.
- Budget failure is closed and audited; missing configuration cannot
  produce spend.
- Child-media human gates and quarantine pipeline are untouched; later
  phases bind behind them, never around them.
- Keys never in repo/chat/logs; gitleaks remains part of verify.
