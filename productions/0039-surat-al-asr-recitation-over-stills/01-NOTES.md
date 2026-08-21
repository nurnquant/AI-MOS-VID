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

## Not verified, and cannot be from here

**The reciter is unknown.** The file arrived as `suratul asr audio.mp4` with no
attribution. Before this is published anywhere:

- confirm who is reciting and whether the recording may be reused
- if it is a commercial or copyrighted recitation, it needs permission or
  replacement, and platforms do enforce this on audio

That is a question for the user, not something measurement can settle.

## Deliberately absent

- **No watermark, no end card** — the instruction, and followed exactly.
- **No text of any kind.** Whisper identified the surah but returned a mangled
  transcript. Qur'anic text on screen has to be letter-perfect and a transcript
  cannot establish that.
- **No music under the recitation.** Nothing is layered over it.

## Turned into a skill

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
