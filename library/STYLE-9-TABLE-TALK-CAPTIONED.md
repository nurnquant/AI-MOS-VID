# Style 9 — Table Talk Captioned · the recipe

**Say "Table Talk Captioned" or "Style 9".**

[Style 8 — Table Talk](STYLE-8-TABLE-TALK.md) with burned captions. Everything in
the Style 8 recipe still applies; this file only covers the caption layer.

First use: **0036 V3**, editor **4.5/5**.

> **On the numbering.** A caption layer is not really a finishing style — it
> composes with any of them, and `captions.py` will drop onto Style 1 or 2
> unchanged. It gets a number because the registry records exactly one style per
> production and 0036 now ships captioned. If captions are ever wanted on another
> style, port the layer rather than minting Style 10, 11, 12.

---

## Two variants, both built

|             |                                                                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **kinetic** | Avenir Next Condensed, ALL CAPS, no gradient, 4 px halo. Louder, higher reach, fights a quiet performance. **What 0036 shipped.** |
| **quiet**   | Helvetica Bold, sentence case, soft bottom gradient. Calmer, closer to the film's tone.                                           |

```bash
python3 captions.py kinetic          # render the PNG sequences
bash overlay-captions.sh kinetic     # burn them in and rebuild
```

## The rules

**1. Timing from whisper, words from the author.** Take word start times from the
transcript and nothing else. Whisper hears "deen" as _Dean_ and "Dua" as _Do I_
because they are not English words — printing its transcript would have put both
misspellings on screen in a video about the deen. **Never show a viewer a
transcript.**

**2. Phrase chunks, not word-by-word.** Karaoke pops measure well on Reels and
fight a person speaking softly. Four to six words, changing when he reaches them.

**3. One gold word per chunk.** The word the sentence turns on — _teaching, deen,
count, Bismillah, Alhamdulillah, apologised, Dua, way, From_. Everything else
cream. That is where the emphasis lives, so the type never has to shout.

**4. First chunk pinned to 0.00 s.** Before he speaks. A muted viewer must be able
to read the claim before a word is said, or the scroll is already gone.

**5. Clamp every chunk to the next one's start.** Two captions on screen at once
is the fastest way to make a frame unreadable.

**6. Never below y=1044.** Reels and Stories cover the bottom fifth.

**7. Gradient, never a slab box.** The face and the room are the product. A box is
a wall across the frame — that was V1's mistake and it is what the user rejected.

**8. Rise and fade over ~160 ms, ease-out, no bounce.** Bouncing type belongs to a
different kind of video.

**9. Uppercase BEFORE measuring.** Caps are wider than mixed case. Measuring one
and rendering the other pushed "BISMILLAH BEFORE YOU LEFT" clean off the right
edge, and it passed every duration and drift check — it was visible only by
looking. The size now auto-fits down until every row fits, because wrapping
cannot save a single word wider than the column.

**10. Burn per clip, before the join.** Chunk times in `plan.json` are relative to
their own clip. Burning after the join means re-deriving every time against a
running total, and getting it wrong once.

## Audio, when captions are added

Nothing changes from Style 8 except that these two are now non-negotiable, both
because the user heard them before any measurement did:

- **Continuous bed under the whole film.** Each generated clip brings its own room
  tone; 0036 stepped 17 dB at one join.
- **Duck the bed, do not just lower it.** Sidechain to the voice —
  `sidechaincompress=threshold=0.03:ratio=9:attack=12:release=420`. A bed quiet
  enough never to cover a word is too quiet to bridge the joins.

## Brand furniture

**Watermark stops before the end card** — standing rule, every style. See
[PRODUCTION-STANDARD.md](../PRODUCTION-STANDARD.md).

## Files

Living in `productions/0036-youre-already-teaching-them/work/v2/`, to be lifted
into a skill once a second production uses them:

| file                  | does                                                       |
| --------------------- | ---------------------------------------------------------- |
| `captions.py`         | authors chunks, renders PNG sequences against `words.json` |
| `overlay-captions.sh` | burns a set onto the clips, rejoins, mixes, watermarks     |
| `words.json`          | whisper word timings per clip                              |
| `compare.png`         | kinetic against quiet, same four moments                   |
