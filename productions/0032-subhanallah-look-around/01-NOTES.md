# 0032 — SubhanAllah, Look Around! · notes

**Produced** 2026-08-12 · image-set · 4 credits · $0.13 · style **5** (Image Post)
Built with `/riwaq-image-post`. Sixth in the run 0027 → 0028 → 0029 → 0030 →
0031 → 0032.

## Deliverables

Six files in `OUTPUT/` plus `CAPTION.md`: `1x1` 4096², `4x5` 3277×4096,
`2x3` 2731×4096, `16x9` 4096×2304, `9x16` 2304×4096, and the textless
`clean-1x1-4k` master.

## Checked against the index first, and it mattered

The skill's new "check `INDEX.md` before starting" step caught the collision
immediately: **0027 "Allah Made Everything"** is a child taking in creation — wide
landscape, sky, mountains, river. A default reading of "SubhanAllah, Look Around!"
would have produced almost the same picture.

So this one is inverted: **look closer, not wider.** Camera at grass level, one
ladybird under a magnifying glass, four steps from the back door. No mountains, no
vista, no big sky — all three pinned negatively in the prompt.

The caption carries the argument that justifies the inversion: **SubhanAllah does
not mean "how big", it means "how perfectly made"** — which makes a snail's spiral
and a dew-beaded web better evidence than a mountain. The parenting instruction
follows from it and costs nothing: when your child stops, stop with them.

## The `nsfw` filter, third false positive

The first attempt described the girl "lying propped on her elbows, chin low near
the ground" — the natural posture for looking at something on the floor. It came
back `nsfw`. **Not charged.** Rewriting the posture as **crouching on her knees,
sitting upright on her heels, leaning forward** passed immediately with everything
else unchanged.

Pattern across three hits (0024, 0026, 0032): the filter reacts to **a child's
body described as lying, reclining or low to the ground**, and to photoreal
children. Describe children **upright — standing, sitting, kneeling, crouching** —
and it passes. Worth carrying into the skill.

## Crop biases

```
--override "4x5.bias=0.35,2x3.bias=0.32,16x9.bias=0.30,
            16x9.couplet_y=0.760,16x9.couplet_x=0.030,16x9.couplet_w=0.340"
```

The small wonders are spread left (web, snail) and bottom-right (ant, beetle), with
the girl centred, so the side crops are biased slightly left to protect the web and
snail. **No retune round was needed** — first placement was correct in all five,
the first time that has happened.

## Verified

All five ratios opened and looked at. Every briefed element present in each except
where noted below; no text clipped; logo on the plain pale path, clear; title
legible against bright bokeh thanks to the cream halo; 🐞 strong, 🔍 acceptable
though the palest emoji used so far — watched deliberately after the 0028 and 0031
lessons.

Known and accepted, both `16x9` only: the ant and beetle crop out, and the snail is
cut at the bottom edge. Landscape from a square loses the ground line; the ladybird,
web and the girl all survive, which is the point of the post.

## Open

- No editor rating — not given, never invented.
- Unpublished. **Six finished posts now waiting**: 0027–0032.
- Caption notes say not to post 0027 and 0032 adjacent.
