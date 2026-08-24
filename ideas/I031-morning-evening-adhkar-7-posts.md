# I031 — Morning & Evening Adhkar — 7 posts

Series: G — Dhikr Series
Status: proposed — nothing built, nothing spent
Audience: Muslim parents and families
Format: **7 image posts, 1080x1350 (4:5)**, one a day for a week
Style: not yet named — you name it, it is never guessed

**Supplied fully written by the user 2026-08-24.** The complete source, with all
seven captions, Arabic, transliteration, translation, timing and gradings, is
kept verbatim at
[I031-morning-evening-adhkar-SOURCE.md](I031-morning-evening-adhkar-SOURCE.md).
This file is the assessment, not a rewrite.

## Hook

> Seven days. Seven adhkar. The ones the Prophet ﷺ said every morning and every evening.

## The seven

| day | dhikr                             | when                           |
| --- | --------------------------------- | ------------------------------ |
| 1   | Subḥānallāhi wa biḥamdih          | 100x morning, 100x evening     |
| 2   | Raḍītu billāhi Rabban             | morning and evening            |
| 3   | Bismillāhilladhī lā yaḍurru       | 3x morning, 3x evening         |
| 4   | Aʿūdhu bi kalimātillāhit-tāmmāt   | 3x evening                     |
| 5   | Allāhumma bika aṣbaḥnā            | morning and evening, two forms |
| 6   | Allāhumma mā aṣbaḥa bī min niʿmah | morning, evening form reported |
| 7   | Sayyid al-Istighfār               | morning and evening            |

## Why this should convert

- **It is a series, and a series is what earns a follow.** Seven days with a
  visible counter gives a reason to come back tomorrow — the mechanism I001 was
  built around and the one thing single posts cannot do.
- **Saves, not just likes.** Every post is something a parent will want again
  tomorrow morning. Saves weigh heavily on Instagram, and adhkar are among the
  most saved content in this niche.
- **It is the category that is already winning.** Short Islamic reminders hold
  the top three places in the library at 117 to 185 reactions per day per
  platform, against 12 to 43 for everything else. See
  [ENGAGEMENT-SO-FAR.md](../library/ENGAGEMENT-SO-FAR.md).
- **The copy is already written and sourced.** Most of the cost of a series is
  the writing, and it is done.

## What it would cost

**Potentially nothing.** Seven 4:5 cards are Arabic and English type over a
background. The library already holds textless 4K illustrations, and
`/riwaq-ayah-overlay`'s `rendercards.mjs` renders Arabic properly through a
browser.

If new artwork is wanted instead, `/riwaq-image-post` is about 4 credits a post,
so **~28 credits for the set**.

## Risks and honest limits

- **Every post carries Arabic, harakat included, and a hadith source. This needs
  a scholarly read before production, not after.** The source document says so
  itself: "conduct a final human review of Arabic, transliteration, translation,
  repetition count, context, and source." That instruction is the gate.
- **Do not let any image model near the Arabic.** The source document already
  says this, and it is right for a reason we have measured: models invent
  pseudo-Arabic on Islamic settings, and Pillow silently drops every harakat on
  this machine. Arabic goes through the browser renderer, always.
- **Repetition counts are claims.** "100 times", "3 times" — these are part of
  the narration and must survive the review unchanged.
- **Seven posts is seven days of one thing.** It will crowd out everything else
  that week. Worth deciding whether that is the plan or a problem.
- **The captions as written use markdown bold.** They must be flattened to plain
  text before posting — the platforms print asterisks literally.

## Before production

- You approve the idea.
- **A qualified teacher signs off all seven** — Arabic, transliteration,
  translation, counts, and sources.
- You name the finishing style.
- Decide: existing library backgrounds at zero credits, or new artwork at ~28.
