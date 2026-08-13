# Alif, Baa, Taa — Come Learn With Me (CoComelon 10s, Omni Flash)

_Video · CoComelon-style children's sing-along · 10s · **Gemini Omni Flash**_

## What is different this time

Two prior attempts were rejected. Fixing the specific causes:

| Attempt | Why it failed                                              | Fix here                                                              |
| ------- | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| 0024    | spoken read, photoreal children                            | sung, 3D animated                                                     |
| 0033    | **one static locked-off shot**, and sang "Elef" not "Alif" | **three cut scenes with movement**, and "AH-lif" spelled phonetically |

Model change: **`gemini_omni` (Gemini Omni Flash)** — 4–10 s in a _single_ clip with
native audio, so a real 10-second piece with no stitching. **30 credits.** Veo caps
at 8 s.

## The 10 seconds — three cut scenes, CoComelon energy

Not a talking head. Cuts, movement, bright saturated colour.

| Beat | Time     | Scene                                                                                      | Sung line                               |
| ---- | -------- | ------------------------------------------------------------------------------------------ | --------------------------------------- |
| 1    | 0.0–3.5  | Johra centre, clapping on the beat, bouncing                                               | "Come along, come sing with me,"        |
| 2    | 3.5–6.5  | **CUT** — wider, she skips across a colourful playroom, balloons and shapes                | "Arabic is fun, you'll see!"            |
| 3    | 6.5–10.0 | **CUT** — she stands tall and stretches one arm straight up, her body a tall straight line | "AH-lif, AH-lif — Alif stands up tall!" |

Beat 3 is the teaching image: her arm and body form the vertical stroke of **ا**.

## Pronunciation

Written **phonetically inside the lyric**, not as a rule about it — the rule failed
on 0033.

- **"AH-lif"** — stressed first syllable, short second. Never "Elef", "Aleph", "Aleaf".
- Exactly **two** "AH-lif" calls in beat 3, not three or four. 0033 added a syllable.

## Music

Bright, bouncy nursery melody, ~120 bpm, simple accompaniment, real child singing
voice. Native audio from the model is the deliverable and is **kept**.

## Visuals

- Premium preschool 3D animation, **CoComelon-bright**: saturated primaries, rounded
  props, soft rim light, sparkles.
- Character: **Johra**, exactly as `library/rhyme-series-character.md`, held by
  passing the master still as an image reference.
- **No text generated in the video.** The Arabic **ا** is composited locally with
  Pillow over beat 3 if wanted — AI-rendered Arabic is garbled.

## Verification

1. Whisper the audio: is it "AH-lif" and not "Elef"? Syllable count right?
2. Pitch measurement: sung, not spoken.
3. Frames across all three beats: does the character hold? Do the cuts actually happen?
4. `checkvideo.py` for duration, desync and silence.
