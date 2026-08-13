# 0034 — Alif CoComelon 10s (Gemini Omni Flash) · notes

**Produced** 2026-08-13 · video · **30 credits · $0.99** · style **unassigned** ·
`OUTPUT/0034-alif-cocomelon-10s-9x16.mp4` — 10.01 s, 720×1280, 24 fps, 3.9 MB.

Third attempt at this concept. 0024 rejected (spoken, photoreal), 0033 rejected
(single static shot, sang "Elef").

## Model change is what unlocked it

**`gemini_omni` — Gemini Omni Flash**, Google. 4–10 s in a **single clip** with
native audio, 720p, 9:16, image references. **30 credits for 10 s.**

Veo caps at 8 s, so 0033 needed a stitched tag to reach 10 s. Omni Flash does the
whole thing in one generation.

## Both 0033 failures fixed, and verified

**1. Multi-scene, not a talking head.** Measured scene cuts at **3.50 s and 6.54 s** —
exactly the two boundaries the prompt specified. Omni Flash honours a written cut
list; veo ignored it and gave one locked-off shot.

| Beat | Time     | What happens                                                                 |
| ---- | -------- | ---------------------------------------------------------------------------- |
| 1    | 0.0–3.5  | clapping, bouncing, bright playroom, camera pushes in                        |
| 2    | 3.5–6.5  | **cut** — skips across frame, balloons, confetti, camera tracks              |
| 3    | 6.5–10.0 | **cut** — plants feet, one arm straight up: her body becomes the Alif stroke |

**2. Pronunciation.** Whisper on the delivered audio:

> "Come along, come sing with me, Arabic is fun, you'll see, **Ahlif, Ahlif, Ahlif**
> stands up tall."

**"Ahlif"** at 0.87 / 0.92 / 0.93 confidence — correct. No "Elef", no "Aleph".
**Writing the lyric phonetically as "AH-lif" is what worked**; a prose rule
("pronounced AH-lif, never Aleph") had failed on 0033.

Minor: it sings "Ahlif" **three** times where two were specified.

## The defect I had to patch, and how

Omni Flash rendered **garbled pseudo-text — "UXely" — large in the upper right from
~8.4 s to the end**, despite "NO on-screen text / NO letters / NO words" pinned three
ways in the prompt. Nearly 1.6 s of nonsense lettering in a video that teaches the
alphabet.

Fixed locally, no credits: the **Arabic ا "Alif" card** the brief already planned for
beat 3 is placed exactly over that region, fully opaque **by 8.10 s** — before the
garbage appears. It does two jobs: covers the defect and delivers the teaching
visual.

Worth recording that the first attempt at the patch used a 0.35 s alpha fade starting
at 8.15 s, and the garbled text showed **through** the semi-transparent card at 8.4 s.
A cover-up patch must be fully opaque before the thing it covers appears.

Still present, minor: small background toy blocks carry Latin letters (A, B, E). Small,
out of focus, read as ordinary alphabet blocks — but they are Latin letters in an
Arabic-alphabet video.

## The open question: is it SUNG, or chanted?

|                   | 0033 (veo)         | 0034 (Omni Flash) |
| ----------------- | ------------------ | ----------------- |
| Voiced            | 86%                | 72%               |
| Median pitch      | 372 Hz             | 390 Hz            |
| 10th–90th spread  | **18.1 semitones** | **5.7 semitones** |
| Held notes ≥80 ms | 29                 | 20                |

**5.7 semitones is in the conversational-speech range** (4–7); veo's 18.1 was
unambiguously melodic. So Omni Flash's delivery is either a narrow, chant-like melody
or rhythmic speech over music. Measurement cannot settle musical quality — **this one
needs the user's ear.**

Trade-off as it stands: veo sang more musically but mispronounced the letter and would
not cut scenes. Omni Flash cuts scenes properly and pronounces correctly but sings in
a much narrower range.

## Pronunciation, attempt 2 — WORSE, and why I stopped

User verdict on v1: **"video and composition of character is excellent. just correct
the 'Alif' pronunciation."** So the picture is signed off; only the letter name is wrong.

v2 changed the phonetic spelling to `AL-if` and left everything else byte-identical.
Whisper on v2: **"Elif, Elif, Elif stands up tall"** — a short-e, Turkish-style
rendering. Worse than v1's "Ahlif".

| Attempt    | Spelling in lyric   | Whisper heard | Verdict                   |
| ---------- | ------------------- | ------------- | ------------------------- |
| 0033 (veo) | "Alif" + prose rule | "Elef"        | wrong                     |
| 0034 v1    | `AH-lif`            | "Ahlif"       | wrong, per the user's ear |
| 0034 v2    | `AL-if`             | "Elif"        | wrong, short-e            |

**Two attempts, 60 credits, both off. Stopped guessing.** Whisper's spelling is a weak
proxy for vowel quality — it can tell me the word, not whether the vowel is right — so
blind 30-credit iterations are the wrong instrument.

Cheap substitute: `pronunciation-probe/alif-options.wav`, one seed_audio read of five
candidate spellings (~0.3 credits), for the user to pick by ear. The winning spelling
then goes into ONE final Omni Flash run.

v2 is kept at `work/clips/omni-10s-v2.mp4`. **The delivered file remains v1**, whose
picture the user approved.

## Open

- **Which pronunciation option**, from the probe file.
- **User's ear on the singing.** If it reads as chanting rather than a tune, the answer
  is a supplied sung vocal with Omni Flash for picture.
- The third "Ahlif".
- Style unassigned — the user names it if this approach is adopted.
- Unpublished, unrated.
