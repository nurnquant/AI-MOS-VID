# AI Video Studio — Slideshow Video Provider Master Prompt

**Document ID:** AIVS-SLIDESHOW-015
**Version:** 0.1 (DRAFT — pending user review)
**Status:** Draft for approval; do not execute until approved
**Project:** Riwaq Al Ilm Enterprise AI Video Production Studio
**Depends on:** Modules 001-014 (all PASS)
**Primary Objective:** A near-free video mode: each scene becomes ONE
AI-generated still illustration animated with a Ken Burns pan/zoom by
local ffmpeg — a calm picture-book aesthetic suited to children's
Islamic education, at ~~1-5% of Kling's cost (~~$0.003-0.03 per scene
vs ~$0.50-1.00). Narration, quarantine, consent, assembly, and
publishing pipelines are untouched.

---

## 1. Scope

### In scope

- **`ImageGenerationProvider` contract** (packages/providers):
  `generate({prompt, aspectRatio, tenantId}) → {imageUrl | file://}`.
  Two implementations:
  - `MockImageProvider` — local PNG via existing media-core ffmpeg
    drawing (zero network, suites stay offline).
  - `FalImageProvider` — fal.ai image queue API (reuses the proven
    fal auth/queue/appId plumbing from `fal-video.ts`);
    `FAL_IMAGE_MODEL` env, default `fal-ai/flux/schnell`
    (~$0.003/image; `fal-ai/flux/dev` ~$0.025 as the quality step-up).
    Budget-gated per image through the SAME fail-closed
    `assertProviderBudget`/`recordProviderUsage` ledger
    (`ProviderUnitType.images`), cost recorded at submit.
- **`renderKenBurns`** (packages/media-core): ffmpeg `zoompan` over a
  still — slow zoom-in (even scenes) / zoom-out (odd scenes), output
  mp4 matching the preset's resolution/fps, duration set by the scene
  target exactly like model clips. No new binaries; worker image
  already ships ffmpeg.
- **`SlideshowVideoProvider`** (packages/providers) implementing the
  EXISTING `VideoGenerationProvider` contract: `submit()` = generate
  image → Ken Burns render → return `file://` output as an
  already-succeeded job. Selected via `VIDEO_PROVIDER=slideshow`
  (+ `IMAGE_PROVIDER=mock|fal` underneath, mock default, fail-loud
  when fal selected without `FAL_API_KEY`). **Zero orchestrator
  changes** — narration-first sizing, `padClipToDuration`,
  quarantine/scan/validate, assembly, resume (RESUME-014) all apply
  as-is because the seam is the provider contract.
- **Tests:** unit — factory resolution, fal image request shape
  (stubbed fetch), zoompan arg construction, budget preflight;
  integration — full generation with `SlideshowVideoProvider` +
  `MockImageProvider` produces a ready final video at expected
  duration with narration; ledger row per scene image when using a
  stub-priced image provider. Existing 11 e2e untouched.
- **Docs:** PROVIDER-ENABLEMENT section (env matrix + cost table),
  runbook note.

### Out of scope

- Production flip (separate explicit user go: set
  `VIDEO_PROVIDER=slideshow`, `IMAGE_PROVIDER=fal` on Railway).
- Multiple images per scene, crossfades between distinct stills,
  subtitle burn-in, image style presets UI. Later modules if wanted.
- Any non-fal image provider.

## 2. Cost model (estimates — reconcile with fal dashboard)

| Piece                                        | Cost                          |
| -------------------------------------------- | ----------------------------- |
| Image (flux schnell, 1 per scene)            | ~$0.003                       |
| Ken Burns render (local ffmpeg)              | $0.00                         |
| 5-scene video, images only                   | ~$0.015 (dev-quality: ~$0.13) |
| Full video incl. script $0.03 + voice ~$0.26 | **~$0.30**                    |

vs ~$5.03 today with Kling. Same $-caps guard it.

## 3. Execution gates

- **Gate 1 — contracts + MockImageProvider + factory wiring.**
- **Gate 2 — FalImageProvider (stubbed-fetch unit tests, budget).**
- **Gate 3 — renderKenBurns + SlideshowVideoProvider + integration.**
- **Gate 4 — full suites + verify + gitleaks.**
- **Gate 5 — verification report → merge ff to main + push.**
  Optional post-merge (user go): one real flux-schnell smoke
  (~$0.01), then production flip on request.

## 4. Definition of Done

- `VIDEO_PROVIDER=slideshow` end-to-end generation succeeds on mocks:
  final video ready, correct duration, narration audible, thumbnails,
  audit trail — proven by integration test
- Fal image path unit-proven offline (request shape, auth header,
  appId status polling, budget fail-closed, error mapping to
  ProviderCallError)
- Ledger: one `images` row per scene at expected estimate
- Resume interplay: failed scene re-renders its image only (covered
  by existing resume mechanics; asserted in integration)
- Suites green; `pnpm verify` exit 0; gitleaks clean; one small
  migration: add `images` to the `ProviderUnitType` enum (normal
  Prisma flow, applied local + Neon)
- Verification report in docs/environment/
