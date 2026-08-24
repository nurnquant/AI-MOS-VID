# What the numbers say so far

Five measured productions, 2026-08-24. Small, and the direction is consistent
enough to plan around. Regenerate the table from
`productions/registry.json` — `metrics.reactions` and `metrics.reactions_on`.

## The table

Compared at **the age each count was taken**, per platform. Dividing by
days-since-publishing instead is wrong and gave a badly inflated answer once.

|     | production                           | reactions | age | plats | per day per platform | credits | editor | visitors |
| --- | ------------------------------------ | --------- | --- | ----- | -------------------- | ------- | ------ | -------- |
| 1   | 0040 Al-Ahzab 35 recitation          | 740       | 1d  | 4     | **185**              | 0       | 4.0    | 4.0      |
| 2   | 0039 Al-Asr recitation               | 550       | 1d  | 4     | **138**              | 0       | 4.0    | 4.0      |
| 3   | 0041 Alhamdulillah / Sabr / Tawakkul | 350       | 1d  | 3     | **117**              | 2.8     | 3.5    | 3.5      |
| 4   | 0035 children's rhyme                | 129       | 1d  | 3     | 43                   | 240     | 4      | —        |
| 5   | 0036 parent-facing to camera         | 69        | 2d  | 3     | 12                   | 125.5   | 4.5    | —        |

## Two correlations, both negative

- **reach vs credits spent: r = -0.80**
- **reach vs the editor's own rating: r = -0.53**

Free pieces average **146** reactions per day per platform. Paid pieces average
**27**. That is more than five times, in the wrong direction from what spending
is supposed to buy.

**Five data points is not proof.** It is enough to stop assuming the opposite,
which is what a production budget quietly assumes.

## What is actually driving it

The top three are all short Islamic reminders — two Qur'an recitations and one
spoken piece on Alhamdulillah, Sabr and Tawakkul. The bottom two are a children's
rhyme and a parent-facing talking head.

That is a **category** difference, not a craft difference. Recitation and short
reminders reach a very large audience that is not choosing between us and another
parenting page. The rhyme and the parent-facing piece compete in crowded niches.

**It is not that the expensive productions are bad.** 0036 is the highest-rated
thing in the library at 4.5 and reached the fewest people. Cost and reach are
being driven by different things, and only one of them is under our control.

## The uncomfortable one

**The editor's rating is anti-correlated with reach.** The lowest-rated piece
(0041, 3.5) outperformed both paid productions by three to ten times. The
highest-rated (0036, 4.5) came last.

Two honest readings, and they are not exclusive:

1. Craft judgement and audience appetite are simply different things, and there
   is no reason they should agree.
2. The pieces that took most effort are the ones whose flaws are most visible to
   the person who made them.

Either way, **do not use the editor rating to decide what to make more of.**

## What this does NOT say

- **Reactions are not followers.** 0036 was built specifically to test whether
  parent-facing content earns follows, and no reaction count answers that. Until
  the follower number is looked at, the parent-facing lane is unproven rather
  than disproven.
- **Day one is not a week.** Every count except 0036 is a day-one figure.
  Re-measuring at day seven could reorder this table.
- **Three platforms is not four.** 0039 and 0040 ran on four.

## What follows from it, if it holds

Short Islamic reminders built from things already owned — supplied recitation,
existing stills, local ffmpeg — are the highest return per credit by a wide
margin. `/riwaq-audio-montage` and `/riwaq-ayah-overlay` are the pipeline.

**The cheapest lever left is better source audio.** Both recitation pieces were
made from a 41 kbps messaging-app encode. A clean re-record from Ustadh Abdul
Baset Nadim costs nothing and improves the best-performing format in the library.
