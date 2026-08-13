# 0026 — Allah Made Everything · notes

**Produced** 2026-08-12 · image · 4 credits · $0.13 · **no style recorded yet**

## Deliverable

`OUTPUT/0026-allah-made-everything-1x1-4k.png` — **4096×4096**, RGB, 27 MB.

Real 4K, explicitly requested. Worth stating because the rejected 0024 silently
used the 1k default; resolution is now always passed, never left to default.

1:1 square at 4K is the house master format — it crops to every platform ratio
with no upscaling: 4:5 → 3277×4096, 16:9 → 4096×2304, 9:16 → 2304×4096,
2:3 → 2731×4096. Use `scripts/social/reframe.py`.

## What it is

Bright 3D-animated children's illustration: a young Muslim girl in a beige
headscarf and emerald dress on a green hill, arms open, looking up in wonder.
Around her the whole of creation — sun, rainbow, clouds, birds, butterflies, a
bee, snow-capped mountains, a river to the sea, palms, flowers, a cat, a rabbit,
and stars with a crescent moon above.

**No text baked in**, deliberately. All text is Pillow-composited locally; AI
renders Arabic garbled and English unreliably.

## Two variants were attempted

The one-line brief did not say animated or photoreal, and that is a materially
different picture, so both were submitted at 4K (8 credits total) rather than
blocking on a question.

- **Animated — delivered.** Also the right register for the topic and for the
  3–8 audience, and consistent with the CoComelon reference the user has since
  given for this series.
- **Photoreal — blocked.** Returned `nsfw`, a false positive. **Not charged.**
  Second time a photoreal-child prompt has tripped this filter (0024's
  counting still was the first) while animated prompts pass cleanly. Worth
  knowing: the animated register is not only a taste call, it is the one that
  reliably gets through.

## Open

- **Style not recorded.** The brief names none, and style 7 is rejected, so this
  is left null rather than guessed. Needs a decision before it becomes a post:
  as a plain illustration it is finished; as a **style 5 Image Post** it still
  needs the hook line, CTA and bottom-left logo watermark.
- Platform ratio exports not generated — one `reframe.py` run when the ratio is
  known.
- The brief is one line. If this is meant to be the next rhyme in the series
  (0023 Season 1 lists "Allah Made the Moon and Stars"), it needs lyrics and,
  per `library/STYLES.md`, a resolved source for **sung** vocals before any
  video is attempted.
