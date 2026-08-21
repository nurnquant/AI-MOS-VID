---
name: riwaq-ayah-overlay
description: Burn Qur'anic ayat, dua or any Arabic text plus translation onto a video, timed to the recitation, rendered through a browser so harakat are actually placed. Use whenever Arabic or sacred text must appear on screen — and read it first, because Pillow drops every harakat silently on this machine.
---

# Riwaq ayah overlay

The pipeline that produced **0039 V2 Surat Al-Asr** — three ayat with English
translation, timed to the reciter, **zero credits**.

Use it for any Arabic on screen: ayat, dua, dhikr, a hadith. Pairs naturally with
[riwaq-audio-montage](../riwaq-audio-montage/SKILL.md), which builds the film the
text goes on.

## The rule that comes first

**Text on screen must come from a verified source the user supplied.**

Never from a transcript. Whisper will identify a surah correctly and still return
a mangled verse — on 0039 it gave `إن إن سن نرفيخ صور` for ayah 2. That is fine for
finding _timings_. It is not a source for what is _displayed_.

If no verified text exists, ship the video clean and ask for one.

## Pillow cannot do this, and fails silently

This machine's Pillow has **no libraqm**. It does not place Arabic harakat — it
drops them. Verified rather than assumed: the same phrase rendered with vowel
marks and with them stripped produced **identical images**.

Every vowel mark gone from Qur'anic text, and it would have shipped looking fine.
Check before trusting any renderer:

```python
from PIL import features; print(features.check("raqm"))   # False here
```

**Cards are rendered by a headless browser**, which shapes Arabic properly.

## Run it

```bash
S=.claude/skills/riwaq-ayah-overlay/scripts

# 1. PROVE the text matches the supplied source, before anything is rendered
python3 $S/verifytext.py cards.json source/surah.md

# 2. render transparent cards through the browser
node $S/rendercards.mjs cards.json work/cards

# 3. burn them onto the film
bash $S/burn.sh OUTPUT/base.mp4 cards.json work/cards OUTPUT/out-v2.mp4
```

`cards.json`: `[{"id","ar","en","start","end"}, ...]`

Env overrides: `CARD_W`, `CARD_H`, `CARD_BOTTOM`, `CARD_AR_SIZE`, `CARD_EN_SIZE`.

Verified: re-running these three steps on 0039's inputs reproduces the delivered
V2 **pixel-identically** at every sampled frame.

## Timing it to the recitation

**Do not guess, and do not assume silence marks the verses.** 0039's audio had a
continuous bed under it, so `silencedetect` found no pauses at all.

What worked: whisper word timestamps with a forced language, then **windowed
passes** over each suspected span to confirm what is actually in it.

```bash
python3 -c "
from faster_whisper import WhisperModel
m = WhisperModel('small', device='cpu', compute_type='int8')
s,_ = m.transcribe('audio.wav', language='ar', word_timestamps=True, vad_filter=False)
[print(w.word, round(w.start,1)) for seg in s for w in seg.words]"
```

A long gap between two words usually means **the reciter repeats a verse**, not
that a word is missing. On 0039 a nine-second gap turned out to be ayah 3 recited
partially and then again in full.

**Show the whole verse anyway.** A truncated verse on screen reads as an error
even when it matches the audio exactly. Hold the full ayah across both passes.

## Layout

- Arabic above, translation below, both centred.
- Gradient scrim, never a slab box.
- **Nothing in the bottom fifth** — Reels and Stories draw their own UI there.
  `CARD_BOTTOM=400` on a 1920-tall frame keeps the block clear; check it.
- Fade in and out on alpha, ~0.4 s. Sacred text should not snap on.

## Verify before shipping

1. `verifytext.py` — codepoint by codepoint, harakat included. **Non-negotiable.**
2. `checkvideo.py` for drift and levels.
3. **Look at a frame from every card**, composited over the real picture. A card
   that measures perfectly can still sit over a bright patch and be unreadable.

## Audio is never re-encoded

`burn.sh` copies the audio stream untouched. Adding pictures to a recitation is
not a reason to re-encode it.
