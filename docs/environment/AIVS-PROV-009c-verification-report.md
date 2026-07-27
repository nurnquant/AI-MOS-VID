# AIVS-PROV-009 Phase C Verification Report

**Result:** **PASS (live-smoked 2026-07-27, $0.5153/scene)**
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

## 5. Live smoke — DONE 2026-07-27

User created the fal.ai account, funded it, and placed `FAL_API_KEY`
in local `.env`. Findings:

- **Fixed in smoke:** fal queue status/result endpoints 405 on the
  full model path — they address the app id (`fal-ai/kling-video`).
  Fix committed (29cdf77); the already-paid render was recovered by
  re-polling with the corrected URL.
- **Full single-scene pipeline (fixed adapter):** 83.5 s end-to-end —
  ElevenLabs narration → Kling v2.5 turbo pro render (5 s) → pad/mux →
  quarantine → validated `ready` asset. Ledger: `fal video.submit 5
seconds $0.50` + `elevenlabs voice.synthesize $0.0153` = **$0.5153
  per scene**. First attempt correctly failed closed on an exhausted
  fal balance (403 surfaced, nothing recorded).
- Budget caps are per-tenant; a full 4-5-scene video (~$2-3) needs
  `PROVIDER_DAILY_BUDGET_USD` raised above the current 1.

Production flip (user actions, when wanted): add `FAL_API_KEY`,
`VIDEO_PROVIDER=fal`, raised budget caps (+ optionally
`FAL_VIDEO_MODEL`, `FAL_USD_PER_SECOND`) to Railway worker Variables,
restart. Rollback: `VIDEO_PROVIDER=mock`.

## 6. Production flip — 2026-07-27, lessons recorded

User added `FAL_API_KEY`, `VIDEO_PROVIDER=fal`, raised caps (5/30) to
Railway worker Variables. First production 4-scene generation
(`73882fe5`) **failed on a deploy race**: the Railway tracking branch
was force-updated minutes before the run, and the first scene attempts
executed on the old worker image without the fal status-URL fix; BullMQ
retries then hit the $5 daily cap and died non-retryably. The caps
behaved exactly as designed — 4 renders committed ($4.00 estimated),
retries added only $0.06, no runaway spend.

**All four paid Kling renders were recovered** by jobId from the ledger
and assembled locally through the identical pipeline functions
(narration re-synthesized for $0.2631): a 60 s, 4-scene, fully-AI
video — real script, real voice, real visuals.

Operational lessons (runbook-relevant):

1. After updating the Railway tracking branch, wait for the deploy to
   go green in the Railway dashboard before starting paid generations.
2. Real switch of the Railway service to track `main` would remove the
   force-push workaround entirely (still pending, user action).
3. A failed-then-retried scene job re-runs voice + submit; caps bound
   the damage, but re-verification of a full prod video should wait for
   the next UTC day (cap window) or a temporary cap raise.

## 7. Next

Then Phase D (platform publishing) — or
stop the paid track here and start the UX/design module (scripts,
voice, and visuals all real is a complete creative pipeline;
publishing can stay mock/manual).
