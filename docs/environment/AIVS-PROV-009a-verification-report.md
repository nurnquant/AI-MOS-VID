# AIVS-PROV-009 Phase A Verification Report

**Result:** **PASS** (first real provider enabled)
**Date:** 2026-07-26
**Branch:** `feature/aivs-prov-009a-anthropic-script`
**Provider:** Anthropic Claude API, model `claude-opus-5`

## 1. Scope delivered

`AnthropicScriptProvider` — the first real, paid provider — behind the
existing `ScriptProvider` contract. User approved the phase, created
the account, and placed `ANTHROPIC_API_KEY` in Vercel + local `.env`
themselves; the key never entered chat or the repo.

## 2. Evidence

| Item                                                    | Status | Evidence                                                                                       |
| ------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| Adapter behind contract; pipeline code unchanged        | ✅     | Only call-site change: `tenantId` threaded into `generate()` (optional field; mocks ignore it) |
| Budget preflight fails closed before SDK call           | ✅     | Unit: zero-config budget → `ProviderBudgetError`, SDK never invoked                            |
| Actual usage recorded in ledger                         | ✅     | Unit: `ProviderUsage` row with real token counts + cost; live smoke: 1394 tokens, $0.0213      |
| Structured output → exact scene shape                   | ✅     | `zodOutputFormat` schema (narration, visualDescription, durationTargetSeconds clamped 5-20)    |
| Safety refusal handled                                  | ✅     | Unit: `stop_reason: "refusal"` → clear error, usage still recorded                             |
| Fail-loud on missing key                                | ✅     | Unit: `SCRIPT_PROVIDER=anthropic` without key throws at resolution; never silently falls back  |
| Mock remains default + test provider                    | ✅     | All suites run on mocks; adapter tests use injected fake client, zero network                  |
| **Live smoke (user-witnessed)**                         | ✅     | One real call, local, dev tenant: 15.1 s, 3 child-appropriate scenes (en), ledger $0.0213      |
| `pnpm verify` green; gitleaks clean; integration intact | ✅     | verify exit 0 (81 unit); "no leaks found"; 50 integration pass                                 |

## 3. Design notes

- System prompt: Riwaq Al Ilm children's Islamic-education context,
  ar (MSA) / en, child-safety rules baked in; sceneCount honored.
- Preflight uses worst-case cost (full 16K output at Opus 5 rates
  $5/$25 per MTok); the ledger row records what the call actually cost.
- Generated scripts still enter the normal human review flow
  (draft → in_review → approved) before any generation runs — the human
  gate in front of downstream spend is unchanged.

## 4. Production enablement (user actions, when ready)

Local: key + budget caps are in `.env`; set `SCRIPT_PROVIDER=anthropic`
there to use the real provider locally (smoke test called the adapter
directly). For production: add to Vercel env —
`SCRIPT_PROVIDER=anthropic`, `PROVIDER_DAILY_BUDGET_USD`,
`PROVIDER_MONTHLY_BUDGET_USD` (key already there) — then redeploy.
Rollback: set `SCRIPT_PROVIDER=mock`.

## 5. Next

Phase B (TTS: ElevenLabs primary / Azure Speech Arabic bake-off) —
needs its own user approval + key. Carry-over stands: worker marks
`ProviderBudgetError` non-retryable when a queue-side adapter lands
(script generation is request-path, not queued).
