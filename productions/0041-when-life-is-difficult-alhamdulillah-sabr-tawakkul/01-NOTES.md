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

## Captioned to-camera cut (2026-08-23)

`OUTPUT/0041-when-life-is-difficult-captioned-9x16.mp4` — 720x1280, 10.005 s,
**zero credits**. Source `source/man-speaking-to-camera.mp4`, used for both
picture and sound; the audio stream is copied untouched.

**No watermark and no end card**, as instructed. Nothing on the frame but the
captions.

### It only covers three of the four lines

The clip ends on "we keep Tawakkul in Allah." **"Because the believer knows that
whatever Allah chooses is always best for him" is not in it** — a 10 s cap, and
the closing line is the payoff of the whole script. Either a second clip is
needed, or the piece ends a beat early.

### The captions correct the spelling the other version got wrong

Timing comes from whisper word starts; **the words are authored**, so this cut
spells them properly:

| the 360x360 version had | this cut says |
| ----------------------- | ------------- |
| ALHAMDULLILAH           | Alhamdulillah |
| TAWAKUL                 | Tawakkul      |

Eight phrase chunks rather than four long lines, so each sits for about a second
and a viewer reads at the pace he speaks.

### Two adjustments, both from looking

- **Gold read as weak over a white thobe.** The gold is the translation colour
  from the ayah layout, where it sits under Arabic as the secondary line. Alone
  over a bright subject it lacks contrast. Switched to cream, and
  `rendercards.mjs` now takes `CARD_EN_COLOR` so it is a choice rather than a
  constant.
- **The first caption sat on the UI line.** Raised from 250 to 300 px.

Both were visible only by putting a marked frame next to the picture.

## Credit (2026-08-23)

**Ustadh Abdul Baset Nadim**, one of Riwaq's own teachers — the same teacher who
recited 0039 and 0040. Added to all three caption blocks.

**Worded as "spoken by", not "featuring", on purpose.** The footage looks
generated, so the face on screen is very likely not his. A bare name under a
video of a man reads as "this is him". "Spoken by" credits what he actually did
and protects him from being visually misidentified.

If the face is in fact his, the wording can be strengthened — that would improve
the post, not weaken it.

Whether the voice matches 0039 and 0040 could not be settled by measurement:
his recitation sits at a median 290.9 Hz and this clip speaks at 128.0 Hz, but
reciters sit far above their speaking pitch, so the gap is normal for one person
and proves nothing either way. Recorded on the user's word, which is the right
source for it.

Recorded in the registry under `credits` with the same caveat, so the distinction
between a voice credit and an appearance survives.
