# Bake-off results log

Record every comparison run so provider decisions have a paper trail.

## Template

- **Date / who:**
- **Type:** voice | video
- **Candidates:** (models/voices compared)
- **Cost (ledger + dashboard actuals):**
- **Verdict + reasoning:**
- **Action taken:** (env change, or none)

## Runs

### 2026-07-27 — video: Kling v2.5 turbo pro vs LTX-Video

- **Date / who:** 2026-07-27, NuR (run via Claude)
- **Type:** video
- **Candidates:** `fal-ai/kling-video/v2.5-turbo/pro/text-to-video`
  vs `fal-ai/ltx-video` — same prompt (mosque-garden sunrise,
  watercolor storybook), 5s, 16:9
- **Cost (ledger + dashboard actuals):** ledger $1.00 total (both
  recorded at the default $0.10/s; LTX actual is far cheaper —
  reconcile with the fal.ai dashboard)
- **Verdict + reasoning:** pending — clips on Desktop
  (`aivs-vbake-kling-video-v2.5-turbo-pro-text-to-video.mp4`,
  `aivs-vbake-ltx-video.mp4`) awaiting user review
- **Action taken:** none yet; SLIDESHOW-015 (stills + Ken Burns)
  built as the low-cost alternative in parallel
