# Production Styles

A **style** is the complete finishing treatment applied on top of generated
footage: how text is set, how the video closes, what the watermark does, what
the audio bed is, and how it is paced.

Two rules:

1. **You name the style in the request.** I do not choose it.
2. **If a request does not name one, I ask before producing.** Never assumed.

Recorded per production as `style` in `productions/registry.json`, so visitor
ratings can be compared across styles.

Every style shares the non-negotiables: text rendered locally with Pillow (never
AI-generated), Arabic with harakat stripped, official logo only, recitation
whisper-verified, all veo clip audio discarded.

---

## Style 1 — Cinematic Reverent

Long-form narration piece. The most expensive to produce.

| Element        | Treatment                                                                             |
| -------------- | ------------------------------------------------------------------------------------- |
| On-screen text | Georgia Italic cream setup line + Georgia Bold Italic gold emphasis line, upper third |
| Scrims         | Emerald gradient top and bottom so text survives bright footage                       |
| Subtitles      | Arabic calligraphy cards at each beat: gold Arabic, cream transliteration             |
| Audio          | Continuous TTS narration forward, Apple-DLS piano bed at ~45%, ambience under         |
| Watermark      | Gold wordmark, position rotates per scene, never over faces or text                   |
| Ending         | Emerald brand end card: logo, dua, tagline, free-trial URL, ~5s                       |
| Pacing         | Slow. 5–8s beats, fades between                                                       |
| Length         | 45–65s                                                                                |

**Used by:** 0006 Dream of Every Parent · 0014 Most Beautiful Sound ·
0022 Lā ḥawla

---

## Style 2 — Quiet Observational

No narration. Lets the scene speak. Cheapest of the video styles.

| Element        | Treatment                                                                                |
| -------------- | ---------------------------------------------------------------------------------------- |
| On-screen text | Two cards only — one opening line, one closing line + brand line                         |
| Scrims         | Light, only behind the text                                                              |
| Subtitles      | None                                                                                     |
| Audio          | Real ambience (water, room tone) + soft piano. **No voice at all**                       |
| Watermark      | Fixed position for the whole clip if the footage carries its own text; otherwise rotates |
| Ending         | Closing text card carries the brand line — no separate end card                          |
| Pacing         | Very slow, single continuous action, warm fade out                                       |
| Length         | 10–15s                                                                                   |

**Used by:** 0021 Wudu Together

---

## Style 3 — Dua Teaching

Built to be saved and taught from. Highest save-potential format.

| Element        | Treatment                                                                                |
| -------------- | ---------------------------------------------------------------------------------------- |
| On-screen text | Arabic (large, gold, GeezaPro) + transliteration + English translation, lower third      |
| Scrims         | Strong lower scrim so Arabic reads over any footage                                      |
| Subtitles      | The dua itself is the subtitle, timed to the recitation                                  |
| Audio          | Child or adult recitation of the exact pinned dua text, soft bed under                   |
| Watermark      | Gold wordmark, clear of the subtitle block                                               |
| Ending         | Freeze-frame CTA overlay or emerald calligraphy card with the dua, source reference, URL |
| Pacing         | One or two scenes, unhurried                                                             |
| Length         | 10–20s                                                                                   |

**Used by:** 0008 Little Girl Reciting Dua · 0009 Dua Before Learning ·
0010 Allah Is Sufficient · 0016 Rabbi Irhamhuma

---

## Style 4 — Animated Nasheed

Supplied animated footage that already carries its own baked-in text and song.
Finishing only — nothing generated.

| Element        | Treatment                                                                  |
| -------------- | -------------------------------------------------------------------------- |
| On-screen text | None added; the source clip has its own                                    |
| Audio          | Source audio untouched (`-c:a copy`)                                       |
| Watermark      | Gold wordmark. **Fixed** to the opposite region from the source's own text |
| Ending         | None added — source ends itself                                            |
| Pacing         | As supplied                                                                |
| Length         | 10s                                                                        |

**Used by:** 0017 Children Learning Arabic · 0018 Wake Up and Thank Allah ·
0019 Bismillah Before We Eat · 0020 Thank You, Allah verses

**Best-performing style so far** — 5/5 visitor engagement on 0016–0019.

---

## Style 5 — Image Post

Static feed post, full-bleed.

| Element        | Treatment                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------- |
| Canvas         | Photo fills the frame. **Not** an editorial card — that layout was rejected                 |
| On-screen text | Hook top: cream Georgia Italic setup + gold Georgia Bold Italic emphasis                    |
| Scrims         | Emerald gradient top and bottom                                                             |
| CTA            | Single gold line near the bottom                                                            |
| Watermark      | Small logo mark, bottom-left, ~68px at 72% alpha. **Not** a large top-centre logo           |
| Ratios         | 4:5 Instagram · 16:9 Facebook · 2:3 Pinterest · 9:16 Stories, all from one 4K square master |

**Used by:** 0007 Legacy Post · 0011–0013 FB Series · 0015 Islamic Moments

**Weakest engagement so far** — 2/5 on 0015.

---

## Style 7 — Photoreal Sing-Along

Children's rhyme for ages 3–8. Teaching content, high energy, built to be
rewatched. Bridges Style 1's polish with a format small children will sit
through.

| Element        | Treatment                                                                                                                                                                                                                                     |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cast           | Recurring photoreal children, identity-pinned from a reference still. Johra is the established lead                                                                                                                                           |
| Setting        | Bright Islamic classroom, morning light. **No readable Arabic on set dressing** — AI garbles it; posters must be geometric patterns and stars only                                                                                            |
| On-screen text | Flashcard: big emerald Arabic letter on a **cream rounded panel** with a gold border, name beneath, the letter's dot count drawn as actual gold dots, and the rhyme's line on a gold pill under the card. All Pillow-rendered, never AI-baked |
| Scrims         | Almost none. Cream panels carry the legibility instead — a dark scrim kills the bright classroom, which is the whole appeal for this audience                                                                                                 |
| Audio          | Spoken rhyme with rhythm, one continuous read, over a cheerful major-key DLS **marimba** melody (`scripts/social/kidsmusic.m`) at ~30%                                                                                                        |
| Watermark      | Gold wordmark, rotates per beat, clear of the letter card                                                                                                                                                                                     |
| Ending         | Emerald brand end card, tagline `Learn · Grow · Love the Qur'an`                                                                                                                                                                              |
| Pacing         | Fast and bouncy. One beat per verse, 8s each, hard cuts not fades. Cards cue off whisper's real speech boundaries                                                                                                                             |
| Length         | 45–60s                                                                                                                                                                                                                                        |

Numbering note: Style 6 is deliberately skipped — it was drafted as the animated
variant of this and not chosen, and styles are never renumbered.

**Used by:** 0024 Alif, Baa, Taa Adventure

## Unstyled

`0001`–`0005` predate this catalogue and are left **unstyled** rather than
guessed at. `0023`–`0025` are requested but not produced — their style is yours
to name.

## Proposing a new style

Say what should differ from an existing style and I will write it up as the next
number, produce against it, and record it so its ratings are comparable. Styles
are additive — an existing style is never edited once productions reference it,
because that would break the comparison.
