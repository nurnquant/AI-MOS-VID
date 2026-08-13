# You're Already Teaching Them

_Production 0036 · type: video · approved from idea
[I001](../../ideas/I001-youre-already-teaching-them.md) on 2026-08-13_

## Request

A ~22 s vertical Reel for Facebook, aimed at **parents, not children** — the
first parent-facing video in the library. Anti-guilt: the viewer is told they
are already teaching their child deen and simply does not count it.

Approved as a **single episode**, not a series. I002-I005 stay as text until
this one has a visitor rating. See "Why only one" below.

## Script

Spoken, 52 words, about 20 s of voice plus a 2 s brand tag.

| Time          | Line                                                    |
| ------------- | ------------------------------------------------------- |
| 0.0 - 2.5 s   | You think you're not teaching your child deen.          |
| 2.5 - 5.0 s   | You are. You just don't count it.                       |
| 5.0 - 7.6 s   | Bismillah before the car. They heard it.                |
| 7.6 - 10.2 s  | Alhamdulillah when you were exhausted.                  |
| 10.2 - 12.9 s | You apologised when you were wrong.                     |
| 12.9 - 15.5 s | Dua out loud when the news was bad.                     |
| 15.5 - 20.0 s | They learn deen the way they learned to talk. From you. |
| 20.0 - 22.0 s | Brand tag. Follow-ask as on-screen text, not spoken.    |

**The hook must exist as on-screen text in the first 1.5 s.** Facebook autoplays
muted, and a hook that only exists in the audio does not exist.

**Follow-ask — on-screen text over the tag, not voiced:**

> Episode 2: the four words that teach tawakkul.
> You already say three of them.
> Follow so you catch it.

No date is promised, deliberately. That commits us to an episode 2, not to an
episode 2 tomorrow.

The word count is what sets the length. If the read comes back long, cut words —
do not speed up the delivery.

## Blocked on two decisions

Neither can be guessed, and both change what gets generated:

1. **Style number.** See [library/STYLES.md](../../library/STYLES.md). The user
   names it; it is never assumed.
2. **Voice and face.** An AI read or the user's own voice, and whether anyone
   appears on camera. Parent-facing content converts noticeably better in a real
   human voice, and this is the single biggest lever on the result.

Also: generation needs the Higgsfield connector authorised. It currently is not.

## Budget

**150-200 credits**, pending the visual approach.

Benchmark: [0006 "The Dream of Every Parent"](../0006-dream-of-every-parent/) is
the closest thing already built — parent-facing, 56 s, nine clips including two
re-rolls, **214 credits / $7.06**, editor 5/5, **visitors 3.5/5** on Facebook.

A cheaper route is worth costing first: much of this could be built from the
existing library — 32 videos and 92 images already made — plus one voice track,
at close to zero credits. If the format lands, spend properly on episodes 2-5.

## Why only one episode

0006 says parent-facing scores 3.5 for 214 credits, while the animated character
clips (0016, 0017, 0018) score 5 for a fraction of that. The format is unproven
at this price, so five episodes before knowing whether one works is backwards.

Episode 1 carries the setup — look, voice, tag, timing — so 2-5 should come in
well under its cost. That is another reason not to batch.

Sequence: build this, post it, rate visitors, then decide on I002. If it scores
below 3.5, the series is answered cheaply.

**The real commitment is time, not money.** If this works, episode 2 needs to
land within days or the follows decay.

## Definition of done

- 22 s ± 1 s, 9:16, watermarked
- Hook legible as text within the first 1.5 s, on a muted playback check
- `checkvideo.py` clean: no A/V drift, no silent tail
- Caption in `OUTPUT/CAPTION.md`, **plain text — no markdown characters**
- Cost row in the tracker, notes in `01-NOTES.md`, registry updated
