---
name: riwaq-audio-montage
description: Build a Riwaq Al Ilm video from supplied audio and stills that already exist in the library — recitation, nasheed or dua over a slow cross-dissolved montage, at zero credits. Use whenever the user supplies audio and asks for a video, or wants something made from existing images rather than generated. Read it before reaching for a paid model.
---

# Riwaq audio montage

The pipeline that produced **0039 Surat Al-Asr** — 30 s, six existing
illustrations, supplied recitation, **zero credits**.

Reach for this whenever audio arrives and a video is wanted. The library holds
dozens of finished 4K illustrations that have already been paid for; a montage
built from them costs nothing and takes minutes.

## Run it

```bash
python3 .claude/skills/riwaq-audio-montage/scripts/montage.py \
  --audio source/recitation.mp4 \
  --out OUTPUT/00NN-title-9x16.mp4 \
  --duration 30 \
  --still ../0031-.../OUTPUT/0031-...-clean-1x1-4k.png \
  --still ../0029-.../OUTPUT/0029-...-clean-1x1-4k.png:0.38
```

`path:bias` — bias 0-1 chooses which part of a square survives the vertical crop.
Options: `--xfade`, `--lead-in`, `--zoom`, `--size`, `--fps`.

Verified: re-running the skill against 0039's inputs reproduces the delivered
film **pixel-identically** at every sampled frame.

## Choosing the stills

**Use the CLEAN, textless masters.** Every style-5 image post has a
`*-clean-1x1-4k.png` with no title burned in. Titles from an unrelated post sitting
over recitation is the single worst thing this pipeline can do.

```bash
ls productions/*/OUTPUT/*clean-1x1-4k.png
```

**Order the stills to follow the audio's own meaning, not by convenience.** On
0039 the sequence tracks the surah: dawn for the oath on time, then creation, then
prayer for those who believe, sharing for righteous deeds, reading for counselling
truth, looking closely for patience. Nobody will consciously notice. It is still
the difference between a montage and a slideshow.

**Six stills over 30 s** (about 5.8 s each with 1 s dissolves) is a calm pace that
suits recitation. Faster starts to feel like an advert.

## The rules that cost something to learn

**1. Crop bias is a real decision.** 9:16 keeps only **56% of the width** of a 4096
square. Centre worked for five of 0039's six stills; on the sixth it clipped the
smaller child _receiving_ the fruit — the entire subject of the picture. **Look at
one frame from every still.** No measurement catches this: duration, drift and
levels were all perfect while the picture was wrong.

**2. Never put unverified sacred text on screen.** Whisper will identify a surah
and still return a mangled transcript — 0039's second verse came back as
`إن إن سن نرفيخ صور`. **A transcript is not verification.** Qur'anic text must be
letter-perfect and must come from a verified mushaf, never from ASR output. When in
doubt, ship it clean: images and audio carry it.

**3. Silence at the ends is correct here.** The audio is placed after a ~0.9 s
lead-in and the picture runs a beat past it. `checkvideo.py` will flag the tail —
**accept it and write down why.** This is not the 0014 fault, where an end card
played to nothing because the bed was forgotten. Filling it would mean laying music
over recitation. Record the decision in the notes so the next person does not
"fix" it.

**4. Nothing is laid over recitation.** No second music bed, no ducking, no
sound design. The supplied audio is the whole track.

**5. Watermark and end card are OFF by default.** 0039 was asked for clean, and
clean is the right default for Qur'anic audio. If a watermark is wanted, it still
stops before any end card — standing rule, see PRODUCTION-STANDARD.md.

**6. Push in slowly.** 6% over a segment. Past about 8% it reads as restless and
fights the calm the audio is doing all the work to build.

## Before publishing — ask, do not assume

**Who is reciting, and may the recording be reused?** Supplied audio usually
arrives with no attribution. A commercial or copyrighted recitation needs
permission or replacement, and platforms do enforce this on audio. This is a
question for the user; no amount of local checking answers it.

## Verify

```bash
python3 .claude/skills/riwaq-story-video/scripts/checkvideo.py --video OUTPUT/....mp4
```

Then **look at a frame from every still**. Rule 1 is why.

For non-English audio, a forced-language whisper pass identifies what was supplied
and proves nothing is missing — but see rule 2 about what that transcript may and
may not be used for.

## Record it

Numbered production, `00-REQUEST.md`, `01-NOTES.md`, registry updated, cost
recorded as **0 credits**. The style is named by the user and never guessed.
