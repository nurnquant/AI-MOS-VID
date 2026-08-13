# 0035 — Alif, Baa, Taa full rhyme (CoComelon, 50–60s) · notes

**Status: DELIVERED, 52s, ALIF INCLUDED.** 240 credits / $7.92.
Reference for look and structure: **0034**, whose picture the user approved.

## What was asked

The full rhyme from `00-REQUEST.md`: intro + 4 verses (Alif, Baa, Taa, Saa) + chorus

- ending, 50–60 s, CoComelon style.

At Omni Flash's 10 s ceiling that is **6 clips ≈ 180 credits ≈ $5.94.**

## The problem with building it blind

The entire content of this video is **letter names**, and "Alif" is the one thing
proven unfixable: four attempts across two models and three spellings on 0033/0034 all
produced Elef / Ahlif / Elif.

Spending 180 credits to reproduce a known-rejected defect at six times the scale would
be wrong. So one 30-credit test was run first to answer a question nobody had asked:
**do the OTHER letters pronounce correctly?**

## Test result — only "Alif" is broken

Verse 2 (Baa) generated in full, so the clip is usable footage if adopted rather than
a throwaway. `work/clips/v2-baa.mp4`, 10.01 s.

- **Scene cuts measured at 3.46 and 6.42 s** — the three-scene CoComelon structure
  holds, same as 0034.
- Whisper: _"Ba, one little dot below / One dot down, now you know / Ba, let's say it
  slow"_ — **"Ba" at p=0.99** on the second occurrence. No "bay", no "bee", no
  distortion.

**"Baa" is fine. By extension "Taa" and "Saa" — the same open-syllable shape — are
very likely fine too.** The failure is specific to "Alif".

Minor: it sang one "Ba" where the lyric had "Baa, Baa", and the vocal ends at ~8.5 s
leaving a 1.5 s instrumental tail.

## Which sections are blocked

| Section        | Contains "Alif"?                       | Buildable now        |
| -------------- | -------------------------------------- | -------------------- |
| Intro          | no                                     | ✅                   |
| Verse 1 — Alif | **yes**                                | ❌                   |
| Verse 2 — Baa  | no                                     | ✅ **already built** |
| Verse 3 — Taa  | no                                     | ✅                   |
| Verse 4 — Saa  | no                                     | ✅                   |
| Chorus         | **yes**, plus untested "Mā shā' Allāh" | ❌                   |
| Ending         | **yes**                                | ❌                   |

**Three of seven sections are blocked on a word that cannot be generated correctly.**

## The decision needed

1. **Supplied vocal (recommended).** User records or sources the rhyme sung properly.
   All 6 picture clips get built and the vocal is muxed on. Pronunciation guaranteed,
   picture already proven. Cost: the 6 clips, no more.
2. **Build the 4 safe sections now** (intro, Baa, Taa, Saa ≈ 40 s, ~120 credits) and
   hold the 3 Alif sections until a vocal exists. Progress without waste.
3. **Restructure** so "Alif" never appears in the sung audio — the letter is shown as
   a Pillow card while she sings only the non-letter lines. Cheapest, but it weakens
   the teaching, since the point is hearing the letter said.
4. Build everything with generated audio and accept "Elif" in three sections. **Not
   recommended** — this is what was rejected twice.

Nothing further will be generated until this is answered.

## Open

- The decision above.
- Style unassigned.
- "Mā shā' Allāh" in the chorus is untested and carries the same risk class as "Alif".

---

# Delivered — partial cut, option 2

`OUTPUT/0035-alif-baa-taa-partial-4sections-9x16.mp4` — **42.04 s**, 720×1280,
24 fps, 16.1 MB. Video 42.042 s / audio 42.026 s, no desync.

**intro → Baa → Taa → Saa → 2 s brand tag.** Verse 1 (Alif), the chorus and the
ending are deliberately absent — all three contain "Alif".

## Pronunciation, verified on every delivered section

| Section | Whisper heard                                                                                    | Verdict   |
| ------- | ------------------------------------------------------------------------------------------------ | --------- |
| Intro   | "Come along, come sing with me / Arabic is fun, you'll see / Learn the letters happily"          | ✅        |
| Baa     | "Ba… one little dot below / One dot down, now you know / Ba, let's say it slow"                  | ✅ p=0.99 |
| Taa     | "Ta, ta, two little dots on top / One, two, there they are / Ta, you're a little star"           | ✅        |
| Saa     | "Sa, sa, three little dots on top / Count them with me, one, two, three / Sa, as easy as can be" | ✅        |

**Every letter name in the delivered 42 s is pronounced correctly.** That is the
point of shipping this cut rather than the full rhyme.

## Structure held

Scene cuts measured at 3.50 / 13.46 / 16.42 / 23.46 / 26.50 / 33.46 / 36.42 plus the
section joins — the three-cut CoComelon rhythm survived in all four sections.

## Two defects found and fixed during the build

