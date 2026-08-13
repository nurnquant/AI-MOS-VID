# Style 8 — Table Talk · the recipe

**Say "Table Talk" or "Style 8" and this is what gets built.**

One adult speaking straight to camera at a table in a warm home at night, as if
talking to one other parent late in the evening. Generated end to end by Gemini
Omni Flash with native audio.

First use: **0036 V2**, graded **A+** — the highest grade given to anything in the
library. Everything below is what made that work. Several lines cost money.

---

## Cost and shape

- **`gemini_omni`, 30 credits per 10 s clip.** 10 s is a hard cap.
- Omni speaks about **13-15 words per 10 s clip** at this calm pace. Budget the
  script by that, not by an ideal length.
- Four clips plus a 2 s brand tag = **42 s, 120 credits, about $4**.
- A person talking to camera cannot be cut as tight as narrated stills. If a
  length is fixed, **cut the script before buying clips, not after**.

## The rules that make it work

**1. Pin the same face on every clip.** Pass one still as `image_references` on
every single generation. Without it, four clips are four different men. 0036 used
a frame lifted from 0006. Upload once with `media_upload`, PUT the bytes, then
`media_confirm`, and reuse that one `media_id` throughout.

**2. Buy one clip first.** Generate clip 1 alone, look at it, get approval, then
buy the rest. On 0036 this was the difference between risking 120 credits and
risking 30.

**3. Two shots per clip, cut at about half way.** Omni honours a written shot list
to within about 0.1 s. Ask for a framing change, not a subject move — the person
stays still, the camera changes. One locked-off shot for 10 s is dead; a cut every
5 s is alive without being busy.

**4. Direct the performance away from presenting.** The phrases that worked:

> speaks DIRECTLY TO CAMERA, quietly, as if talking to one other parent across the
> table late at night. Tired, warm, honest. NOT a presenter, NOT energetic, NOT
> smiling for the camera. Low, calm, unhurried voice. He holds eye contact with
> the lens.

**5. Give the exact words, and say they are the only words.** Quote the dialogue
and follow it with "exactly these words and nothing else". Omni obeys.

**6. Kill on-screen text three ways.** Omni will otherwise invent garbled
pseudo-text — 0034 shipped with "UXely" on screen for 1.6 s. Pin it hard:

> ABSOLUTELY NO TEXT ANYWHERE IN THE FRAME. No subtitles, no captions, no letters,
> no words, no writing, no logos, no numbers, no signage, no lettering on any
> object. The frame must contain zero readable characters of any alphabet.

This held on all four clips of 0036. It is not guaranteed — check every clip, and
be ready to cover a defect with brand furniture rather than pay for a re-roll.

**7. Ask for silence at the end of the last clip.** "Then he says nothing at all
and simply looks at the lens, breathing. Do not cut away. Hold on his face to the
very last frame." That hold is what makes the ending land.

**8. Expect the "IN THE DARK" preset interceptor.** Warm low-light prompts trigger
it. Retry with `declined_preset_id: 24bae836-2c4a-48e0-89b6-49fcc0b21612`.

## Post — small, and all of it necessary

**Level every clip.** 0036's four came back between **-26.5 and -30.9 dB**.
Untouched, the film gets quieter as it goes and the closing line — the one that has
to land — is the faintest thing in it. `loudnorm=I=-18:TP=-2:LRA=11` per clip
before the join.

**Join with filter concat**, never the demuxer.

**Every clip generates its own room tone.** Left alone the ambience steps at
every join — 17 dB on 0036. A continuous bed under the whole film is the fix; a
patch at each seam is not, and fading clips in at the head will eat the first
word of anything that starts speaking at 0.00 s.

**Watermark small, top right — and OFF over the end card.** The tag already
carries the logo and the wordmark. See the standing rule in
[PRODUCTION-STANDARD.md](../PRODUCTION-STANDARD.md).

**Duck the bed, do not just lower it.** A bed quiet enough never to cover a word
is too quiet to bridge the joins, which is the job it was added for. Sidechain it
to the voice: `sidechaincompress=threshold=0.03:ratio=9:attack=12:release=420`.
On 0036 that puts the piano 15-26 dB under speech and back up to about -37 dB in
the gaps.

## Verification — no longer optional

`faster-whisper` is installed locally. Every clip gets a word-level pass:

```python
from faster_whisper import WhisperModel
m = WhisperModel("base.en", device="cpu", compute_type="int8")
segs, _ = m.transcribe("clip.wav", word_timestamps=True, vad_filter=False, language="en")
```

Then `checkvideo.py` for drift, cuts, per-beat level and a silent tail.

**Whisper cannot settle Arabic terms.** It writes "deen" as "Dean" and "Dua" as
"Do I", because they are not English words and it has no better guess. Those need
an ear. What whisper _can_ prove is that no line is missing, no line was invented,
and the English around them is right — including tense, which is where 0036's last
clip drifted from "learned to talk" to "learn to talk".

## Captions

0036 V2 shipped without them by request. Four treatments are mocked up on a real
frame at
`productions/0036-youre-already-teaching-them/work/v2/caption-styles.png`.
Recommendation on record: **hook card for the first 1.5 s, then quiet two-line
captions over a gradient** — no slab box, because the face and the room are the
product. Kinetic word-by-word captions perform better on Reels but fight the tone.

## What this style is for

Parent-facing pieces where one person needs to say something true and quiet to
another. It is the wrong style for children's content, for anything sung, and for
anything that needs more than one speaker.
