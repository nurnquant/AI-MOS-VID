# 0043 — Morning & Evening Adhkar, 7 cards · notes

Delivered 2026-08-24. **Seven 1080x1350 cards. Zero credits.**
From idea [I031](../../ideas/I031-morning-evening-adhkar-7-posts.md).

## Nothing was retyped

The Arabic, transliteration and translation are **parsed straight out of the
user's source document** by `work/render.mjs` reading `work/cards.json`, which is
generated from the markdown. No human or model retyped a single graded Arabic
passage.

Verified afterwards, codepoint by codepoint: **all 21 strings — seven Arabic,
seven transliterations, seven translations — appear verbatim in the source.
329 harakat in total.**

## Rendered through a browser, and that is not a preference

The source document says: "do not rely on AI image/video models to generate
Arabic." Correct, and there is a second half to it — **Pillow cannot do it
either.** This machine has no libraqm, so Pillow silently drops every harakat; a
voweled and a stripped string render to identical images. That was measured on
0039, not assumed.

**All 329 harakat here exist because a browser placed them.** No image model went
near the Arabic.

## Design

Deep emerald ground with a soft gold glow, a thin gold frame with corner marks,
the series kicker and a **day counter** at the top — the counter is what makes
seven posts a series rather than seven posts.

Then Arabic, transliteration in gold italic, English, and a footer carrying the
source reference and the wordmark with the primary signature 🌿📖🌙✨.

**Type sizes adapt to length.** Post 7, Sayyid al-Istighfar, is ten times post 1
— 293 Arabic characters against 30. A fixed size would either shrink post 1 to
nothing or overflow post 7. Every card is checked for overflow at render time and
all seven report 0 px.

**The first pass was top-heavy** — content pinned to the top with a void above
the footer, and type far smaller than the space allowed. Arabic went from 74 px
to 92 px at the short end, the block is now vertically centred and the footer
pinned. Only visible by looking at the sheet.

## The gate that has not moved

**These have not been reviewed by anyone qualified.** I031 flagged it, the source
document asks for it in its own production notes, and it is still outstanding:
Arabic, transliteration, translation, repetition counts, context and sources all
need a human check before publishing.

The cards being correct against the _supplied document_ is not the same as the
document being correct. This production verified the first and cannot verify the
second.

## Still open

- Scholarly sign-off on all seven.
- Style not named.
- **The captions in the source use markdown bold**, which platforms print
  literally. They need flattening to plain text before posting — not done here,
  because the caption file has not been written yet.
- No video. Images only, as asked.
