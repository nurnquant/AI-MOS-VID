# 0038 — Ad Set 5 · notes

Delivered 2026-08-21. Five placement files plus ad copy. **0 credits.**

## What was actually wrong with the file

The ask was "make it 4K 4:5". **It already was** — 3277x4096, exactly the house
spec. Rather than reframe something that needed no reframing, the real defect
was found by looking: the PNG was RGBA with an alpha channel whose range was
255-255, meaning fully opaque and completely unused. 16.1 MB of PNG carrying a
dead channel.

Flattened to RGB and verified with a pixel difference — identical, not
approximately identical. 16.1 MB to 7.6 MB with nothing lost.

## Padding, not cropping — and why

Measured before deciding: the baked CTA occupies **y 3193-3767, or 78% to 92% of
height**, leaving 8% clear beneath.

Any crop toward 1:1 or 1.91:1 removes the child's face or the call to action.
So all non-native ratios are padded with a blurred zoomed copy of the artwork.
Nothing is cropped from any deliverable.

**The Stories bias is the part worth remembering.** With the artwork centred in
9:16, the baked text ended at 79.5% of frame height — inside the safe area by half
a percent, which is not a margin. Biasing the artwork up to 0.31 puts the text end
at 74%. That was computed from the measured text position, not eyeballed.

## Honest limits

- **The 1.91:1 is weak.** A 4:5 creative in a 1.91:1 frame leaves the artwork
  occupying about 40% of the width with blur either side. Usable, not good. If
  right column matters, it deserves a purpose-built horizontal creative.
- **The creative is text-heavy.** Meta no longer hard-rejects on the old 20% text
  rule, but heavy overlaid copy still suppresses delivery. If reach disappoints,
  the first test is a version with the two lines moved out of the image and into
  the ad's own headline and body fields.

## Copy

Three primary texts in `OUTPUT/CAPTION.md`, deliberately aimed at two different
people: the parent already committed and afraid of doing it badly, and the parent
who believes they are not qualified to start. Those convert at different costs and
which is cheaper cannot be guessed.

Every version front-loads its hook, because Meta truncates at about 125
characters — each one was checked against its actual preview text rather than
assumed.

Deliberately absent: any discount (the offer is already free, and urgency on top
of free reads as pressure), any outcome promise like "fluent in six months", and
any repeat of "A Joyful Companion for Life", which is already on the image.

## Still open

- **Style not named.** Closest to Style 5 Image Post, but that is an observation,
  not a record. You name it.
- Not published. No editor rating yet.
