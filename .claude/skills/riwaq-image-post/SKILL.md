---
name: riwaq-image-post
description: Produce a Riwaq Al Ilm children's image post from a brief — 4K animated illustration via nano_banana_pro, brand type composited locally with Pillow, logo, every platform ratio, caption, and tracking. Use for any image-post request (style 5), and read it before spending credits on a nano_banana_pro image.
---

# Riwaq image post

The pipeline that produced **0027 Allah Made Everything**, which the user
accepted. Follow it in order; each step exists because skipping it broke
something real.

Illustration costs **4 credits** (~$0.13) at 4K. Everything else is local and free.

## 1. Intake the brief

```bash
python3 scripts/social/productions.py --intake
python3 scripts/social/productions.py --rename 0027 --title "Proper Title"   # if the slug is poor
python3 scripts/social/productions.py --set 0027 --style 5 --status in-progress
```

Intake reads the title from a `#` heading, a `TITLE:` line, or a short first
line. A one-line brief or one that opens with prose gets a bad slug — fix it with
`--rename`, don't hand-edit the registry and folder.

## 2. Generate the illustration — textless, 4K, animated

```
model:       nano_banana_pro
aspect:      1:1          (square 4K crops to every platform ratio, no upscaling)
resolution:  4k           ← PASS THIS EXPLICITLY
```

**Always pass `resolution: "4k"`.** It silently defaults to `1k`. That default is
where the rejected 0024's soft footage came from.

**Animated, not photoreal**, for children's content. Two reasons, both evidenced:
the user rejected a photoreal children's production and accepted an animated one,
and photoreal-child prompts trip the `nsfw` filter (twice now, both false
positives, neither charged) while animated prompts pass clean.

Three things every prompt must carry:

1. **No text.** `ABSOLUTELY NO text, NO letters, NO words, NO writing, NO numbers,
NO calligraphy, NO signage anywhere in the image.` The model garbles lettering
   and Arabic especially. All type is added in step 3. Also kill readable text in
   set dressing — ask for geometric patterns and children's paintings on walls,
   never alphabet charts.
2. **No depiction of Allah.** Pin it negatively: no divine figure, no human-like
   being in the sky, no glowing figure, no face in the clouds or sun, no religious
   iconography. Allah is present only through creation.
3. **Clean space where type will go.** Ask for generous sky or wall across the top
   third, AND explicitly for a **deliberately uncluttered lower-left corner** —
   "plain floor or rug only there, no objects, no animals in that corner". On 0028
   that one sentence meant the logo landed on clear ground first try; on 0027,
   without it, the logo sat on the rabbit and needed reworking.

If the brief does not say animated or photoreal and it matters, generate **both**
at 4K (8 credits) rather than blocking on a question — then let the user choose.

**Describe children UPRIGHT.** Three `nsfw` false positives so far (0024, 0026,
0032), none charged. The pattern: the filter reacts to a child's body described as
**lying, reclining or low to the ground**, and to photoreal children. 0032's first
attempt said "lying propped on her elbows, chin low near the ground" — the natural
posture for examining something on the floor — and was refused; **crouching on her
knees, sitting upright on her heels, leaning forward** passed with nothing else
changed. Standing, sitting, kneeling and crouching are all safe. Adding "wholesome
educational children's programme illustration" also helps.

## 3. Compose the type locally

```bash
python3 .claude/skills/riwaq-image-post/scripts/postkit.py \
  --base productions/0027-*/work/base-1x1-4k.png \
  --out  productions/0027-*/OUTPUT \
  --prefix 0027-allah-made-everything \
  --title "ALLAH MADE EVERYTHING" \
  --emoji-left "🌎" --emoji-right "🌿" \
  --line1 "The sun and moon, the birds and trees —" \
  --line2 "Allah made them all for us to see!" \
  --ratios 1x1,4x5,2x3,16x9,9x16 \
  --also-clean
```

Writes one file per ratio plus a textless master. `--also-clean` is worth it: a
textless square is reusable as a video start frame or re-lettered later.

Design, fixed by the accepted 0027:

| Element | Treatment                                                                                            |
| ------- | ---------------------------------------------------------------------------------------------------- |
| Title   | Georgia Bold, emerald, **cream halo** rather than a scrim — a dark scrim kills a bright illustration |
| Emoji   | the brief's own, honoured not substituted                                                            |
| Couplet | Georgia Bold Italic on a cream panel; line 1 emerald, line 2 gold                                    |
| Logo    | official mark, **bottom-left**, small — "very very small, just a watermark"                          |

## 4. Ratios and why each is framed that way

| Ratio | Size      | For                         | Framing                                                   |
| ----- | --------- | --------------------------- | --------------------------------------------------------- |
| 1:1   | 4096²     | Facebook · Instagram square | as generated                                              |
| 4:5   | 3277×4096 | Instagram feed              | sides cropped, biased so edge content survives            |
| 2:3   | 2731×4096 | Pinterest                   | sides cropped, same bias                                  |
| 16:9  | 4096×2304 | Facebook feed · X           | top/bottom cropped, and the couplet moves to the **side** |
| 9:16  | 2304×4096 | TikTok · Reels · Stories    | **padded, not cropped**                                   |

