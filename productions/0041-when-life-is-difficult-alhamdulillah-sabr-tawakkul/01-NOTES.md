# 0041 — narration audio · notes

2026-08-23. Four lines generated as speech. **~2.8 credits.** Nothing else built.

## Files

| file                  | length  | for                        |
| --------------------- | ------- | -------------------------- |
| `0041-vo-natural.m4a` | 23.19 s | the unhurried read         |
| `0041-vo-tight.m4a`   | 19.32 s | 1.18x faster, shorter gaps |

Voice is **seed_audio preset "Desmond"**, the same calm male used for 0036 —
measured as one of only two presets with a low median pitch and a narrow range.

## Neither version fits the original 15.8 s

The generated read is simply slower than the supplied clip. Matching 15.8 s
exactly needs about **1.3x**, which sounds rushed and works against a script
whose subject is patience.

That is not really a problem, because the source is 360x360 with four spelling
and grammar errors on screen — it wants rebuilding anyway, and a rebuild re-times
around whichever audio is chosen.

## What was verified, and what could not be

Every line was transcribed back. **Two needed work:**

- **Line 4 said "Alar" for "Allah".** A plain re-roll fixed it — now clean. Kept.
- **Line 2, "Sabr", is unresolved.** Three takes, three different readings:

  | prompt spelling | whisper heard |
  | --------------- | ------------- |
  | `Sabr`          | "sabre"       |
  | `sabbr`         | "Sabah"       |
  | `SAH-br`        | "Sabra"       |

  **I cannot settle this one.** Whisper's spelling is a proxy for a sound, and it
  disagrees with itself across three attempts. The delivered mix uses the plain
  `Sabr` take; the other two are kept at `work/vo/02-alt-sabbr.wav` and
  `02-alt-sahbr.wav`.

  **This needs an ear before it ships.** Sabr mispronounced as the English sword
  "sabre" is exactly the error a page teaching Arabic would be judged for. If none
  of the three is right, the honest fix is the one that worked for the
  recitations: **have Abdul Baset Nadim say the four lines.** It is free, correct,
  and it is a teacher's voice rather than a synthetic one.

## Cost

**~2.8 credits** — seven generations at 0.4 each: four lines, two extra attempts
at Sabr, one re-roll of line 4. Everything after that was local.
