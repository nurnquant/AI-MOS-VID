# 0036 V2 — Gemini Omni Flash

V1's presentation was rejected: "much better [voice], still do not like the whole
presentation." V1 is library stills plus burned captions. V2 is a different thing
entirely — **a father speaking directly to camera**, native audio, generated.

## Complete — four clips, 120 credits

`OUTPUT/0036-v2-youre-already-teaching-them-9x16.mp4` · **42.04 s** · 720x1280 ·
9.2 MB. Four generated clips plus the 2 s brand tag.

Clip 1 was generated alone first and approved — "this video and voice is perfect" —
before the other three were bought. **125.5 credits total on 0036**, balance 253.6
to 128.1.

**No captions in this version by request.** Caption design is being chosen
separately; see `caption-styles.png`.

## What clip 1 proves

- **The cut list is honoured exactly.** Requested a cut at 5.5 s; measured at 5.50.
  Same behaviour as 0034. Veo would not do this.
- **The character holds.** Passed the 0006 father as an `image_references` still, and
  the generated man is recognisably him — same face, beard, navy henley, same warm
  lamp-lit room. That matters because four clips have to look like one person.
- **No garbled pseudo-text**, which 0034 suffered from. The three-way prohibition
  in the prompt held this time.
- **Every word is correct.** Whisper on the delivered audio:

  > You think you're not teaching your child, Dean, you are, you just don't count it.

  "Dean" is whisper spelling "deen" — it is not an English word, so the model has
  no better guess. Word confidences 0.86 to 1.00 across the line.

## The one thing that needs an ear

Word timings show **"You" at 3.30 s and "are" at 5.86 s** — a 2.5 s gap inside
"You are", landing across the shot cut. It may read as a deliberate dramatic beat
or as the model hesitating. I cannot hear it; this needs a listen before three more
clips are bought in the same voice.

## Whisper now runs locally

`faster-whisper` is installed on this machine. Verification no longer depends on the
Higgsfield sandbox, and every future production can have its dialogue checked
properly rather than inferred.

## Remaining plan, if approved

| clip     | words | line                                                                                       |
| -------- | ----- | ------------------------------------------------------------------------------------------ |
| A (done) | 15    | You think you're not teaching your child deen. You are. You just don't count it.           |
| B        | 14    | Bismillah before you left the house. They heard it. Alhamdulillah when you were exhausted. |
| C        | 13    | You apologised when you were wrong. Dua out loud when the news was bad.                    |
| D        | 11    | They learn deen the way they learned to talk. From you.                                    |

Plus the existing 2 s brand tag. Finished length roughly 42 s — longer than V1's
25.8 s, because a person speaking to camera cannot be cut as tight as narrated
stills. If that is too long, the script needs cutting before the clips are bought,
not after.

## V3 — captions (2026-08-13)

Two versions built, no credits — all local.

- `OUTPUT/0036-v3-quiet-9x16.mp4` — **the recommendation**
- `OUTPUT/0036-v3-kinetic-9x16.mp4` — the comparison
- `compare.png` — same four moments, quiet on top, kinetic below

Both 42.04 s, no drift, checkvideo clean.

### The design, and the one call I reversed

Earlier I proposed a darkened hook card for the first 1.5 s. **That was wrong for
this film and I dropped it.** The scroll-stopper here is his face making eye
contact; dimming it at second one throws away the thing that was paid for.

What was built instead:

- **Hook text on screen from 0.00 s**, before he speaks. A muted viewer can read
  the claim before a word is said, which is where the scroll is won.
- **Soft bottom gradient, never a box.** The room stays visible.
- **Phrase chunks, not word-by-word.** Timed to whisper's word starts, so a chunk
  changes when he actually gets there.
- **One gold word per chunk** — teaching, deen, count, Bismillah, Alhamdulillah,
  apologised, Dua, way, From.
- **Helvetica Bold for captions, Georgia kept for the brand tag.** Serif is the
  print voice; sans wins at caption size in motion.
- **Rise and fade over 160 ms, ease-out, no bounce.**
- Nothing below y=1044, where the platform UI starts.

### Display text is authored, never transcribed

Timings come from whisper; the words do not. Whisper hears "deen" as "Dean" and
"Dua" as "Do I" because they are not English. Printing a transcript at a viewer
would have put both misspellings on screen in a video about the deen.

### Three faults found and fixed

1. **Chunks overlapped** — a caption was still up when the next arrived. Each is
   now clamped to the next one's start.
2. **`read` split the ffmpeg argument list on spaces**, so the overlay inputs
   collapsed to one token. One value per line fixes it.
3. **"BISMILLAH BEFORE YOU LEFT" ran off the right edge** in the kinetic version.
   The cause was measuring mixed case and rendering caps — caps are wider. The
   text is now uppercased _before_ wrapping, and the size auto-fits down until
   every row fits, because wrapping cannot save a single word wider than the
   column. Tightest margin is now 80 px.

Fault 3 is the useful one: it passed every duration and drift check and was only
visible by looking.
