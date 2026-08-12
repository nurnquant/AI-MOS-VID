# 0022 — Lā ḥawla wa lā quwwata illā billāh · production notes

**Delivered** 2026-08-11 · style 1 (Cinematic Reverent) · 231 credits · $7.62
**Not published.** Awaiting the recitation ear-check.

## Deliverable

`OUTPUT/0022-la-hawla-9x16.mp4` — 57.85s, 720x1280, 24fps, h264 crf18, aac
192k, faststart. 19.7 MB.

Structure: 8 beats of real motion (52.8s) + emerald brand end card (5s), joined
with a **filter** concat, not the demuxer — the demuxer dropped the end card's
silent audio track and left video 64.5s against audio 59.5s.

## What it is made of

| Part     | Count                      | Notes                                                                              |
| -------- | -------------------------- | ---------------------------------------------------------------------------------- |
| Stills   | 8 nano_banana_pro          | master + 7 scene stills, used as veo start frames                                  |
| Clips    | 9 veo-3-1-fast             | 8 in the cut; `c3-sunrise` discarded (clipped to white), re-rolled as `n8-sunrise` |
| VO       | seed_audio, voice 5-Emmett | ONE continuous read, `work/vo2/full.wav`                                           |
| Piano    | local, free                | Apple DLS bank via `scripts/social/piano.m`, D major, 45%                          |
| Ambience | free                       | rain lifted from `c1-rain`, the one clip with clean audio                          |
| Cards    | 6 Pillow PNGs              | full dua, 3 fragments, meaning, ameen                                              |

Build script: `work/build2.sh`. Card timings are derived from the actual speech
boundaries of the continuous read, not guessed.

## Verification done

- **Whisper** on `vo2/full.wav` — every line matches the brief.
- **RMS per clip** — 6 of 9 clips came back at −17 to −23 dB, i.e. a music bed,
  despite "ABSOLUTELY NO MUSIC" pinned. Genuine ambience sits at −40 to −46 dB.
  Policy applied: **all veo clip audio discarded**, soundtrack built locally.
- **Duration audit** — video and audio streams both 57.85s after the filter
  concat fix.

## Known issues

- **⚠️ No watermark.** Style 1 requires a rotating gold wordmark; `build2.sh`
  never applied one. Confirmed by frame extraction at t=30s. Needs a watermark
  pass before publishing — local ffmpeg, no credits.
- **Arabic is on screen, never spoken.** seed_audio could not pronounce
  "quwwata" across 7 attempts ("quata", "kuwata", "kuwatha", "Nah how la",
  "WALA KUATA"). "Ameen" came back as "I mean". Both moved to Pillow cards
  rather than ship a mispronounced dua. Harakat stripped — no Pillow raqm on
  this host — so the transliteration carries the vowelling.
- **v1 was rejected at 2/5** ("worst video and voice"). Two bad calls of mine:
  Ken Burns on stills for 6 of 9 beats to save ~110 credits on a request that
  asked for ultra-realistic video, and narration stitched from 7 TTS fragments
  with fixed silences, which read as disjointed. v2 fixed both. The 231 credits
  include that waste.

## Gotchas worth remembering

- `set -euo pipefail` plus `[ test ] && var=x` silently aborts a loop — use
  `if…then…fi`.
- Card PNGs need `-loop 1 -framerate $FPS -t <dur>`, or they show for one frame.
- zsh does not word-split unquoted variables, so `set -- $r` in a rating loop
  passes empty args while the echo still claims success.
