# AI Video Studio — Real Provider Enablement Track Master Prompt

**Document ID:** AIVS-PROV-009
**Version:** 0.1 (DRAFT — pending user review)
**Status:** Draft for approval; do not execute until approved
**Project:** Riwaq Al Ilm Enterprise AI Video Production Studio
**Depends on:** Modules 001-008 (all PASS; full mock pipeline live in production)
**Primary Objective:** Replace mock providers with **real, paid providers —
one at a time, each individually user-approved** — behind the existing
`packages/providers` contracts, with hard cost controls, child-safety
gates intact, and instant mock fallback. This module crosses the
"no paid provider calls" line for the first time; nothing goes live
without a key the user supplies and a per-phase go-ahead.

---

## 1. Claude Operating Role

Principal Software Architect, Backend Engineer, Security/Compliance
Engineer, Senior QA Automation Engineer. All prior non-negotiables remain,
plus:

1. Branch `feature/aivs-prov-009-providers` (phase branches allowed:
   `-009a`, `-009b`, ...).
2. **Per-provider approval is absolute.** Approval of this track does NOT
   enable any provider. Each phase (A-D below) starts only after the user
   (a) approves that phase's spec, (b) creates the account, and (c) puts
   the API key into the env stores themselves (Vercel/Railway env + local
   `.env`). Keys never appear in chat, repo, or logs; gitleaks stays green.
3. **Mock stays default.** Provider selection is env-driven
   (`SCRIPT_PROVIDER`, `VOICE_PROVIDER`, `VIDEO_PROVIDER`,
   `PUBLISH_PROVIDER` = `mock` unless set). Unset/invalid/missing key =
   mock. Every real adapter binds behind the existing contracts
   (`ScriptProvider`, `VoiceProvider`, `VideoGenerationProvider`,
   `PublishingProvider`) — orchestrator and workflow code unchanged
   except the already-identified URL-resolution seam.
4. **Child-media safety baseline unweakened.** All existing human gates
   (script approval, generation approval, baseline §10 two-step
   publishing) stay in front of real spend and real output. Real
   provider _output_ enters the pipeline like any upload: quarantined,
   validated, then `ready`. No real generation runs for
   `featuresMinor` content unless the triggering script/publication has
   passed its human review gates.
5. **Hard cost controls before first real call** (Phase 0 deliverable):
   - `ProviderUsage` ledger (Prisma): tenant, provider, operation, units,
     estimated cost, jobId — written on every real call.
   - Per-tenant caps via env (`PROVIDER_DAILY_BUDGET_USD`,
     `PROVIDER_MONTHLY_BUDGET_USD`). Cap reached = job fails closed with
     clear error + audit `provider.budget_exceeded`. No silent overruns.
   - Bounded retries (existing BullMQ attempts), per-call timeouts —
     no retry storms against paid APIs.
6. Every real-provider call audited (`provider.call` with provider,
   operation, cost estimate; never payload contents with PII).

## 2. Scope

### Phase 0 — Foundation (implemented with this module's approval)

- Env-based provider selection + factory in `packages/providers`
- `ProviderUsage` schema + budget-cap service + audit events
- `.env.example` provider-selection vars + `ANTHROPIC_API_KEY` placeholder
- Docs: `docs/operations/PROVIDER-ENABLEMENT.md` (per-phase runbook:
  account creation, key placement, flipping the env flag, rollback = set
  flag back to `mock`)

### Phase A — LLM script provider (recommended first: cheapest, text-only)

- **Recommendation: Anthropic Claude API**, model `claude-opus-5`
  ($5/$25 per MTok) — strong Arabic, structured outputs
  (`output_config.format` json_schema) for the exact script JSON the
  pipeline already consumes, adaptive thinking default. Alternative:
  OpenAI (placeholder already in `.env.example`) — user's call.
- `AnthropicScriptProvider` behind `ScriptProvider`; ar/en; deterministic
  mock remains for all tests. Est. cost: well under $0.15 per script.

### Phase B — TTS voice

- ElevenLabs primary; Azure Speech Arabic bake-off (both placeholders
  exist). Adapter behind `VoiceProvider`; output audio → quarantine →
  validation → intermediate mux path unchanged. Est. ~$0.10-0.30/min.

### Phase C — Video generation (most expensive — strictest caps)

- fal.ai aggregator as first adapter (one API over Kling/Veo/etc.;
  placeholders exist). Contract already async (`submit`/`getJob`).
  Orchestrator URL seam: accept `https` output URLs, download into
  storage, then existing normalize/concat pipeline unchanged. Per-job
  cost preflight against budget before submit. Est. dollars per minute
  of video — exact caps set in the phase spec.

### Phase D — Platform publishing (LAST; may be deferred)

- Real Meta/YouTube/TikTok APIs. Biggest compliance surface for
  children's content (platform minors policies, real takedown on
  consent revocation — the retraction carry-over from PUB-008). Phase
  spec will enumerate platform-policy requirements before any code.

### Out of scope

- Enabling any provider without its phase approval + user-supplied key
- Music generation, ClamAV, Resend email, monitoring (separate carry-overs)
- Any weakening of quarantine/consent/approval gates

## 3. Execution Gates

- **Gate 0 — ADR-AIVS-009:** provider factory, budget model, safety
  interlocks. Stop unless pre-authorized.
- **Gate 1 — Phase 0 schema + budget service.**
- **Gate 2 — Provider factory + env selection (all mocks still default).**
- **Gate 3 — Tests + `pnpm verify` + docs.**
- **Gate 4 — Verification report for Phase 0.**
- **Then per phase A-D:** phase spec → user approval + key → adapter →
  tests (unit against recorded/mock responses; one manual live smoke with
  user watching cost) → phase verification note → user approval for next.

## 4. Definition of Done (Phase 0)

- All four provider slots selectable by env; every unset/invalid value
  falls back to mock (tested)
- Budget cap blocks a real call and audits it (tested with fake adapter)
- `ProviderUsage` rows written per call (tested)
- Zero real network calls in any test suite; `pnpm verify` green;
  gitleaks clean; migrations reproducible
- Enablement runbook in docs; verification report; user approval before
  Phase A implementation

## 5. After this track

UX/design module next (user-ordered): real UI pass — direction decision
(component library vs hand-rolled tokens, dark mode, Arabic typography)
comes as its own master prompt per the frontend-design skill.
