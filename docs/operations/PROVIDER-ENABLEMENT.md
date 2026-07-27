# Provider Enablement Runbook (AIVS-PROV-009)

How to turn a real, paid provider on — and off — safely. Applies to
every PROV-009 phase (A: LLM scripts, B: TTS, C: video, D: platform
publishing). Architecture: `docs/architecture/ADR-AIVS-009-provider-enablement.md`.

## Ground rules

- **Nothing is enabled by default.** All four slots (`SCRIPT_PROVIDER`,
  `VIDEO_PROVIDER`, `VOICE_PROVIDER`, `PUBLISH_PROVIDER`) resolve to
  mocks unless set to a registered real provider.
- **No budget = no spend.** `PROVIDER_DAILY_BUDGET_USD` and
  `PROVIDER_MONTHLY_BUDGET_USD` unset/0/invalid means every real call
  fails closed with `ProviderBudgetError` (audited
  `provider.budget_exceeded`). Set both before enabling anything.
- **Keys never enter chat, the repo, or logs.** Owner creates the
  account and puts the key directly into the env stores.
- **Each phase needs its own user approval** before any adapter code
  ships or any flag flips.

## Enabling a provider (per phase, after approval)

1. **Create the account** (owner action) with the provider; enable
   billing limits on the provider's own dashboard too where offered
   (defense in depth).
2. **Place the key** (owner action):
   - Production web: Vercel → project `aivs-studio-web` → Settings →
     Environment Variables (run `npx vercel env add NAME production`
     from the **repo root** — never trust `vercel env pull` to show
     values; encrypted values read back empty).
   - Worker: Railway → worker service → Variables.
   - Local: `.env` (gitignored).
3. **Set budgets** in the same three places:
   `PROVIDER_DAILY_BUDGET_USD`, `PROVIDER_MONTHLY_BUDGET_USD` (USD,
   positive numbers).
4. **Flip the slot**, e.g. `SCRIPT_PROVIDER=anthropic`. Redeploy web
   (push or Vercel redeploy) and restart the Railway worker.
5. **Smoke-test one call** while watching the provider dashboard and
   the `ProviderUsage` table / `provider.call` audit rows.

## Rollback (instant)

Set the slot back to `mock` (or delete the var), redeploy/restart.
Mocks take over immediately; no code change needed. The API key can
stay in the env store (unused) or be removed/rotated.

## Kill switch for runaway spend

Set `PROVIDER_DAILY_BUDGET_USD=0` (or remove it) and redeploy/restart —
every subsequent real call fails closed. Then rotate/limit the key on
the provider dashboard if needed.

## Observability

- Ledger: `ProviderUsage` rows (tenant, provider, operation, units,
  `estimatedCostUsd`, jobId).
- Audit: `provider.call` per successful paid call,
  `provider.budget_exceeded` per blocked attempt.
- Costs are **estimates** computed by adapters; reconcile monthly
  against the provider's own billing dashboard.

## Current registry

| Slot               | Registered values    | Real providers                                                                                                                                                                                                       |
| ------------------ | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SCRIPT_PROVIDER`  | `mock`, `anthropic`  | `anthropic` = Claude Opus 5 (Phase A, live-smoked)                                                                                                                                                                   |
| `VIDEO_PROVIDER`   | `mock`, `fal`        | `fal` = fal.ai queue API (Phase C; needs `FAL_API_KEY`; model via `FAL_VIDEO_MODEL`, cost via `FAL_USD_PER_SECOND` — check fal.ai/models pricing and RAISE budget caps before enabling: video is dollars, not cents) |
| `VOICE_PROVIDER`   | `mock`, `elevenlabs` | `elevenlabs` = ElevenLabs multilingual TTS (Phase B; needs `ELEVENLABS_API_KEY` + `VOICE_ID`)                                                                                                                        |
| `PUBLISH_PROVIDER` | `mock`, `youtube`    | `youtube` = YouTube Data API v3 (Phase D; creds via `scripts/youtube-oauth.mjs`; madeForKids hard-coded, unlisted default, real takedown on revocation). Meta/Instagram/Pinterest/TikTok: placeholders               |
| `IMAGE_PROVIDER`   | `mock`, `fal`        | `fal` = fal.ai image models (SLIDESHOW-015; needs `FAL_API_KEY`; model via `FAL_IMAGE_MODEL`, default flux/schnell; cost via `FAL_USD_PER_IMAGE`, default $0.005). Only used by `VIDEO_PROVIDER=slideshow`           |

`VIDEO_PROVIDER` also registers `slideshow` (SLIDESHOW-015): one still
per scene from `IMAGE_PROVIDER`, animated by local ffmpeg Ken Burns —
~$0.003-0.03 per scene instead of $0.50-1.00. Picture-book aesthetic;
switch production with `VIDEO_PROVIDER=slideshow` + `IMAGE_PROVIDER=fal`
on the worker (needs user approval + Railway env change + redeploy).

Update this table in each phase's PR.

## Usage dashboard & bake-offs (AIVS-POLISH-013)

- **/usage** (admin+): today/month spend per provider vs the budget
  caps, blocked-call count, last 25 ledger rows. Estimates only —
  reconcile monthly with each provider's own dashboard.
- **Arabic voice bake-off:** `node --env-file=.env
scripts/voice-bakeoff.mjs --yes` → two labeled MP3s on the Desktop
  (ElevenLabs vs Azure, same narration, ~$0.05). Requires both keys;
  Azure voice via `AZURE_VOICE_NAME` (default ar-SA-ZariyahNeural).
  Switch production narration to Azure with `VOICE_PROVIDER=azure` +
  `AZURE_SPEECH_KEY`/`AZURE_SPEECH_REGION` on the worker.
- **Video model bake-off:** `node --env-file=.env
scripts/video-bakeoff.mjs --yes [model…]` → one labeled 5s clip per
  model on the Desktop. REAL dollars per model — check fal.ai/models
  pricing first; raise budget caps to fit. Record outcomes in
  `docs/operations/BAKEOFF-RESULTS.md`; change production video with
  `FAL_VIDEO_MODEL` (+ `FAL_USD_PER_SECOND` to match its price).
