# 0027 — Allah Made Everything (post image) · notes

**Produced** 2026-08-12 · image-set · 4 credits · $0.13 · style **5** (Image Post)

## Deliverables

| File                                                  | What                                      |
| ----------------------------------------------------- | ----------------------------------------- |
| `OUTPUT/0027-allah-made-everything-titled-1x1-4k.png` | the post — title, couplet, logo watermark |
| `OUTPUT/0027-allah-made-everything-clean-1x1-4k.png`  | same illustration, **no text**, for reuse |

Both **4096×4096**, resolution passed explicitly to `nano_banana_pro`.
1:1 at 4K is the house master — crops to 4:5, 16:9, 9:16 and 2:3 with no
upscaling via `scripts/social/reframe.py`.

The clean copy exists because a textless master is reusable: as a video start
frame, as a different post with different wording, or at another ratio where the
text would need re-laying out anyway.

## How the brief was met

Every element asked for is present: two children (girl in cream headscarf and
colourful dress, boy in mustard kurta), both pointing at different parts of
creation, child's-eye meadow, blue sky, fluffy clouds, sunshine, green hills,
wildflowers, butterflies, birds overhead, a stream, trees, a rabbit **and** a
lamb, distant mountains, and a faint crescent moon in a morning sky. Premium
preschool 3D-animated register.

**Text is composited locally, never generated.** `work/compose.py` renders the
title and couplet with Pillow over the clean illustration. The image model was
told to produce no lettering anywhere — it garbles text, and the brief's wording
had to be exact:

- Title `🌎 ALLAH MADE EVERYTHING 🌿` — Georgia Bold, emerald with a cream halo so
  it reads against pale sky without needing a heavy scrim. The two emoji are the
  brief's own, honoured rather than substituted.
- Couplet — Georgia Bold Italic on a cream panel, first line emerald, second gold.
- Small logo watermark bottom-left, per style 5.

**"I would not depict Allah in any form"** was pinned negatively in the prompt:
no divine figure, no human-like being in the sky, no glowing figure, no face in
the clouds or sun, no religious iconography. Allah is present only through
creation, as the brief requires. Verified by looking at the render.

## Fixes during composition

- The couplet panel first sat at 0.78 H and **buried the lamb**, an element the
  brief explicitly asked for. Moved to 0.845 H so both rabbit and lamb stay
  visible. Text placement must not delete briefed content.
- **The logo was sized wrong at first.** The asset is a 1024×1536 canvas whose
  artwork occupies only 1020×1415, so sizing the _canvas_ to 300px made the
  visible circle much smaller than 300 and it read as an accident. Now cropped to
  its opaque bbox and sized by the circle itself, with a soft drop shadow so gold
  stays crisp on bright grass.
- **Then it covered the rabbit.** Enlarged to 560px it sat straight on top of the
  rabbit — the same failure as the couplet panel and the lamb. The bottom-left
  corner is genuinely occupied in this composition, so the logo is 290px tucked
  tight into the corner: small, per the standing rule for image posts ("very very
  small, just a watermark"), and clear of both animals. Verified by cropping the
  bottom-left region and looking at it.
- **Apple Color Emoji is a bitmap face** and only rasterises at particular ppem
  sizes — 96px works with `embedded_color=True`, other sizes render blank or
  raise. So each emoji is drawn at 96 and scaled with LANCZOS. Checked before
  building, not after.

## Open

- Platform ratio exports not generated — one `reframe.py` run once ratios are named.
- No caption written yet.
- Relationship to **0026**, the same topic as a single-child illustration, is
  unresolved: 0026 may be the series master and 0027 the post, or one supersedes
  the other. The user's call.
