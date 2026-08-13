# 0033 — Alif Baa Taa rhyme, 10s sung test · notes

**Produced** 2026-08-13 · video · **26 credits · $0.86** · style **deliberately
unassigned** · built with `/riwaq-story-video`.

`OUTPUT/0033-alif-baa-taa-rhyme-test-9x16.mp4` — 10.02 s, 720×1280, 24 fps, 2.6 MB.
8 s sung beat + 2 s brand tag, filter-concatenated. Video 10.00 s / audio 10.02 s,
no desync.

## The question this test existed to answer

Every rhyme attempt has been blocked by the same thing: **nothing in this workspace
can generate singing.** Every audio model here is text-to-speech. 0024 was rejected
for substituting a spoken read for a song.

**But veo generates its own audio, and that had never been tested.** So: one 8-second
clip, lyrics pinned as _sung_, 26 credits, one question — will veo sing?

## Result: YES. Veo sings.

Measured on the delivered audio, not assumed:

| Measure                             | Value              | Reading                                 |
| ----------------------------------- | ------------------ | --------------------------------------- |
| Voiced frames                       | 86% of 8 s         | continuous vocal, not sparse speech     |
| Pitch, Q1–Q3                        | 327–444 Hz         | child-voice register                    |
| 10th–90th percentile spread         | **18.1 semitones** | conversational speech spans ~4–7        |
| Held notes ≥80 ms within ½ semitone | **29**             | speech does not sustain pitch like this |

A wide pitch spread **and** 29 sustained pitch plateaus in 8 seconds is singing, not
speech. **The blocker is broken.** A sung children's rhyme is producible here, from
veo, at 22 credits per 8 seconds.

Note the deliberate inversion this required: every other production **discards** veo's
audio because it adds unwanted music. Here veo's audio **is** the deliverable and is
kept. `work/build.sh` says so at the top so nobody "fixes" it later.

## Character consistency: holds

Frames at 0.5, 1.5, 3.5, 5.0, 6.5 and 7.8 s show the same face, cream headscarf and
emerald dress with gold cuffs throughout, mouth moving on the beats, camera pushing in
gently. The master still as `start_image` is what did this. Spec written up for reuse:
`library/rhyme-series-character.md`.

## Rhythm: even

Word timings from whisper, two lines of near-identical length:

```
line 1  letters 0.00-1.68   phrase 1.96-3.38
line 2  letters 3.38-5.70   phrase 5.94-7.52
```

~3.4 s per line, letters on the front half, phrase on the back half. A child could
clap to it.

## The defect that makes it unpublishable as-is

**It sings the wrong letters.** Whisper, with word confidences:

> "**Elef**-ba-**ta-ta**, come learn with me / **Elef**-ba-**ta-ta**, as easy as can
> be"

Two errors, both in the part that carries the teaching:

1. **"Elef" instead of "Alif"** — the same Aleph/Aleaf failure that sank 0024's voice
   audition, now in a sung voice. Pinning `"Alif" is pronounced AH-lif (never Aleph,
never Aleaf)` in the prompt did **not** work.
2. **An extra syllable: "ta-ta"** where three letters were specified. It sings four
   beats of letters, not three.

The rest of the lyric is exactly right, at high confidence: "come learn with me" and
"as easy as can be" both ≥0.98.

**A rhyme that teaches the alphabet cannot mispronounce the first letter.** So this is
a successful _test_ and not a publishable _video_.

## What to try next, 22 credits per attempt

- Write the lyric **phonetically** in the prompt rather than describing the
  pronunciation: sing `"AH-leaf, BAA, TAA"` or `"A-lif"` with a hyphen, instead of
  "Alif" plus a rule about it.
- Pin the syllable count: _"exactly three letter names, three beats, no repeats"_.
- If two attempts still fail, the honest conclusion is that veo can sing but cannot be
  trusted with pinned Arabic letter names — and the answer becomes a supplied sung
  vocal, with veo used for picture only.

## Open

- Awaiting the user's decision on a retry.
- **Style deliberately left null.** If this approach is adopted it becomes a new
  numbered style and the user names it. Style 7 is retired/rejected — do not reuse.
- Unpublished, unrated.
