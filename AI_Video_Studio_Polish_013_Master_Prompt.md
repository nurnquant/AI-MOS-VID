# AI Video Studio — Provider Polish Master Prompt

**Document ID:** AIVS-POLISH-013
**Version:** 0.1 (DRAFT — pending user review)
**Status:** Draft for approval; do not execute until approved
**Project:** Riwaq Al Ilm Enterprise AI Video Production Studio
**Depends on:** Modules 001-012 (all PASS)
**Branch discipline (user directive):** ALL work stays on
`feature/aivs-polish-013`. Nothing merges to `main`, nothing deploys,
the Railway tracking branch is untouched — until the user explicitly
says merge.

---

## 1. Scope — three workstreams

### A. Usage & budget dashboard (`/usage`)

- **API `GET /api/usage`** (admin+): aggregates from the
  `ProviderUsage` ledger — spend today + this calendar month (UTC,
  matching the budget windows), broken down per provider; the
  configured caps (`PROVIDER_DAILY_BUDGET_USD` /
  `PROVIDER_MONTHLY_BUDGET_USD`) with remaining headroom; the last 25
  calls (provider, operation, units, cost, jobId, time). Budget-block
  count from audit events (`provider.budget_exceeded`).
- **`/usage` page** (design system): cap-vs-spent progress bars
  (green → amber → red), per-provider table, recent-calls table,
  explicit "budgets fail closed" note. Nav link (admin-relevant, but
  page itself degrades to denied-state below admin).
- Numbers are estimates — banner reminds to reconcile with provider
  dashboards (runbook rule).

### B. Azure Speech Arabic voice adapter (bake-off ready)

- `AzureSpeechVoiceProvider` behind `VOICE_PROVIDER=azure`
  (`AZURE_SPEECH_KEY`/`AZURE_SPEECH_REGION` placeholders exist):
  Azure TTS REST, Arabic neural voice default (`AZURE_VOICE_NAME`,
  e.g. `ar-SA-ZariyahNeural`), budget-gated per character like
  ElevenLabs, file:// output — same seam, zero pipeline changes.
- **Bake-off deliverable:** a small local script (committed to
  `scripts/voice-bakeoff.mjs`) that synthesizes the SAME Arabic
  narration through both providers and writes two labeled files to
  the Desktop for the user to listen and choose. Runs only when the
  user supplies the Azure key; spend ~$0.05.
- Unit tests with stubbed fetch; zero network in suites.

### C. Video model experiment harness

- `scripts/video-bakeoff.mjs`: renders ONE scene prompt through 2-3
  `FAL_VIDEO_MODEL` values (e.g. Kling v2.5 turbo pro vs a Veo-class
  model vs a budget model), same prompt, labeled outputs to Desktop +
  cost printout from the ledger. **Each run costs real dollars and
  only executes with explicit per-run user go** (script prints the
  estimate and requires `--yes`).
- Runbook section: how to pick/change `FAL_VIDEO_MODEL`, price-check
  reminder, results log template in `docs/operations/`.

## 2. Out of scope

Merging/deploying anything; new providers beyond Azure voice;
scheduled reports; per-tenant budget UI configuration (env stays the
config surface).

## 3. Execution gates (all on the feature branch)

- **Gate 1 — A: usage API + page.**
- **Gate 2 — B: Azure adapter + factory + tests + bake-off script.**
- **Gate 3 — C: video bake-off script + runbook.**
- **Gate 4 — validation:** full suites + verify + gitleaks on the
  branch.
- **Gate 5 — verification report on the branch; STOP.** Merge to main
  happens only on a later explicit user instruction.

## 4. Definition of Done

- `/usage` shows correct aggregates against seeded ledger rows
  (integration-tested); denied-state below admin; e2e untouched or a
  new spec added without modifying the existing 11
- `VOICE_PROVIDER=azure` resolves the adapter (fail-loud without key);
  unit tests cover request shape (Arabic voice, SSML), budget
  preflight, error mapping
- Bake-off scripts exist, refuse to spend without explicit flags, and
  document their cost up front
- `pnpm verify` green on the branch; gitleaks clean
- Report written; branch pushed (branch only); NO merge, NO deploy
