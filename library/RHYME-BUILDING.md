# RhymeBuilding

The named thread for **CoComelon-style sung children's rhyme videos**. Say
"RhymeBuilding" and this is the context.

Kept in the repo as well as in memory, so the knowledge survives even when memory
is unavailable.

**Reference production: [0035](../productions/0035-alif-baa-taa-full-rhyme-cocomelon-50-60s/)**
— 52 s, editor 4/5, `intro → Alif → Baa → Taa → Saa → brand tag`.

**Full pipeline:** the `/riwaq-story-video` skill, plus its
`scripts/lettercards.py` and `scripts/checkvideo.py`.

## Settled

|           |                                                                                                                   |
| --------- | ----------------------------------------------------------------------------------------------------------------- |
| Model     | **`gemini_omni`** (Gemini Omni Flash) — 4–10 s in ONE clip, native audio, 9:16                                    |
| Cost      | **30 credits per 10 s.** 0035 ran 240 cr / $7.92 including re-rolls                                               |
| Structure | one 10 s clip per section, three hard cuts written into each prompt — Omni Flash honours a cut list; veo does not |
| Audio     | **KEEP** the model's audio. It is the singing. Opposite of every other production here                            |
| Assembly  | watermark per section → **filter concat** → 2 s brand tag with a marimba tail                                     |
| Letters   | `lettercards.py`, pink-glass, bottom-right, 0.62, timed from whisper word timestamps                              |
| Character | Johra — see [rhyme-series-character.md](rhyme-series-character.md), pass the master still every time              |

## Solved — do not spend on these again

- **Veo cannot do this.** 8 s ceiling, ignores cut lists, produced one static shot
  (0033, rejected).
- **A name the model mangles when SUNG is fixed by making it SPEAK the word.** Five
  sung attempts at "Alif" gave Elef / Ahlif / Elif; a crisp spoken call-out over the
  music was correct first time. Singing stretches the vowel.
- **Spelling roulette fails** — `AH-lif`, `AL-if`, plain `Alif`, prose rules, all of it.
- **Baa, Taa and Saa sing correctly.** Only Alif ever broke.
- **Both models draw text nobody asked for** — Latin alphabet blocks, garbled
  "UXely" — and prohibition does not stop it. **Crop it out**: zoom ~1.4 with the crop
  biased away from the corner. Free and certain; 0035 lost two paid re-rolls learning
  this.

## Still blocked

**Chorus and ending.** Both _sing_ the letter list, so the spoken-call-out trick does
not apply. ~20 s, ~60 credits. Needs a **user-supplied sung vocal** — then it is a
free local mux onto the approved picture — or a rewrite where the list is spoken.

## Open question

ث is sung and captioned **"Saa"** per the brief. The user wrote "Thaa" on 2026-08-13.
Standard order is Alif–Baa–Taa–Thaa. **Ask before changing it.**