- **Never crop the finished titled square** into other ratios. Its type is laid out
  for a square; cropping clips the title and knocks the logo off its corner.
  Always re-compose from the clean base.
- **9:16 is padded.** A square cropped to 9:16 loses whatever sits at the left and
  right edges — in 0027 that was a child and both animals. The full illustration
  sits sharp over a blurred fill of itself, type in the bands.
- **9:16 type stays above ~0.75 height.** TikTok and Reels overlay caption and
  buttons across the bottom fifth.
- **16:9 is the awkward one.** Cropping a square to landscape throws away most of
  the frame, so check what the crop deletes and move the couplet off the subject.
- **Crop bias is a property of the COMPOSITION, not of the ratio.** The defaults
  were tuned on 0027, whose subjects sit low. On 0029, whose heads sit high and
  whose second subject sits at the right edge, the inherited 16:9 bias put the
  title through a child's head, and the 2:3 bias cropped a whole briefed act out
  of frame. Retune per image with `--override` — never edit the defaults to suit
  one picture:

```bash
--override "16x9.bias=0.40,16x9.couplet_y=0.735,16x9.couplet_x=0.575,2x3.bias=0.55"
```

Keys: `bias`, `title_y`, `couplet_y`, `couplet_w`, `couplet_x`, `logo_frac`.
Higher `bias` moves a crop-x window right and a crop-y window down.

## 5. Verify by looking — this is not optional

Brand furniture that covers briefed content is a **defect**, and it happened three
times while making 0027:

- the couplet panel buried the lamb the brief asked for
- the logo, once sized properly, sat straight on the rabbit
- the 16:9 crop removed both animals entirely and the panel covered both children

So: open every output, and for the busy corners crop and enlarge the region.

```bash
python3 - <<'PY'
from PIL import Image
im = Image.open("productions/0027-*/OUTPUT/0027-...-1x1-4k.png")
im.resize((900, 900), Image.LANCZOS).save("/tmp/check.png")       # whole frame
im.crop((0, 3000, 1700, 4096)).save("/tmp/check-corner.png")      # logo corner
PY
```

Check: every briefed element still visible · no text clipped at an edge · logo
clear of subjects · title legible against what is behind it · **emoji visible
against the actual background, judged SMALL** — 0028's 🤍 white heart vanished on a
peach wall, and 0031's 🐦 read as a smudge at thumbnail size. Both were swapped
(🌸, 🌅). Prefer saturated, high-contrast glyphs; avoid white, pale and small-detail
ones.

**Before starting, check the topic against what already exists.** 0031
"Alhamdulillah Every Day" would have duplicated 0028 "Thank You, Allah", so it was
separated on three axes — morning not evening, standing not kneeling, the daily
repeat rather than counting today's blessings — and the caption notes say not to
post the two back to back. Read `productions/INDEX.md` first.

Also worth a look: the model sometimes lays a flat band across the top quarter
with a hard seam (0028 had one at exactly y=1024). It is not a ceiling, but it
makes usable title space and reads as a header band once type sits in it — judge
whether to keep it before spending 4 credits on a re-roll.

## 6. Caption

Write `OUTPUT/CAPTION.md` with a section per platform. What worked on 0027:
**Captions are PLAIN TEXT. No markdown, ever.** Facebook, Instagram, TikTok and X do
not render `**bold**` or `_italic_` — they print the asterisks and underscores
literally. Carry emphasis with line breaks, the occasional CAPITALISED word, and
emoji. This applies to everything inside a caption block; the `##` section headers
that organise `CAPTION.md` itself are fine, because nobody pastes those.

- **A concrete action, not a sentiment.** "On your next walk let them pick one
  thing and say Alhamdulillah" is repeatable tomorrow — that is what gets saved
  and shared rather than just liked.
- **A tiny engagement ask.** "Tell us the smallest thing" is easier to answer than
  an open question, and every answer is a proud-parent moment.
- **Pinterest is a search engine** — write search text leading with the topic,
  not a caption.
- **X short, TikTok shortest.** Free trial CTA and `riwaqalilm.com/free-trial` on
  the long-form ones; "link in bio" for Instagram.

## 7. Track it

```bash
python3 scripts/social/productions.py --set 0027 --style 5 --status delivered
```

Then add a `ProductionCost` row in `costTracker/social-media-tracker.xlsx`
(header on row 3; back the file up first; put the production number in `ID`), and
write `01-NOTES.md` recording cost, what was verified, and anything left open.

**Never invent a rating.** "Accepted" or "looks nice" is not a 1–5 score — leave
`ratings.editor` null until the user gives a number. Never scan live social
accounts; platform records come only from what the user states.

## Related

- `library/STYLES.md` — style 5 spec, and the hard rule that a **song or rhyme
  needs real sung vocals**, which cannot be generated here
- `PRODUCTION-STANDARD.md` — numbering, folders, path hygiene
- `scripts/social/reframe.py` — generic reframing for images that need no type
