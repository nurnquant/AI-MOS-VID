# 0030 — Bismillah Before I Begin · notes

**Produced** 2026-08-12 · image-set · 4 credits · $0.13 · style **5** (Image Post)
Built with `/riwaq-image-post`. Fourth in the sequence 0027 → 0028 → 0029 → 0030.

## Deliverables

Six files in `OUTPUT/` plus `CAPTION.md`: `1x1` 4096², `4x5` 3277×4096,
`2x3` 2731×4096, `16x9` 4096×2304, `9x16` 2304×4096, and the textless
`clean-1x1-4k` master.

## The brief

Concept only from the user. Angle chosen: **the pause**, not the phrase. Bismillah
as a _starting_ word rather than a food word — deliberately distinct from **0019
"Bismillah Before We Eat"**, which already covered meals. The two cross-promote
rather than overlap.

Everything in frame is **pre-action**, which is the whole idea: the book is closed
with her hands resting on it, the milk untouched, the pencils lined up unused, the
satchel packed and standing, the shoes still by the door. Written into
`00-REQUEST.md` before generating, including the explicit "the book stays closed"
constraint.

## First try, no re-roll

The skill's prompt rules held again:

- No text anywhere — the book cover came back genuinely blank, which is worth
  noting because a book is the object most likely to get spurious lettering. It
  was pinned three ways: no text globally, "the book cover is completely plain and
  blank", and plain walls.
- No divine depiction.
- Clear plain wall across the top third for the title.
- **Uncluttered lower-left corner** — plain floorboards, logo landed clean.

## Crop biases, set from this composition

The subject sits **right of centre** with the window at the left, so the inherited
defaults (tuned on 0027, subject centred low) would have cut her. Set up front
rather than discovered after:

```
--override "4x5.bias=0.45,2x3.bias=0.50,16x9.bias=0.50,
            16x9.couplet_y=0.700,16x9.couplet_x=0.055"
```

- `4x5` / `2x3` biased right so the girl, satchel and shoes all survive.
- `16x9` bias 0.50 keeps her head clear of the title band; the couplet moved to
  the **left** this time — the opposite side from 0029 — because here the subject
  sits right and the free space is left. Confirms the rule: side placement follows
  the composition, not a convention.

## Verified

All five ratios opened and looked at. Every briefed element present in each, no
text clipped, logo clear of subjects on plain floor, title legible on the wall,
and both emoji (🤲 🌟) saturated enough to read against a cream wall — the 0028
white-heart lesson applied at the choosing stage rather than after rendering.

Known and accepted: in `1x1` and `4x5` the couplet panel covers the lower half of
the satchel. The bag is still clearly a packed bag — strap, buckle and pencils
visible above the panel — so it reads. Any bottom-centre panel would do this;
moving it would push it onto the logo.

## Open

- No editor rating — not given, never invented.
- Unpublished. Now four accepted-or-delivered posts waiting: 0027, 0028, 0029, 0030.
