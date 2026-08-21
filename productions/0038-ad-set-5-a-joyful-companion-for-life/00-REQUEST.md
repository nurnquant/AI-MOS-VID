# Ad Set 5 — A Joyful Companion for Life

_Production 0038 · type: image-set · supplied artwork, 2026-08-21_

## Request

The user supplied a finished 4K ad creative and asked for it "optimized for Meta
ads for every device", plus ad copy that resonates.

No image was generated. This production is **finishing work on supplied
artwork**: format conversion, per-placement reframing, and copywriting.

## Source

`source/riwaq_al_ilm_addset_5.png` — 3277x4096, supplied untouched.

It arrived **already 4:5 at 4K**, which is the house spec, so the original ask
("make it 4K 4:5") needed no reframing at all. What it did need was flattening:
it was RGBA with a **fully opaque alpha channel**, doubling the file size for
nothing and risking odd handling on ad platforms. `work/0038-master-4x5-4k-rgb.png`
is the flattened master, verified pixel-identical to the source.

## The constraint that shaped everything

**The call to action is baked into the artwork at 78-92% of image height**, with
only 8% of clear space beneath it.

That rules out cropping. Any crop to a squarer or wider ratio costs either the
child's face or the CTA. So every placement that is not natively 4:5 is built by
**padding with a blurred, zoomed copy of the artwork** — nothing is cut from any
version.

For Stories and Reels the artwork is additionally **biased upward** so the baked
text ends at 74% of frame height. Centred, it would have landed at 79.5%, right
on the edge of the bottom-20% band the platform covers with its own UI.

## Deliverables

| file                                    | placement                                         |
| --------------------------------------- | ------------------------------------------------- |
| `0038-feed-4x5-4K-3277x4096.jpg`        | upload master — Meta downsizes better than we can |
| `0038-feed-4x5-1080x1350.jpg`           | FB and IG feed, most mobile real estate           |
| `0038-feed-1x1-1080x1080.jpg`           | Feed, Marketplace, Search, Explore                |
| `0038-stories-reels-9x16-1080x1920.jpg` | Stories and Reels                                 |
| `0038-rightcolumn-1.91x1-1920x1005.jpg` | Right column, Search, Audience Network            |

All sRGB, progressive JPEG, quality 90, well under Meta's 30 MB, minimum edge
1080 or better.

`OUTPUT/CAPTION.md` holds three primary texts, five headlines, five descriptions
and the reasoning for testing them against each other.

`work/_preview-all-placements.png` shows all four reframes side by side with the
Stories UI zones marked.

## Cost

**Zero credits.** Supplied artwork, everything local.
