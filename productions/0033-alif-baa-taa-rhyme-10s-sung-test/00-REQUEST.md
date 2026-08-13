# Alif, Baa, Taa — Come Learn With Me! (10s sung test)

_Video · CoComelon-style children's rhyme · **TEST**, not a series deliverable_

## Why this exists

0024 tried this concept and was **rejected**: it answered a sung-rhyme brief with a
_spoken_ read over photoreal footage. Wrong genre.

The blocker has always been that nothing in this workspace can generate singing —
every audio model here is text-to-speech. **But veo generates its own audio, and it
can sing.** That has never been tested.

So this is a **10-second, 26-credit test of exactly one question: will veo sing a
pinned lyric, in tune, in time, in a child's voice?**

No spoken TTS. If veo comes back speaking instead of singing, or the melody is
unusable, the test has failed and we report that rather than shipping a spoken
substitute.

## Deliberate inversion of the usual audio rule

Every other production here pins **"ABSOLUTELY NO MUSIC"** and discards veo's audio,
because veo adds unwanted music beds. **This one does the opposite**: veo's audio is
the entire point and must be kept. The prompt asks for singing and a simple melody.

## Script — 10 seconds total

| Beat | Time     | Content                                     | Audio                        |
| ---- | -------- | ------------------------------------------- | ---------------------------- |
| 1    | 0.0–8.0  | Johra sings the rhyme, clapping on the beat | **veo-sung vocal + melody**  |
| tag  | 8.0–10.0 | brand tag card                              | last note rings out under it |

### The rhyme (fits 8 seconds at CoComelon tempo)

Two lines, 4/4, two bars each, ~120 bpm. Deliberately repetitive — the letters land
on the strong beats so a child can clap and join in.

> **Alif, Baa, Taa — come learn with me!**
> **Alif, Baa, Taa — as easy as can be!**

Rhythm, letters on beats 1, 2 and 3 of each bar:

```
|  A-lif   Baa    Taa    -   | come learn with  me!    -   |
|  A-lif   Baa    Taa    -   | as ea-sy as can  be!    -   |
```

Pronunciation is pinned and non-negotiable: **"Alif"** (not "Aleph", not "Aleaf"),
**"Baa"**, **"Taa"**. 0024 failed a voice audition on exactly this.

## Character — the recurring rhyme-series lead

Written down so every future clip can reuse it verbatim. A master still is generated
first and becomes the reference image for all later clips.

**Johra (animated)** — a cheerful Muslim girl, age 5. Round soft face, large warm
brown eyes, rosy cheeks, small friendly smile. **Soft cream headscarf** framing the
face. **Emerald-green dress with gold trim at the cuffs and hem.** Premium preschool
3D-animation look: soft rounded forms, smooth surfaces, no outlines.

**Setting:** a bright, simple playroom — pale cream walls, warm daylight, a few
soft-toy and cushion shapes far out of focus. Uncluttered, so nothing competes with
her.

## Visual to animate

One master still: Johra centred, standing, mid-clap, mouth open mid-word, facing
camera. Generous clear wall above her head, clear floor at the lower-left. That still
becomes the veo `start_image`, which is what holds the character stable.

## Verification plan

1. **Whisper the clip audio** — are the words exactly "Alif, Baa, Taa"? Is "Alif"
   pronounced correctly?
2. **Is it actually SUNG?** Measure pitch movement across the vocal. Speech sits in a
   narrow band; singing steps between held pitches. Report the measurement, and say
   plainly if it came back spoken.
3. **Frame-check** the mouth is moving on the beats and the character matches the
   master still.
4. **Rhythm check** — do the letter words land on a steady pulse, or is the timing
   uneven?

## Constraints

- No text generated in the image or video; any text is composited locally.
- No depiction of Allah.
- Character must match the master still — pass it as `start_image`.
- **Style deliberately left unassigned.** If this works it becomes a new numbered
  style, and the user names it. Style 7 is retired/rejected and must not be reused.