- **Latin alphabet blocks.** The first Saa clip had toy blocks lettered C, H, F, K,
  D, A, B, P scattered across the floor in focus — Latin letters in an Arabic
  alphabet video. Re-rolled (30 cr) with the set dressing pinned explicitly: no
  blocks, no cubes, no lettered objects, plain balls and plush only. Clean now.
  Old take kept as `clips/v4-saa-v1-had-latin-blocks.mp4`.
- **My own error:** the three new clips were submitted **without the character
  reference image**, which I had used on 0034. 90 credits were already committed
  when I noticed. The character held anyway on the written description, but the
  three new clips gained a slim green band on the headscarf that the earlier Baa
  clip does not have.

## Known, for the user's call

- **Headband mismatch.** Baa (generated with the reference still) has a plain cream
  headscarf; intro, Taa and Saa have a green band. Noticeable if watched closely.
  Fixing means re-rolling Baa to match, 30 credits.
- **Intro may be missing one line.** The brief has "Clap your hands — one, two,
  three"; whisper shows a 1.6 s gap where it should sit and did not transcribe it.
  She does clap three times on screen there. Needs an ear.
- The vocal in each section ends around 8.5 s, leaving a short instrumental tail
  before each cut.

## Still held, pending a supplied vocal

Verse 1 (Alif), chorus ("Alif, Baa, Taa, Saa" + "Mā shā' Allāh"), ending. Roughly
20 s more of finished video, and about 90 credits, once the pronunciation problem is
solved by a human voice rather than a model.

## Cost

| Item                              | Credits         |
| --------------------------------- | --------------- |
| Baa diagnostic (kept, in the cut) | 30              |
| intro + Taa + Saa                 | 90              |
| Saa re-roll (Latin blocks)        | 30              |
| **Total**                         | **150 / $4.95** |

---

# ALIF SOLVED — final 52s cut

`OUTPUT/0035-alif-baa-taa-rhyme-9x16.mp4` — **52.04 s**, 720×1280, 24 fps, 19.8 MB.
Video 52.042 s / audio 52.032 s.

**intro → ALIF → Baa → Taa → Saa → brand tag.** Correct Arabic order, Alif first,
which is what the user asked for.

## The fix: speak the letter, do not sing it

Every previous attempt had her **singing** "Alif" — 0033 veo, 0034 v1/v2/v3 — and all
four produced Elef / Ahlif / Elif. Singing stretches a vowel, and the stretch is what
broke the word.

This clip keeps the melody but has her **SPEAK the letter as a call-out over the
music**, sung lines either side:

```
SPOKEN:  "Alif!"  "Alif!"        <- crisp, on the beat, not held
SUNG:    "stands up tall, straight and strong, look and see"
SPOKEN:  "Alif!"
```

Whisper on both takes of this clip: **"Alif, alif, stands up tall, straight and
strong, look and see. Alif, look and see."** Correct, twice in a row, no respelling
tricks needed. It is written into `/riwaq-story-video` as the general rule for any
pinned name a model mangles when sung.

## Every letter in the 52s is now verified

| Section  | Heard                                                                                   |     |
| -------- | --------------------------------------------------------------------------------------- | --- |
| Intro    | "Come along, come sing with me / Arabic is fun, you'll see / Learn the letters happily" | ✅  |
| **Alif** | **"Alif, alif… Alif"** (spoken)                                                         | ✅  |
| Baa      | "Ba… one little dot below / Ba, let's say it slow"                                      | ✅  |
| Taa      | "Ta, ta, two little dots on top / Ta, you're a little star"                             | ✅  |
| Saa      | "Sa, sa, three little dots on top / Sa, as easy as can be"                              | ✅  |

## Latin alphabet blocks — fixed by cropping, not by paying again

Omni Flash drew lettered toy blocks on the floor in **both** Alif takes, despite the
prohibition being spelled out three ways, and the same happened on the first Saa clip.
A third re-roll was not justified.

The Alif clip is **zoomed 1.42× with the crop biased up and left**, which removes the
blocks entirely — verified at 1 s, 5 s and 9 s. Free, deterministic, and it cannot
recur. The Saa clip was re-rolled earlier (30 cr) before this technique was found.

## Still absent

**Chorus and ending.** Both sing "Alif, Baa, Taa, Saa" as a melodic line, and the
spoken-call-out trick does not apply to a sung list. The chorus also has
"Mā shā' Allāh", untested. ~20 s and ~60 credits, and they need either a supplied
vocal or a rewrite that speaks the letter list.

## Known, minor

- Intro may be missing "clap your hands, one, two, three" — a 1.6 s gap where it
  belongs. She does clap three times on screen.
- The Baa section has a plain cream headscarf; the other four have a slim green band,
  because Baa was made with the character reference still and the others were not.
- The Alif section is framed slightly tighter than the rest, a consequence of the
  de-blocking crop.

## Cost

| Item                                  | Credits         |
| ------------------------------------- | --------------- |
| Baa diagnostic                        | 30              |
| intro + Taa + Saa                     | 90              |
| Saa re-roll (Latin blocks)            | 30              |
| Alif take 1 (spoken call-out proven)  | 30              |
| Alif take 2 (blocks; cropped instead) | 30              |
| **Total**                             | **240 / $7.92** |
