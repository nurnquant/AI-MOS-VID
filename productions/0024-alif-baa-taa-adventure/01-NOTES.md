# 0024 — Alif, Baa, Taa Adventure · production notes

**Delivered** 2026-08-12 · style 7 (Photoreal Sing-Along) · 215 credits · $7.10
Rhyme Series Season 2 #7 (see `library/pillars/` and production 0023).
**Not published.**

## Deliverable

`OUTPUT/0024-alif-baa-taa-adventure-9x16.mp4` — 61.04s, 720x1280, 24fps, h264
crf18, aac 192k, faststart, 20 MB.

7 beats of real motion (56s) + emerald brand end card (5s), joined by **filter**
concat. Video 61.042s, audio 61.035s — no desync.

| Beat | t     | Content                       | Card                             |
| ---- | ----- | ----------------------------- | -------------------------------- |
| b0   | 0–8   | four children clapping        | intro lyric                      |
| b1   | 8–16  | Johra stands tall, arm up     | ا Alif, no dots                  |
| b2   | 16–24 | one finger pointing down      | ب Baa, ring on its own dot       |
| b3   | 24–32 | all four hold up two fingers  | ت Taa, two dots                  |
| b4   | 32–40 | three fingers held still      | ث Saa, three dots                |
| b5   | 40–48 | clapping and cheering         | four letter tiles, Mā shā’ Allāh |
| b6   | 48–56 | waving goodbye, evening light | closing lyric                    |

## What it is made of

| Part      | Count                                   | Notes                                                                         |
| --------- | --------------------------------------- | ----------------------------------------------------------------------------- |
| Stills    | 7 nano_banana_pro                       | master (2 takes) + 5 scene stills, `Johra.jpeg` as identity reference         |
| Clips     | 8 veo-3-1-fast                          | 7 in the cut; `b4-saa-v1-count-wrong` discarded                               |
| Voice     | seed_audio, **Juno**, `speech_rate: 20` | one continuous read, `vo/juno-r20.wav`                                        |
| Music     | local, free                             | marimba, `scripts/social/kidsmusic.m` (new), GM program 12, C major I-V-vi-IV |
| Cards     | 8 Pillow PNGs                           | `cards.py` — 4 letter cards, 2 lyric cards, chorus tiles, end card            |
| Watermark | local                                   | gold wordmark, corners rotating per beat                                      |

Build: `work/build.sh`. Cards: `work/cards.py`.

## Verification done

- **Voice audition, three presets, full read, whisper-transcribed.** Decisive:
  **Daisy said "Aleph", Gracie said "Aleaf", only Juno said "Alif".** A rhyme that
  teaches the Arabic alphabet cannot mispronounce the first letter. Same class of
  failure as 0022's "quwwata".
- **Finger counts frame-checked at 1s/3s/5s/7s** on every counting beat, because
  the count _is_ the lesson. `b4-saa` v1 failed — open hand at 1s and 4s, three
  fingers only at 7s — and was re-rolled with the hand shape pinned still. Taa
  and Alif held correctly on the first take.
- **RMS on all 8 clips:** −22 to −27 dB, i.e. every single one carried a music
  bed despite explicit prohibition. Genuine room tone is −40 to −46 dB. All clip
  audio discarded.
- **Whisper on the final mixed audio** (not just the raw VO): all 24 lines
  intelligible over the marimba, "Alif" and "Mā shā' Allāh" both clear, and the
  speech boundaries line up with the card cues within ~1s.
- **Card timings derived from whisper's actual speech boundaries**, not guessed.
- **Watermark confirmed present** by frame extraction at 19s, 43s and 52s —
  explicitly checked because 0022 shipped without one.

## Known issues

- **Cast size drifts between beats.** The master still has four children; Veo
  added a fifth in `b1-alif` (a second girl in an identical beige khimar and
  green dress) and dropped one in `b2-baa`. Each clip is internally consistent
  and no viewer watching once will notice, but side by side the group changes.
  Fixing it would mean re-rolling two clips at 22 credits each — judged not worth
  it. Flagging rather than hiding.
- **`b2-baa`'s downward point is only clear in the first ~2s**, after which the
  hand drifts upward. The Baa card carries the teaching for the whole beat, so
  the point still lands, but it is not as clean as Taa or Saa.
- **The chorus card's bottom line** sits over the children's raised hands with
  modest contrast. Legible, not ideal.
- **"Saa" for ث** follows the brief. Some traditions say "Thaa". Deliberate, not
  an error — but worth a decision if the series continues.

## Gotchas confirmed again

- Card PNGs need `-loop 1 -framerate $FPS -t <dur>` or they flash for one frame.
- Filter concat, never the demuxer, when one input has a silent audio track.
- Text must be measured and shrunk to fit: Georgia Bold Italic at 60pt overflowed
  720px on the closing line, which is why `cards.py` has a `fit()` helper now.
- A counting marker drawn where a glyph already has a dot collides with it — Baa's
  gold marker became a ring around the letter's own dot instead.
- `nsfw` came back on one perfectly innocuous four-children-counting still. Not
  charged; rephrasing to a single child and "wholesome educational children's
  programme still" cleared it.
