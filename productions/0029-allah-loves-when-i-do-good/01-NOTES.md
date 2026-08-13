# 0029 — Allah Loves When I Do Good · notes

**Produced** 2026-08-12 · image-set · 4 credits · $0.13 · style **5** (Image Post)
Built with `/riwaq-image-post`. Third in the sequence 0027 → 0028 → 0029.

## Deliverables

Six files in `OUTPUT/` plus `CAPTION.md`: `1x1` 4096², `4x5` 3277×4096,
`2x3` 2731×4096, `16x9` 4096×2304, `9x16` 2304×4096, and the textless
`clean-1x1-4k` master.

## The brief

Concept only from the user. Angle chosen: good character at a child's scale —
one act a five-year-old could do this afternoon, not "be a good Muslim" as an
abstraction. Two acts in frame so a parent has two ways in: a boy giving **half**
his orange to a smaller child, and a girl setting down water for a kitten.

Written into `00-REQUEST.md` before generating, including a constraint the concept
implied but did not say: **nothing that reads as commerce** — no coins, no money
boxes, since charity imagery drifts there easily.

## First try, clean

The illustration needed no re-roll. The skill's prompt rules did their job: no
text anywhere, no divine depiction, generous sky across the top third, and a
**deliberately uncluttered lower-left corner** — the logo landed on plain grass
with nothing to collide with.

## Two ratios needed retuning, and the skill gained a feature

The layout defaults were tuned on 0027, whose subjects sit low and whose animals
sit at the very bottom. This composition is different: heads are high, and the
second act sits at the right edge. So:

- **16:9** — at the inherited bias `0.80` the title crossed the standing boy's
  head and the couplet panel covered the kitten and its bowl. Retuned to
  `bias=0.40`, couplet down and right (`0.735`, `0.575`): title now sits in clear
  sky above the heads, kitten visible.
- **2:3** — at bias `0.20` the girl and the kitten were **cropped out entirely**,
  losing the second good deed. Retuned to `bias=0.55`, which keeps both acts at
  the cost of clipping a little of the smallest child's back. Worth it.
- 1:1, 4:5 and 9:16 were correct on the defaults.

Rather than hardcode this image's numbers over the last one's, `postkit.py` gained
a **`--override`** flag:

```bash
--override "16x9.bias=0.40,16x9.couplet_y=0.735,2x3.bias=0.55"
```

Keys: `bias`, `title_y`, `couplet_y`, `couplet_w`, `couplet_x`, `logo_frac`. The
defaults stay as a sane starting point; per-image tuning is now a flag rather than
an edit. **This is the general lesson: crop bias is a property of the composition,
not of the ratio.**

## Verified

All five ratios opened and looked at, before and after retuning. Checks: both
kind acts present in every ratio, no text clipped, logo clear of subjects, title
legible, emoji visible against the real background (🌟 and 💛 both read against
sky; the 🤍 lesson from 0028 applied when choosing them).

Known and accepted: in **16:9 only**, the water bowl is partly behind the couplet
panel. The kitten and the act still read.

## Open

- No editor rating — not given, never invented.
- Unpublished.
- Sequence: 0027 creation → 0028 gratitude → 0029 character. Worth posting in that
  order.
