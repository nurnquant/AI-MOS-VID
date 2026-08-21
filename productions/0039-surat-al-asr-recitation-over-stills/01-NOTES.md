# 0039 — Surat Al-Asr · notes

Delivered 2026-08-21. 30.00 s, 1080x1920, **0 credits**.

## Two flags from checkvideo, one accepted on purpose

`checkvideo.py` reports a **0.97 s silent tail** and a 1.11 s silence at the head.
**Both are deliberate and both stay.**

This is not the 0014 fault. There, 8 s of an end card played to nothing because
the bed had been forgotten. Here the recitation is given a moment to settle before
it begins and a moment to land after it ends. Filling either with music would mean
laying something over Qur'anic recitation, which was not asked for and would be
worse than the silence.

Recorded here so the flag is not silently ignored the next time someone runs the
checker on this file.

## Crop bias mattered

The masters are 4096 squares; 9:16 keeps only 56% of the width, so what survives
the crop is a real decision, not a default.

Centre worked for five of the six. On **0029** it clipped the smaller child at the
left edge — the child receiving the fruit, which is the entire point of the
picture. Biased to 0.38 and both children are now whole. Caught by looking at a
frame, not by any measurement.

## Reciter — asked, and answered

**Abdul Baset, one of Riwaq's own teachers** (confirmed by the user 2026-08-21).

The file arrived as `suratul asr audio.mp4` with no attribution, which was raised
as a hard gate before delivery rather than after. The answer clears it and does
more than that: the recitation belongs to a teacher a parent could actually book,
which is a stronger thing to say in a caption than any claim about quality. All
three captions credit him.

**Phrasing matters here.** The name is shared with Abdul Basit Abd us-Samad, among
the most famous reciters in the world. Every caption reads "Abdul Baset, one of
our teachers" rather than the name alone, so no reader infers a claim that was
never made.

## Deliberately absent

- **No watermark, no end card** — the instruction, and followed exactly.
- **No text of any kind.** Whisper identified the surah but returned a mangled
  transcript. Qur'anic text on screen has to be letter-perfect and a transcript
  cannot establish that.
- **No music under the recitation.** Nothing is layered over it.

## V2 — ayah and translation on screen (2026-08-21)

`OUTPUT/0039-v2-surat-al-asr-ayah-overlay-9x16.mp4` — same 30 s film with the
Arabic and English burned in. V1 is kept; it is still the clean version.

**What unblocked it:** V1 shipped without text because a whisper transcript is
not a source for Qur'anic text. The user then supplied
`source/surah_al_asr_arabic_english.md` — a verified Arabic and English text. That
is a source. The rule was never "no text", it was "no unverified text".

### Pillow cannot render this, and fails silently

This machine's Pillow has **no libraqm**, so it does not place Arabic harakat — it
drops them. Verified rather than assumed: the same phrase rendered with vowel
marks and with them stripped produced **identical images**.

Dropping every vowel mark from Qur'anic text is not a cosmetic defect, and it
would have shipped looking fine.

**The cards are rendered by a headless browser instead**, which shapes Arabic
properly and places every harakat. `work/v2/render.mjs`.

### Timing came from the recitation, not from guesswork

The supplied audio has a continuous bed under it, so silence detection found no
pauses at all. Whisper word timings plus three windowed passes established what is
actually recited:

| audio       | content                     |
| ----------- | --------------------------- |
| 0.0-9.2 s   | ayah 1, then ayah 2         |
| 9.2-16.8 s  | ayah 3, **first half only** |
| 16.8-28.2 s | ayah 3 **repeated in full** |

Ayah 3 therefore stays on screen from 10.2 s to the end, covering both passes.

**A deliberate choice:** the partial first pass could have been matched with a
partial card. It was not. A truncated verse on screen reads as an error even when
it matches the audio exactly, so the full ayah is shown throughout.

### Verified before shipping

Every string on screen was compared **codepoint by codepoint** against the
supplied file — all three ayahs and all three translations identical, harakat
included (5, 12 and 38 marks). For sacred text, "looks right" is not a check.

Text sits clear of the bottom 20% that Reels and Stories cover with their own UI.
The silent tail flag is the same one accepted in V1, for the same reason.

## Built with

Tagged in the registry, shown as pills on the dashboard card:

- **`/riwaq-audio-montage`** — V1, the film itself
- **`/riwaq-ayah-overlay`** — V2, the text on top

## Turned into two skills

`/riwaq-audio-montage` — `.claude/skills/riwaq-audio-montage/`. Reach for it
whenever audio arrives and a video is wanted, before reaching for a paid model.

`scripts/montage.py` is the generalised build: any audio, any number of stills
with per-still crop bias, any duration. **Verified against this production —
re-running the skill on 0039's inputs reproduces the delivered film
pixel-identically at every sampled frame**, so the extraction is a real
generalisation and not a rewrite that happens to look similar.

The skill carries the four things this production taught: crop bias is a decision
that no measurement checks, a whisper transcript is never a source for sacred text
on screen, silence at the ends is correct here and must be recorded so nobody
"fixes" it, and the reciter's rights are a question for the user.

## Still open

- **Style not named.** You name it.
- Reciter attribution, above.
- Not published. No editor rating yet.

## The second skill — /riwaq-ayah-overlay

`.claude/skills/riwaq-ayah-overlay/`. For any Arabic or sacred text on screen, in
any production.

Three scripts, in the order they must run:

| script            | does                                                                                                                       |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `verifytext.py`   | proves every on-screen string matches the supplied source, codepoint by codepoint. **Run first, before anything renders.** |
| `rendercards.mjs` | renders transparent cards through a headless browser                                                                       |
| `burn.sh`         | overlays them with alpha fades; copies the audio untouched                                                                 |

**Verified against this production — re-running all three on 0039's inputs
reproduces the delivered V2 pixel-identically at every sampled frame.**

The skill carries the four things V2 taught: a transcript is never a source for
displayed text; Pillow silently drops harakat on this machine; silence detection
cannot find verse boundaries under a music bed; and a long gap between words
usually means the reciter repeats a verse rather than that a word was missed.
