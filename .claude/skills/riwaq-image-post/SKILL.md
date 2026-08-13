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
3. **Clean space where type will go.** Ask for generous sky at the top and clear
   space along the bottom edge, or the title has nowhere to sit.

If the brief does not say animated or photoreal and it matters, generate **both**
at 4K (8 credits) rather than blocking on a question — then let the user choose.

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
clear of subjects · title legible against what is behind it.

## 6. Caption

Write `OUTPUT/CAPTION.md` with a section per platform. What worked on 0027:

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
