# 0035 — Alif, Baa, Taa full rhyme (CoComelon, 50–60s) · notes

**Status: IN PROGRESS, paused on a decision.** 30 credits spent so far ($0.99).
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
