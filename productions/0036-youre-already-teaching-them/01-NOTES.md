# 0036 — You're Already Teaching Them

Delivered 2026-08-13. `OUTPUT/0036-youre-already-teaching-them-9x16.mp4`
21.5 s · 9:16 · 720x1280 · 8.2 MB · **0 credits, $0.00**

From idea [I001](../../ideas/I001-youre-already-teaching-them.md). First
parent-facing video in the library, and the first built entirely from footage
already paid for.

## What it cost, and why that is the point

Nothing. Every shot was generated for an earlier production and reused; the
voice is local TTS; the piano was rendered locally for 0022; the brand tag and
watermark came from 0035.

The benchmark is [0006](../0006-dream-of-every-parent/) — the only other
parent-facing video, at **214 credits / $7.06** for editor 5/5 and **visitors
3.5/5**. If 0036 lands anywhere near that, the format is proven at zero marginal
cost and episodes 2-5 become cheap. If it lands well below, the question is
answered for the price of an afternoon.

## The cut

Driven by the **measured** voiceover, not guessed timings: each segment is its
line's real duration plus a breath. Change a line and `build.sh` re-times the
whole thing from `vo/NN.wav`.

| #   | Line                                                    | Shot                   | From               |
| --- | ------------------------------------------------------- | ---------------------- | ------------------ |
| 1   | You think you're not teaching your child deen.          | father, pensive        | 0006 clip4-closeup |
| 2   | You are. You just don't count it.                       | father, sleeping child | 0006 clip1-hook    |
| 3   | Bismillah before you left the house. They heard it.     | stepping out a doorway | 0022 n3-steps      |
| 4   | Alhamdulillah when you were exhausted.                  | father alone at night  | 0006 clip2-table   |
| 5   | You apologised when you were wrong.                     | father and son, close  | 0006 clip5-tug     |
| 6   | Dua out loud when the news was bad.                     | adult hands raised     | 0022 n1-hands      |
| 7   | They learn deen the way they learned to talk. From you. | child's hands raised   | 0008 dua           |
| tag | Episode 2 card                                          | brand tag              | 0035               |

**Shots 6 and 7 are a deliberate rhyme** — adult hands in dua, then a child's
hands in the same position. The close argues that the child copies what they
saw, so the edit shows it rather than saying it.

## Script change, and why

The brief said _"Bismillah before the car."_ There is no car footage in the
library, and the nearest honest match is a man stepping out of a doorway. The
line became **"Bismillah before you left the house."** Same mundane moment, same
point, and it matches what is actually on screen. Recorded here rather than
quietly swapped.

## Muted-first

Every spoken line is burned in and the hook is legible at 1.5 s. Facebook
autoplays muted; an argument that exists only in the audio does not exist for
most viewers. Captions are Pillow composites — the host ffmpeg has no drawtext.

Text never drops below y=1050, because Reels and Stories put their own furniture
over the bottom fifth.

## Three faults found and fixed during the build

1. **Audio ran 2.7 s short of picture.** `amix duration=first` ended the mix
   with the last voice line. Now `longest`.
2. **The brand tag was silent** — the exact fault 0014 shipped with. Inside the
   mix graph, `-stream_loop` quietly stopped short. The bed is now rendered to
   length in its own pass and its duration is asserted against the picture.
3. **The bed was inaudible even when present.** 0021's `piano-raw.wav` sits at
   -44 dB, so at 0.13 gain it measured as there and could not be heard. Switched
   to 0022's mastered `music-piano.m4a` at -31 dB, 64 s, long enough to need no
   loop at all.

Only the third would have survived measurement — it is the kind of fault that
passes every check and fails the only test that matters.

## Verification

`checkvideo.py`: no hard problems. 21.50 s, v=21.50 a=21.50, no drift, seven
scene cuts where the seven cuts should be, tag no longer silent (-40 dB of
piano, not -66 dB of nothing).

**No whisper pass was possible.** There is no local whisper install and the
Higgsfield sandbox that carries faster-whisper is not authorised. Instead every
line window in the final mix was measured for voice energy — all seven present,
-14 to -16 dB. That is verification by construction: the TTS says exactly the
text it was given, so the failure whisper guards against (a model mangling or
dropping a line) cannot occur here. It is a weaker guarantee than a transcript
and is recorded as such.

## The voice is a placeholder — read this before publishing

The voiceover is **macOS `say`, Samantha, compact**. Only compact system voices
are installed on this machine; the enhanced and premium ones are not.

It is intelligible and correctly timed. It is also audibly synthetic, and this
is a piece whose entire job is to sound like one tired parent talking to
another. **My recommendation is not to publish on this voice.**

Swapping it is cheap and changes nothing else. Record the seven lines, drop them
in as `work/vo/01.wav` … `07.wav`, and re-run `build.sh` — the cut re-times
itself around the new durations automatically. Nothing else needs touching.

The alternative, if you want a synthetic voice that does not sound synthetic, is
a paid TTS pass, which needs approval and the Higgsfield connector authorised.

## Still open

- **Style number is not set.** You name it; it is never guessed. The finished
  piece is closest in feel to Style 2, but that is an observation, not a record.
- Visitor rating 24 h after posting, compared against 0006's 3.5.
- Episode 2 (I002) is written but unbuilt, by design.
