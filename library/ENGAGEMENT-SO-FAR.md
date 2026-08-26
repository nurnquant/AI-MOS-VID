# What the numbers say so far

Seven measured productions, 2026-08-26. Regenerate from `productions/registry.json`
— `metrics.reactions` and `metrics.reactions_on`.

## The table

Compared at **the age each count was taken**, per platform. Dividing by
days-since-publishing instead is wrong and gave a badly inflated answer once.

|     | production                           | reactions | age | plats | per day per platform | credits | editor | visitors |
| --- | ------------------------------------ | --------- | --- | ----- | -------------------- | ------- | ------ | -------- |
| 1   | 0043 Day 1 Subḥānallāhi              | **930**   | 1d  | 4     | **232**              | 0       | 4.0    | 4.0      |
| 2   | 0040 Al-Ahzab 35 recitation          | 740       | 1d  | 4     | **185**              | 0       | 4.0    | 4.0      |
| 3   | 0039 Al-Asr recitation               | 550       | 1d  | 4     | **138**              | 0       | 4.0    | 4.0      |
| 4   | 0041 Alhamdulillah / Sabr / Tawakkul | 350       | 1d  | 3     | 117                  | 2.8     | 3.5    | 3.5      |
| 5   | 0035 children's rhyme                | 129       | 1d  | 3     | 43                   | 240     | 4      | —        |
| 6   | 0036 parent-facing to camera         | 69        | 2d  | 3     | 12                   | 125.5   | 4.5    | —        |

## The pattern is now hard to argue with

- **reach vs credits spent: r = -0.77**
- **reach vs the editor's own rating: r = -0.40**

Free pieces average **168** reactions per day per platform. Paid pieces average
**27**. **Six times**, in the wrong direction from what spending is meant to buy.

The top four are all short Islamic reminders — three Qur'an or dhikr recitations
and one spoken piece. The bottom two are a children's rhyme and a parent-facing
talking head. **Category is doing the work, not budget and not craft.**

## The uncomfortable finding, now with more evidence

**0043 went out with a known error in its burned Arabic** — سبحاني where it must
read سبحان الله — and returned **the best number in the library**.

The honest reading: **reactions do not detect correctness.** A reaction costs a
viewer nothing and means "this looked right in my feed". It is not a review.

So the calligraphy is still worth fixing, and the reason is not the metric. It is
that an academy teaching Arabic has one asset — being trusted on Arabic — and no
amount of reach replaces it. **This table is an argument for what to make more
of. It is not an argument about what is acceptable to ship.**

## Aspect ratio costs about 10x, and that is now measured

0042 is the same category as the top four — a short dhikr reminder — on the same
four platforms, at the same zero cost. **The one thing that differs is that it is
16:9 landscape.**

| production | per day per platform | shape              |
| ---------- | -------------------- | ------------------ |
| 0043       | 232                  | 9:16               |
| 0040       | 185                  | 9:16               |
| 0039       | 138                  | 9:16               |
| 0041       | 117                  | 9:16               |
| **0042**   | **18**               | **16:9 landscape** |

Vertical mean **168** against **18**. **Nine to ten times.** Even the weakest
vertical piece is **6.7x** the landscape one.

**The bias runs against the landscape piece being flattered**, not for it: 0042
was counted at two days and the rest at one, and reach front-loads, so a two-day
average is normally the lower figure. The real gap is if anything slightly
smaller than it looks — not larger.

**Two caveats worth keeping.** 0042 is also the only `ai-only` piece, so format
and provenance are confounded in this single comparison. And its imagery drew a
flag before publishing — a robed figure on a white horse — which may have
suppressed sharing on its own. Format is the most plausible driver because the
mechanism is known: Reels and TikTok are vertical surfaces, and a 16:9 video is
letterboxed into a strip.

**Practical consequence: vertical is not a preference, it is roughly a 10x
multiplier.** Supplied landscape footage should be reframed before publishing, or
not published to Reels and TikTok at all.

## What is still not known

- **Reactions are not followers.** Nothing here answers whether any of it grows
  the account, which is the question 0036 was built for.
- **Day one is not a week.** Every count except 0036 is a day-one figure.
- Five image posts from 0028-0032 were never counted.
- **Format and provenance are still confounded** in the 0042 result. A second
  landscape piece that is not `ai-only`, or an `ai-only` piece that is vertical,
  would separate them.

## What follows, if it holds

Short Islamic reminders built from things already owned are the highest return
per credit by a wide margin, and `/riwaq-audio-montage` with
`/riwaq-ayah-overlay` is the pipeline that makes them.

**The obvious next move is the remaining six days of the dhikr series**, which
are already written, already carded, and cost nothing.

**The cheapest quality lever is still better source audio** — a clean re-record
from Ustadh Abdul Baset Nadim, since both recitation pieces came from a 41 kbps
messaging-app encode.
