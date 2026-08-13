# 0031 — Alhamdulillah Every Day · notes

**Produced** 2026-08-12 · image-set · 4 credits · $0.13 · style **5** (Image Post)
Built with `/riwaq-image-post`. Fifth in the run 0027 → 0028 → 0029 → 0030 → 0031.

## Deliverables

Six files in `OUTPUT/` plus `CAPTION.md`: `1x1` 4096², `4x5` 3277×4096,
`2x3` 2731×4096, `16x9` 4096×2304, `9x16` 2304×4096, and the textless
`clean-1x1-4k` master.

## The brief, and how it avoids repeating 0028

Concept only from the user. **0028 "Thank You, Allah" already covers gratitude** —
evening, indoor, still, a child on a prayer mat, and a bedtime "three things"
habit. Producing another gratitude post risked two near-identical pieces.

So this one is separated on three axes, deliberately:

|         | 0028                          | 0031                                      |
| ------- | ----------------------------- | ----------------------------------------- |
| Time    | evening, sunset               | **morning, sunrise**                      |
| Posture | kneeling, still, hands cupped | **standing, arms wide, stretching**       |
| Idea    | count today's blessings       | **the daily repeat, including hard days** |

The caption carries the actual argument: alhamdulillah is a **daily** word, not a
celebration word, and saving it for good news teaches children it means "things
went my way" — so they stop saying it when life turns. That reframe is the post;
the picture is just the morning it happens on.

The scene is deliberately uneventful. He woke up. Nothing else happens.

## First try, no re-roll

Prompt rules held: no text, **no numbers** (pinned explicitly, since a bedroom
invites clocks and calendars), no divine depiction, clear plain wall across the top
third, and an uncluttered lower-left corner where the logo landed clean.

## Fixed during composition

- **16:9 couplet panel covered the two birds** on the windowsill. Moved down
  (`couplet_y` 0.63 → 0.77) so the birds sit clear above it.
- **🐦 read as a smudge** at thumbnail size against a cream wall — a dark, small,
  low-contrast glyph. Swapped for **🌅**, which is saturated and ties to the window.
  Second time an emoji has failed the contrast check (0028's 🤍 was the first), so
  the rule is holding its value: **choose emoji against the actual background, and
  look at them small.**

## Crop biases, set from this composition

Boy centred, window and birds at the left, bed at the right:

```
--override "4x5.bias=0.45,2x3.bias=0.35,16x9.bias=0.50,
            16x9.couplet_y=0.770,16x9.couplet_x=0.030,16x9.couplet_w=0.340"
```

`2x3` biased left this time — the opposite of 0030 — because here the content
worth keeping (birds, window, sunrise) is on the left. Third consecutive
production confirming that bias follows the composition, not the ratio.

## Verified

All five ratios opened and looked at, twice — before and after the bird fix and
the emoji swap. Every briefed element present in each ratio, no text clipped, logo
clear on plain floor, title legible on the wall, both emoji readable small.

Known and accepted: `16x9` crops out the slippers, and in `1x1`/`4x5` the couplet
panel sits just below them. The slippers are scene-dressing, not the point.

## Open

- No editor rating — not given, never invented.
- Unpublished. **Five finished posts now waiting**: 0027, 0028, 0029, 0030, 0031.
- Caption notes say not to post 0028 and 0031 back to back; space them out.
