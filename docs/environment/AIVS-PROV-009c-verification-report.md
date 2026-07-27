# AIVS-PROV-009 Phase C Verification Report

**Result:** **PASS (code complete; live smoke pending user key)**
**Date:** 2026-07-27
**Branch:** `feature/aivs-prov-009c-fal-video`
**Provider:** fal.ai queue API (default model: Kling v2.5 turbo pro text-to-video; env-configurable)

## 1. Scope delivered

Real AI video generation — the most expensive slot, and the one that
finally exercises the async seam designed in GEN-006:

1. **`FalVideoProvider`** behind `VideoGenerationProvider`: queue-style
   submit → request id; `getJob` maps `IN_QUEUE`/`IN_PROGRESS`/
   `COMPLETED` onto the contract and fetches the https output URL on
   completion. **Budget asserted AND recorded at submit** (money is
   committed then), units = clip seconds. Model env-configurable
   (`FAL_VIDEO_MODEL`); cost knob `FAL_USD_PER_SECOND` (default 0.10
   conservative).
2. **Orchestrator async seam:** `awaitVideoJob` polls until terminal
   (interval/timeout env-tunable, defaults 10 s / 10 min);
   `resolveOutputToLocal` maps `file://` directly and downloads
   `https://` outputs; anything else rejected.
3. **Duration reconciliation:** real models render fixed lengths
   (Kling: 5 s / 10 s) that can undershoot the narration. New
   media-core `padClipToDuration` clones the last frame out to the
   narration length — **narration is never cut**. `pickFalDuration`
   maps narration length onto the smallest allowed clip length.

## 2. Evidence

| Item                                                       | Status | Evidence                                                                                                                                                          |
| ---------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Budget preflight blocks submit before network; fail closed | ✅     | Unit: zero-config budget → `ProviderBudgetError`, fetch never called                                                                                              |
| Ledger records seconds at submit with jobId                | ✅     | Unit: row `{provider: fal, operation: video.submit, units: 10, unitType: seconds, jobId}`                                                                         |
| Queue status mapping + result URL extraction               | ✅     | Unit: IN_QUEUE→queued, IN_PROGRESS→running, COMPLETED→succeeded + https url; missing url → failed                                                                 |
| Fail-loud on missing key                                   | ✅     | Unit: `VIDEO_PROVIDER=fal` without key throws at resolution                                                                                                       |
| Async seam end-to-end without any real provider            | ✅     | Integration: fake queued provider + local self-signed https server serving a real 2 s mp4 → poll ×2 → download → **padded to 4 s narration** → quarantine → ready |
| Existing pipeline untouched on mocks                       | ✅     | 51 integration + 99 unit green; e2e unchanged                                                                                                                     |
| `pnpm verify` green; gitleaks clean                        | ✅     | verify exit 0; "no leaks found"                                                                                                                                   |

## 3. Incident note (resolved, no leak)

During Phase C work a real ElevenLabs key was found pasted into the
**tracked** `.env.example` in the working tree (user edit). Verified
never committed (`git log -S` empty; HEAD clean) — restored the file
from HEAD; key remains only in gitignored `.env`. Reminder recorded in
the runbook ground rules: keys go in `.env` / env stores only.

## 4. Enablement (user actions)

1. Create fal.ai account → API key → `FAL_API_KEY` in local `.env`
   (+ Railway worker vars for production — video runs in the worker).
2. **Check model pricing** (fal.ai/models) and set `FAL_USD_PER_SECOND`
   accordingly; **raise `PROVIDER_DAILY_BUDGET_USD` /
   `PROVIDER_MONTHLY_BUDGET_USD`** — a single 4-scene video ≈ 4 clips
   × 5-10 s each; at Kling-class pricing that is **dollars per video,
   not cents**.
3. Optionally set `FAL_VIDEO_MODEL` (default Kling v2.5 turbo pro).
4. Set `VIDEO_PROVIDER=fal` locally; live smoke = ONE scene first,
   cost reviewed, then a full video, then production flip.

## 5. Next

Live smoke on key arrival. Then Phase D (platform publishing) — or
stop the paid track here and start the UX/design module (scripts,
voice, and visuals all real is a complete creative pipeline;
publishing can stay mock/manual).
